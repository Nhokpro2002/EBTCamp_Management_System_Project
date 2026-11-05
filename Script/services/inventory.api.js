import * as api from "./generic.api.js";
import { URL_LOCAL } from "../config.js";

// =====================================================
// VẬT TƯ (Inventory_Items) — dùng chung cho Lưu kho / Nhập kho / Xuất kho
// Nội dung QR trên tem = "<code>-<số thứ tự>", VD: AAAA-51
// (code = XCode/QCode của vật tư, số thứ tự lấy từ field auto_increment_id)
// =====================================================

export const COLLECTION_INVENTORY_ITEMS = "Inventory_Items";
const PAGE_SIZE = 200;

// =====================================================
// HELPERS
// =====================================================
export function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

export function getItemImageUrl(item) {
    return item?.image
        ? `${URL_LOCAL}/api/files/${COLLECTION_INVENTORY_ITEMS}/${item.id}/${item.image}`
        : "";
}

/**
 * Chuẩn hóa nội dung quét được (máy quét có thể gửi kèm khoảng trắng / xuống dòng).
 */
export function normalizeCode(value) {
    return String(value ?? "").trim();
}

/**
 * Tách nội dung QR thành mã vật tư + số thứ tự tem.
 * "AAAA-51" → { code: "AAAA", serial: 51 }.
 * Chỉ tách ở dấu "-" CUỐI CÙNG có số phía sau, nên code có sẵn dấu "-" (VD "AB-12X") vẫn đúng.
 * Tem cũ chỉ có mã (không có "-số") → serial = null.
 * @returns {{ code: string, serial: number|null, label: string }}
 */
export function parseScannedCode(value) {
    const label = normalizeCode(value);
    const match = label.match(/^(.+)-(\d+)$/);
    return match
        ? { code: match[1].trim(), serial: Number(match[2]), label }
        : { code: label, serial: null, label };
}

export function buildLabelText(code, serial) {
    return `${code}-${serial}`;
}

/**
 * Số tem đã cấp cho vật tư (field auto_increment_id, chưa có = 0).
 */
export function getLastLabelSerial(item) {
    return Number(item?.auto_increment_id) || 0;
}

export function parseQuantity(value) {
    const quantity = Number(value);
    return Number.isInteger(quantity) && quantity > 0 ? quantity : null;
}

// =====================================================
// ĐỌC DỮ LIỆU
// =====================================================

/**
 * Toàn bộ vật tư (tất cả các trang của PocketBase).
 */
export async function loadAllItems() {
    const firstPage = await api.loadInventoryItemEachPage(COLLECTION_INVENTORY_ITEMS, 1, PAGE_SIZE);
    const remainingPages = await Promise.all(
        Array.from(
            { length: Math.max(0, firstPage.totalPages - 1) },
            (_, index) => api.loadInventoryItemEachPage(COLLECTION_INVENTORY_ITEMS, index + 2, PAGE_SIZE)
        )
    );
    return [
        ...firstPage.items,
        ...remainingPages.flatMap(page => page.items)
    ];
}

/**
 * Tất cả vật tư có đúng code này.
 * @returns {Promise<Object[]>}
 */
export function findItemsByCode(code) {
    return api.getRecordsByFilter(
        COLLECTION_INVENTORY_ITEMS,
        `code = ${api.quoteFilterValue(code)}`
    );
}

/**
 * Vật tư theo code (bản ghi đầu tiên).
 * @returns {Promise<Object|null>}
 */
export async function findItemByCode(code) {
    const items = await api.getRecordsByFilter(
        COLLECTION_INVENTORY_ITEMS,
        `code = ${api.quoteFilterValue(code)}`,
        1,
        1
    );
    return items[0] ?? null;
}

// =====================================================
// GHI DỮ LIỆU
// =====================================================

export function createItem(formData) {
    return api.createRecord(COLLECTION_INVENTORY_ITEMS, formData);
}

export function deleteItem(id) {
    return api.deleteRecord(COLLECTION_INVENTORY_ITEMS, id);
}

/**
 * Cộng (delta > 0) hoặc trừ (delta < 0) tồn kho.
 * Đọc lại stock mới nhất từ database ngay trước khi ghi để hạn chế sai lệch.
 * @returns {Promise<Object>} record sau khi cập nhật
 */
export async function changeStock(itemID, delta) {
    const [latest] = await api.getRecordsByFilter(
        COLLECTION_INVENTORY_ITEMS,
        `id = ${api.quoteFilterValue(itemID)}`,
        1,
        1
    );
    if (!latest) {
        throw new Error("Không tìm thấy vật tư");
    }

    const nextStock = (Number(latest.stock) || 0) + delta;
    if (nextStock < 0) {
        throw new Error(`Không đủ hàng cho ${latest.name} (đang tồn: ${latest.stock})`);
    }

    return api.updateRecord(COLLECTION_INVENTORY_ITEMS, itemID, { stock: nextStock });
}

/**
 * Cập nhật kho cho cả danh sách, từng dòng một (dòng lỗi không chặn các dòng khác).
 * @param {Array<{ item: Object, quantity: number }>} list
 * @param {1|-1} direction 1 = cộng, -1 = trừ
 * @returns {Promise<{ savedIDs: string[], errors: string[] }>}
 */
export async function applyStockChanges(list, direction) {
    const savedIDs = [];
    const errors = [];

    for (const { item, quantity } of list) {
        try {
            await changeStock(item.id, direction * quantity);
            savedIDs.push(item.id);
        } catch (error) {
            console.error(error);
            errors.push(`${item.name || item.code}: ${error.message}`);
        }
    }

    return { savedIDs, errors };
}

/**
 * Cấp `count` số tem tiếp theo cho vật tư và lưu lại auto_increment_id.
 * Đọc lại giá trị mới nhất ngay trước khi ghi để hạn chế 2 người in trùng số.
 * VD: đang là 50, count = 50 → tem AAAA-51 … AAAA-100, lưu auto_increment_id = 100.
 *
 * addToStock = true (trang Nhập kho): in bao nhiêu tem thì cộng bấy nhiêu vào stock,
 * ghi CÙNG một lần với số tem (không cần quét tem mới cộng kho).
 * fields: các field khác ghi cùng lúc (trang Nhập kho từ Excel: name, description).
 * @returns {Promise<{ item: Object, labels: string[] }>}
 */
export async function reserveLabelSerials(code, count, { addToStock = false, fields = {} } = {}) {
    const item = await findItemByCode(code);
    if (!item) {
        throw new Error(`Mã "${code}" chưa có trong kho. Hãy tạo vật tư trước khi in tem.`);
    }

    const start = getLastLabelSerial(item) + 1;
    const end = start + count - 1;
    // fields: cập nhật thêm thông tin vật tư (VD name, description từ Excel) trong cùng lần ghi
    const data = { ...fields, auto_increment_id: end };
    if (addToStock) {
        data.stock = (Number(item.stock) || 0) + count;
    }
    const updated = await api.updateRecord(COLLECTION_INVENTORY_ITEMS, item.id, data);

    return {
        item: updated,
        labels: Array.from({ length: count }, (_, index) => buildLabelText(code, start + index))
    };
}
