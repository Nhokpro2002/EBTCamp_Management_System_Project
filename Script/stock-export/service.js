import * as inventoryApi from "../services/inventory.api.js";

import { exportState as state } from "./state.js";

export { parseScannedCode, parseQuantity } from "../services/inventory.api.js";

// =====================================================
// DANH SÁCH XUẤT
// =====================================================

export function getList() {
    return state.list;
}

export function findRow(itemID) {
    return state.list.find(row => row.item.id === itemID);
}

export function removeRow(itemID) {
    state.list = state.list.filter(row => row.item.id !== itemID);
}

export function clearList() {
    state.list = [];
}

/**
 * Số lượng hợp lệ: số nguyên từ 1 đến tồn kho.
 */
export function isRowValid({ item, quantity }) {
    return Boolean(quantity) && quantity <= (Number(item.stock) || 0);
}

export function isListValid() {
    return state.list.length > 0 && state.list.every(isRowValid);
}

export function getTotalQuantity() {
    return state.list.reduce((sum, row) => sum + (row.quantity || 0), 0);
}

// =====================================================
// QUÉT → THÊM VÀO DANH SÁCH
// =====================================================

/**
 * Mã mới → tra database rồi thêm dòng (SL xuất = 1);
 * mã đã có trong danh sách → SL xuất +1 mỗi lần quét
 * (quét lại đúng tem đó hay tem khác cùng mã, VD AAAA-51 rồi AAAA-51 / AAAA-52, đều +1).
 * @returns {Promise<{ status: "incremented" | "added" | "not-found" | "out-of-stock", row?: Object, item?: Object }>}
 */
export async function addScannedCode({ code }) {
    const existing = state.list.find(row => row.item.code === code);
    if (existing) {
        existing.quantity = (existing.quantity || 0) + 1;
        return { status: "incremented", row: existing };
    }

    const item = await inventoryApi.findItemByCode(code);
    if (!item) {
        return { status: "not-found" };
    }
    // Hết hàng thì không thêm vào danh sách xuất
    if (!(Number(item.stock) > 0)) {
        return { status: "out-of-stock", item };
    }

    const row = { item, quantity: 1 };
    state.list.push(row);
    return { status: "added", row };
}

// =====================================================
// LƯU → TRỪ KHO
// =====================================================

/**
 * Trừ kho từng dòng; dòng lưu được thì bỏ khỏi danh sách,
 * dòng lỗi giữ lại (kèm tồn kho mới nhất) để sửa và lưu lại.
 * @returns {Promise<{ savedIDs: string[], errors: string[] }>}
 */
export async function saveExport() {
    const result = await inventoryApi.applyStockChanges(state.list, -1);
    state.list = state.list.filter(row => !result.savedIDs.includes(row.item.id));

    // Cập nhật tồn kho mới nhất cho các dòng còn lại
    await Promise.all(state.list.map(async row => {
        row.item = (await inventoryApi.findItemByCode(row.item.code)) ?? row.item;
    }));

    return result;
}
