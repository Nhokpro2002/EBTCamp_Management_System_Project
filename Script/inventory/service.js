import * as inventoryApi from "../services/inventory.api.js";
import * as ui from "./ui.js";
import * as utils from "../utils/utils.js";

import { inventoryItemPageMessage } from "./inventory_items_page_message.js"
import { inventoryVariable } from "./state.js";

export { parseScannedCode } from "../services/inventory.api.js";

/**
 * Chuyển trang trên danh sách đang lọc (search / brand / QR).
 */
export function changePage(page) {
    if (page < 1 || page > inventoryVariable.totalPages)
        return;
    inventoryVariable.currentInventoryPage = page;
    ui.renderCurrentPage();
}

/**
 * Load toàn bộ vật tư (tất cả các trang của PocketBase).
 */
export async function loadInventoryItemData() {
    try {
        const items = await inventoryApi.loadAllItems();
        inventoryVariable.inventoryItemFull = items;
        return items;
    } catch (error) {
        console.log(error);
    }
}

/**
 * Load lại data từ database và vẽ lại bảng
 * (giữ nguyên search / brand / QR filter và trang đang xem).
 */
export async function reloadInventory() {
    await loadInventoryItemData();

    if (inventoryVariable.scanItems) {
        try {
            inventoryVariable.scanItems = await inventoryApi.findItemsByCode(inventoryVariable.scanCode);
            ui.renderScanFilter(inventoryVariable.scanCode, inventoryVariable.scanItems.length);
        } catch (error) {
            console.error(error);
        }
    }

    ui.applyFilter(false);
    ui.renderInventoryStats(inventoryVariable.inventoryItemFull);
}

// =====================================================
// SỬA TRỰC TIẾP TRÊN BẢNG (packing_unit, stock)
// =====================================================

const INLINE_FIELDS = {
    packing_unit: {
        parse: value => ({ ok: true, value: value.trim() }),
        success: inventoryItemPageMessage.packingUnitUpdated,
        failed: inventoryItemPageMessage.packingUnitFailed
    },
    stock: {
        // Số nguyên ≥ 0
        parse: value => {
            const text = value.trim();
            const number = Number(text);
            return text !== "" && Number.isInteger(number) && number >= 0
                ? { ok: true, value: number }
                : { ok: false };
        },
        success: inventoryItemPageMessage.stockUpdated,
        failed: inventoryItemPageMessage.stockFailed,
        invalid: inventoryItemPageMessage.stockInvalid
    }
};

/**
 * Kiểm tra + chuẩn hóa giá trị vừa nhập.
 * @returns {{ ok: boolean, value?: any }}
 */
export function parseInlineValue(field, rawValue) {
    const config = INLINE_FIELDS[field];
    return config ? config.parse(String(rawValue ?? "")) : { ok: false };
}

export function getInlineInvalidMessage(field) {
    return INLINE_FIELDS[field]?.invalid || inventoryItemPageMessage.updateFailed;
}

/**
 * Lưu một field của vật tư (sửa trực tiếp trên bảng).
 * Đồng bộ lại bản ghi trong state để lọc / phân trang / thống kê không dùng giá trị cũ.
 * @returns {Promise<{ ok: boolean, value?: any }>} giá trị đã lưu (theo server)
 */
export async function updateItemField(itemID, field, value) {
    const config = INLINE_FIELDS[field];
    if (!config) return { ok: false };

    try {
        const updated = await inventoryApi.updateItem(itemID, { [field]: value });
        const savedValue = updated?.[field] ?? value;

        [inventoryVariable.inventoryItemFull, inventoryVariable.scanItems || []].forEach(list => {
            const item = list.find(entry => entry.id === itemID);
            if (item) item[field] = savedValue;
        });

        if (field === "stock") {
            ui.renderInventoryStats(inventoryVariable.inventoryItemFull);
        }

        utils.showSuccess(config.success);
        return { ok: true, value: savedValue };
    } catch (error) {
        console.error(error);
        utils.showError(config.failed);
        return { ok: false };
    }
}

export async function deleteItem(IDList) {
    try {
        for (const id of IDList) {
            await inventoryApi.deleteItem(id);
        }

        utils.showSuccess(inventoryItemPageMessage.deleteSuccess);
    } catch (error) {
        console.error(error);
        utils.showError(inventoryItemPageMessage.deleteFailed);
    }
}

// =====================================================
// LỌC BẰNG QUÉT QR TRÊN TRANG
// =====================================================

let scanFilterVersion = 0;

/**
 * Lọc bảng theo code vừa quét (tra trực tiếp trong database).
 * @returns {Promise<number>} số vật tư tìm được
 */
export async function applyScanFilter(code) {
    const version = ++scanFilterVersion;

    inventoryVariable.scanCode = code;
    ui.renderScanFilter(code, "loading");

    const items = await inventoryApi.findItemsByCode(code);
    // Đã quét mã khác hoặc đã bỏ lọc trong lúc chờ → bỏ kết quả cũ
    if (version !== scanFilterVersion) {
        return items.length;
    }

    inventoryVariable.scanItems = items;
    ui.renderScanFilter(code, items.length);
    ui.applyFilter();
    return items.length;
}

export function clearScanFilter() {
    scanFilterVersion++;
    inventoryVariable.scanCode = "";
    inventoryVariable.scanItems = null;
    ui.renderScanFilter("");
    ui.applyFilter();
}
