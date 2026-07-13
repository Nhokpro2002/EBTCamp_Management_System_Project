import * as service from "./service.js";
import * as ui from "./ui.js";
import * as event from "./event.js";


async function init() {
    try {
        await service.loadOrderList();

        ui.renderOrderList();

        event.initOrderEvents();

    } catch (error) {
        console.error("Không thể tải danh sách đơn hàng:", error);
    }
}

document.addEventListener("DOMContentLoaded", init);

