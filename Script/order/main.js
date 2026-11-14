// =====================================================
// TRANG TẠO ĐƠN HÀNG (order.html)
// Mỗi tháng 1 đơn hàng (Orders) chung cho mọi dự án.
// Vào trang → tìm đơn của tháng hiện tại:
//   - chưa có → hiện nút "Tạo đơn hàng tháng N"
//   - đã có   → bảng vật tư trong đơn (Order_Items): thêm / sửa / xóa / xuất Excel
// =====================================================
import * as service from "./service.js";
import * as ui from "./ui.js";
import * as event from "./event.js";
import * as utils from "../utils/utils.js";

import { orderPageState } from "./state.js";
import { orderPageMessage } from "./message.js";

const currentMonth = service.getCurrentMonth();

async function init() {
    orderPageState.editable = true;
    event.initEvents({ onCreateMonthOrder: handleCreateMonthOrder });
    ui.renderMonthOrderState("loading", currentMonth);

    try {
        const [, monthOrder] = await Promise.all([
            service.loadReferenceData(),
            service.findMonthOrder(currentMonth)
        ]);
        ui.renderFilterOptions();
        await openMonthOrder(monthOrder);
    } catch (error) {
        console.error("Failed to initialize the order page.", error);
        utils.showError(orderPageMessage.loadDataFailed);
        ui.renderMonthOrderState("empty", currentMonth);
    }
}

/**
 * Hiện đơn hàng của tháng (hoặc màn hình "chưa có đơn" nếu monthOrder = null).
 */
async function openMonthOrder(monthOrder) {
    orderPageState.monthOrder = monthOrder;
    if (!monthOrder) {
        ui.renderMonthOrderState("empty", currentMonth);
        return;
    }

    ui.renderMonthOrderState("ready", Number(monthOrder.month) || currentMonth);
    ui.renderLoading();
    await service.loadItems(monthOrder.id);
    service.filterItems();
    ui.renderTable();
}

async function handleCreateMonthOrder() {
    const button = document.getElementById("btnCreateMonthOrder");
    button.disabled = true;
    try {
        const monthOrder = await service.createMonthOrder(currentMonth);
        utils.showSuccess(orderPageMessage.createOrderSuccess);
        await openMonthOrder(monthOrder);
    } catch (error) {
        console.error("Failed to create month order.", error);
        utils.showError(orderPageMessage.createOrderFailed);
    } finally {
        button.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", init);
