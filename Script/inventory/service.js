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
