import * as service from "./service.js";
import * as ui from "./ui.js";
import * as event from "./event.js";


async function init() {
    try {
        setupActiveMenu();

        await service.loadOrderList();

        ui.renderOrderList();

        event.initOrderEvents();

    } catch (error) {
        console.error("Không thể tải danh sách đơn hàng:", error);
    }
}

document.addEventListener("DOMContentLoaded", init);

// ==============================
// MENU ACTIVE
// ==============================
function setupActiveMenu() {
    const currentPage = window.location.pathname;
    const map = {
        inventory: "inventory-link",
        project: "project-link",
        user: "user-link",
        orders: "orders-link"
    };

    Object.entries(map)
        .forEach(([key, id]) => {
            if (currentPage.includes(key)) {
                document.getElementById(id)?.classList.add("active");
            }
        });
}

