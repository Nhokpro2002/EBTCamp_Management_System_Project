// =====================================================
// TRANG THEO DÕI ĐƠN HÀNG (order-tracking.html) — chỉ xem
// Xem vật tư trong mọi đơn hàng (Orders theo tháng), lọc theo tháng / dự án /
// tên sản phẩm / QCode-XCode, thống kê và xuất Excel danh sách đang lọc.
// Dùng chung state / service / ui với trang Tạo đơn hàng (Script/order).
// =====================================================
import * as service from "../order/service.js";
import * as ui from "../order/ui.js";
import { bindFilterInputs } from "../order/event.js";
import * as utils from "../utils/utils.js";

import { orderPageState } from "../order/state.js";
import { orderPageMessage } from "../order/message.js";

function refresh() {
    orderPageState.currentPage = 1;
    service.filterItems();
    ui.renderTable();
    ui.renderTrackingStats();
}

async function exportFiltered() {
    const items = orderPageState.filtered;
    if (!items.length) {
        utils.showWarning(orderPageMessage.noItemsToExport);
        return;
    }

    const button = document.getElementById("btnExportFiltered");
    button.disabled = true;
    try {
        await service.exportExcel(items, "theo-doi-don-hang");
    } catch (error) {
        console.error("Failed to export order items.", error);
        utils.showError(window.ExcelJS ? orderPageMessage.exportFailed : orderPageMessage.exportNotReady);
    } finally {
        button.disabled = false;
    }
}

async function init() {
    orderPageState.editable = false;
    bindFilterInputs(refresh);
    document.getElementById("btnExportFiltered").addEventListener("click", exportFiltered);
    ui.renderLoading();

    const results = await Promise.allSettled([
        service.loadReferenceData(),
        service.loadMonthOrders(),
        service.loadItems()
    ]);
    const failed = results.filter(result => result.status === "rejected");
    if (failed.length) {
        failed.forEach(result => console.error("Failed to load order tracking data.", result.reason));
        utils.showError(orderPageMessage.loadDataFailed);
    }

    // Mặc định lọc đơn hàng tháng hiện tại (nếu có)
    const currentMonth = service.getCurrentMonth();
    const currentOrder = orderPageState.monthOrders.find(order => Number(order.month) === currentMonth);
    orderPageState.filters.order = currentOrder?.id || "";

    ui.renderFilterOptions();
    refresh();
}

document.addEventListener("DOMContentLoaded", init);
