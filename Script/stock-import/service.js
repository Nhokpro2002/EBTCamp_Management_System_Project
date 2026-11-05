import * as inventoryApi from "../services/inventory.api.js";

import * as excel from "./excel.js";

import { importState as state } from "./state.js";
import { MAX_EXCEL_LABELS } from "./messages.js";

// Hàm dùng chung cho trang
export {
    normalizeCode,
    parseQuantity,
    buildLabelText,
    getLastLabelSerial
} from "../services/inventory.api.js";
export { isExcelLibraryReady, createTemplateBlob as createExcelTemplate } from "./excel.js";

// =====================================================
// LOAD
// =====================================================
export async function loadMaterials() {
    state.items = await inventoryApi.loadAllItems();
    return state.items;
}

export function getMaterials() {
    return state.items;
}

// =====================================================
// TEM QR = NHẬP KHO (in lẻ theo 1 mã)
// =====================================================

/**
 * Vật tư để xem trước tem (null nếu mã chưa có trong kho).
 */
export async function findPreviewItem(code) {
    state.previewItem = await inventoryApi.findItemByCode(code);
    state.missingCode = state.previewItem ? "" : code;
    return state.previewItem;
}

/**
 * In tem = nhập kho: cấp số tem + cộng `count` vào stock (ghi cùng một lần),
 * rồi giữ vật tư mới nhất để xem trước lượt in kế tiếp.
 * @returns {Promise<{ item: Object, labels: string[] }>}
 */
export async function printLabelsAndAddStock(code, count) {
    const result = await inventoryApi.reserveLabelSerials(code, count, { addToStock: true });
    state.previewItem = result.item;
    replaceCachedItem(result.item);
    return result;
}

// =====================================================
// TẠO VẬT TƯ MỚI (mã chưa có trong kho)
// =====================================================
export async function createMaterial(formData) {
    const item = await inventoryApi.createItem(formData);
    state.items.push(item);
    // Tạo xong → xem trước tem của vật tư này luôn để in
    state.previewItem = item;
    state.missingCode = "";
    return item;
}

// =====================================================
// NHẬP KHO + IN TEM TỪ EXCEL
//   Tên sản phẩm → name, QCode/XCode → code, Mô tả → description
//   Số tem (= số lượng cộng vào stock và auto_increment_id):
//     - có Đơn vị đóng gói  → Số lượng / Đơn vị đóng gói (làm tròn lên: gói cuối lẻ vẫn 1 tem)
//     - không có            → Số lượng (tính theo chiếc)
//   Mã chưa có trong kho → tạo mới (stock 0, auto_increment_id 0) rồi mới cộng.
//   Thứ tự xử lý + thứ tự tem in = thứ tự dòng trong file.
// =====================================================

/**
 * Số trong ô Excel: 100 | "100" | "1.000" | "1,000" | "2,5" → number; ô trống → null; sai → NaN.
 */
function parseExcelNumber(text) {
    const value = String(text ?? "").replace(/\s/g, "");
    if (!value) return null;
    if (/^\d{1,3}([.,]\d{3})+$/.test(value)) return Number(value.replace(/[.,]/g, ""));
    return Number(value.replace(",", "."));
}

const isPositive = number => Number.isFinite(number) && number > 0;

/**
 * Kiểm tra 1 dòng + tính số tem.
 * @returns {{ error: string } | { quantity: number, packSize: number|null, labelCount: number, remainder: number }}
 */
function calculateRow(row) {
    if (!row.name) return { error: "Thiếu tên sản phẩm" };
    if (!row.code) return { error: "Thiếu QCode/XCode" };

    const quantity = parseExcelNumber(row.quantity);
    if (quantity === null) return { error: "Thiếu số lượng" };
    if (!isPositive(quantity)) return { error: "Số lượng không hợp lệ" };

    const packSize = parseExcelNumber(row.packSize);
    if (packSize === null) {
        return Number.isInteger(quantity)
            ? { quantity, packSize: null, labelCount: quantity, remainder: 0 }
            : { error: "Số lượng chiếc phải là số nguyên" };
    }
    if (!isPositive(packSize)) return { error: "Đơn vị đóng gói không hợp lệ" };

    const labelCount = Math.ceil(quantity / packSize);
    // Gói cuối không đủ (VD 105 / 10 → 11 gói, gói cuối 5 chiếc)
    const remainder = Number((quantity - (labelCount - 1) * packSize).toFixed(6));
    return {
        quantity,
        packSize,
        labelCount,
        remainder: remainder === packSize ? 0 : remainder
    };
}

// Mã giống nhau nếu chỉ khác khoảng trắng hai đầu / chữ hoa-thường
function codeKey(code) {
    return String(code ?? "").trim().toUpperCase();
}

/**
 * Đọc file và phân loại từng dòng (giữ thứ tự trong file):
 *   ready   → sẽ nhập kho + in tem (action "create": mã mới, "update": mã đã có)
 *   invalid → thiếu / sai dữ liệu, bỏ qua
 * Mã lặp lại trong file: các dòng sau cộng tiếp vào cùng vật tư, số tem nối tiếp.
 * Tải lại danh sách vật tư trước khi so sánh để dùng dữ liệu mới nhất.
 */
export async function readExcelImport(file) {
    const [sheet] = await Promise.all([
        excel.readStockSheet(file),
        loadMaterials()
    ]);

    const itemsByKey = new Map(state.items.map(item => [codeKey(item.code), item]));
    // key → code thật sẽ ghi xuống DB (mã đã có: dùng đúng code trong DB; mã mới: code của dòng đầu tiên)
    const resolvedCodes = new Map();

    const rows = sheet.rows.map(row => {
        const name = row.name.trim();
        const code = row.code.trim();
        const description = row.description.trim();
        const result = calculateRow({ ...row, name, code });
        const base = { ...row, name, code, description };

        if (result.error) return { ...base, status: "invalid", error: result.error };

        const key = codeKey(code);
        const existing = itemsByKey.get(key);
        const isRepeated = resolvedCodes.has(key);
        if (!isRepeated) resolvedCodes.set(key, existing?.code ?? code);

        return {
            ...base,
            ...result,
            targetCode: resolvedCodes.get(key),
            currentStock: existing ? Number(existing.stock) || 0 : 0,
            action: existing || isRepeated ? "update" : "create",
            isRepeated,
            status: "ready"
        };
    });

    state.excelImport = { ...sheet, fileName: file.name, rows };
    return state.excelImport;
}

export function getExcelImport() {
    return state.excelImport;
}

export function clearExcelImport() {
    state.excelImport = null;
}

export function getReadyRows() {
    return (state.excelImport?.rows ?? []).filter(row => row.status === "ready");
}

/**
 * Tổng hợp để hiển thị + kiểm tra trước khi in.
 */
export function getExcelTotals() {
    const rows = state.excelImport?.rows ?? [];
    const ready = rows.filter(row => row.status === "ready");
    const labelCount = ready.reduce((sum, row) => sum + row.labelCount, 0);
    return {
        total: rows.length,
        ready: ready.length,
        create: ready.filter(row => row.action === "create").length,
        update: ready.filter(row => row.action === "update").length,
        invalid: rows.filter(row => row.status === "invalid").length,
        done: rows.filter(row => row.status === "done").length,
        failed: rows.filter(row => row.status === "failed").length,
        printed: rows.reduce((sum, row) => sum + (row.labels?.length ?? 0), 0),
        labelCount,
        tooManyLabels: labelCount > MAX_EXCEL_LABELS
    };
}

/**
 * Nhập kho lần lượt từng dòng "ready" theo thứ tự file (dòng lỗi không chặn các dòng khác):
 *   1. Mã chưa có → tạo vật tư (stock 0, auto_increment_id 0)
 *   2. Cấp số tem + cộng stock + cập nhật name/description — cùng một lần ghi
 * @param {(done: number, total: number) => void} onProgress
 * @returns {Promise<{ labels: string[], doneRows: Object[], errors: string[] }>}
 *   labels: toàn bộ tem cần in, đúng thứ tự dòng Excel, trong mỗi dòng số tăng dần
 */
export async function importExcelAndReserveLabels(onProgress = () => {}) {
    const rows = getReadyRows();
    const labels = [];
    const doneRows = [];
    const errors = [];

    for (const [index, row] of rows.entries()) {
        try {
            const existing = await inventoryApi.findItemByCode(row.targetCode);
            if (!existing) {
                const created = await inventoryApi.createItem({
                    name: row.name,
                    code: row.targetCode,
                    description: row.description,
                    stock: 0,
                    auto_increment_id: 0
                });
                state.items.push(created);
            }

            const fields = { name: row.name };
            if (row.description) fields.description = row.description;   // ô trống → giữ mô tả cũ

            const result = await inventoryApi.reserveLabelSerials(row.targetCode, row.labelCount, {
                addToStock: true,
                fields
            });
            replaceCachedItem(result.item);

            Object.assign(row, {
                status: "done",
                labels: result.labels,
                stockAfter: result.item.stock,
                item: result.item
            });
            labels.push(...result.labels);
            doneRows.push(row);
        } catch (error) {
            console.error(error);
            row.status = "failed";
            row.error = error.message;
            errors.push(`Dòng ${row.rowNumber} (${row.code}): ${error.message}`);
        }
        onProgress(index + 1, rows.length);
    }

    return { labels, doneRows, errors };
}

function replaceCachedItem(item) {
    const index = state.items.findIndex(cached => cached.id === item.id);
    if (index >= 0) state.items[index] = item;
    else state.items.push(item);
}
