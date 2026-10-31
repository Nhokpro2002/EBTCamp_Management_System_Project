import * as api from "../services/generic.api.js";
import * as ui from "./ui.js";
import * as utils from "../utils/utils.js";

const COLLECTION_INVENTORY_ITEMS = "Inventory_Items";

import { inventoryItemPageMessage } from "./inventory_items_page_message.js"
import { inventoryVariable } from "./state.js";

export async function changePage(page) {
    if (page < 1 || page > inventoryVariable.totalPages)
        return;
    inventoryVariable.currentInventoryPage = page;
    await loadInventoryItemData("Inventory_Items");
    const start = (inventoryVariable.currentInventoryPage - 1) * inventoryVariable.pageSize;
    const end = start + inventoryVariable.pageSize;
    inventoryVariable.inventoryItemFiltered = inventoryVariable.inventoryItemFull.slice(start, end);
    ui.renderTable(inventoryVariable.inventoryItemFiltered);
}

export async function loadInventoryItemData(collection) {
    try {
        const response = await api.getRecords(collection);
        if (response) {
            inventoryVariable.inventoryItemFull = response;
            return response;
        }

    } catch (error) {
        console.log(error);
    }
}

/**
 * Load lại data từ database và vẽ lại bảng (giữ search/brand filter đang chọn).
 */
export async function reloadInventory() {
    await loadInventoryItemData(COLLECTION_INVENTORY_ITEMS);
    inventoryVariable.totalPages = Math.max(1, Math.ceil(
        inventoryVariable.inventoryItemFull.length / inventoryVariable.pageSize
    ));
    ui.applyFilter();
    ui.renderMaterialCodeOptions(inventoryVariable.inventoryItemFull);
}

/**
 * @returns {Promise<boolean>} true nếu lưu thành công
 */
export async function saveItem(data) {
    try {
        const response = await api.createRecord(COLLECTION_INVENTORY_ITEMS, data);
        if (response) {
            utils.showSuccess(inventoryItemPageMessage.saveSuccess);
            return true;
        }
    } catch (error) {
        console.log(error);
        utils.showError(inventoryItemPageMessage.saveFailed);
    }
    return false;
}

export async function deleteItem(IDList) {
    try {
        for (const id of IDList) {
            await api.deleteRecord(COLLECTION_INVENTORY_ITEMS, id);
        }

        utils.showSuccess(inventoryItemPageMessage.deleteSuccess);
    } catch (error) {
        console.error(error);
        utils.showError(inventoryItemPageMessage.deleteFailed);
    }
}

// =====================================================
// IMPORT / EXPORT (QR code = field `code` của vật tư)
// =====================================================

/**
 * Chuẩn hóa nội dung quét được (máy quét có thể gửi kèm khoảng trắng / xuống dòng).
 */
export function normalizeCode(value) {
    return String(value ?? "").trim();
}

export function parseQuantity(value) {
    const quantity = Number(value);
    return Number.isInteger(quantity) && quantity > 0 ? quantity : null;
}

/**
 * Tìm vật tư trong database theo code.
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
        throw new Error("Material not found");
    }

    const nextStock = (Number(latest.stock) || 0) + delta;
    if (nextStock < 0) {
        throw new Error(`Not enough stock for ${latest.name} (in stock: ${latest.stock})`);
    }

    return api.updateRecord(COLLECTION_INVENTORY_ITEMS, itemID, { stock: nextStock });
}

/**
 * Trừ kho cho toàn bộ danh sách export.
 * @returns {Promise<{ exportedIDs: string[], errors: string[] }>}
 */
export async function exportItems(exportList) {
    const exportedIDs = [];
    const errors = [];

    for (const { item, quantity } of exportList) {
        try {
            await changeStock(item.id, -quantity);
            exportedIDs.push(item.id);
        } catch (error) {
            console.error(error);
            errors.push(error.message);
        }
    }

    return { exportedIDs, errors };
}
