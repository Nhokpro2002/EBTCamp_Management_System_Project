import * as service from "./service.js";
import * as ui from "./ui.js";
import * as event from "./event.js";

import { inventoryVariable } from "./state.js";

// ==============================
// INIT PAGE — LƯU KHO
// ==============================

// Chặn truy cập khi chưa đăng nhập: Script/auth/auth.js (nạp trong <head>)
$(document).ready(async function () {
    event.initEvent();

    await loadInventory();
});

// ==============================
// LOAD DATA
// ==============================
async function loadInventory() {
    const response = await service.loadInventoryItemData();

    /*
        Lưu data gốc
        Không thay đổi biến này khi search/filter
    */
    inventoryVariable.inventoryItemFull = response ?? [];

    // Lọc (đang trống) + tính số trang + vẽ trang 1
    ui.applyFilter();
    ui.renderInventoryStats(inventoryVariable.inventoryItemFull);
}
