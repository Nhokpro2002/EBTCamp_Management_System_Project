import * as service from "./service.js";
import * as ui from "./ui.js";
import * as event from "./event.js";
import * as utils from "../utils/utils.js";

import { orderDetailPageData } from "./state.js";
import { orderPageMessage } from "./message.js";

let projectLoadVersion = 0;

async function init() {
    event.initOrderItemEvents();
    bindPageEvents();
    ui.renderOrderItemTable([]);

    try {
        await Promise.all([
            service.loadUserList(),
            service.loadProjectList()
        ]);
    } catch (error) {
        console.error("Failed to initialize the order page.", error);
        utils.showError(orderPageMessage.loadDataFailed);
    }
}

function bindPageEvents() {
    const projectFilter = document.getElementById("projectFilter");
    projectFilter?.addEventListener("change", loadSelectedProjectItems);

    document.getElementById("checkAll")?.addEventListener("change", event => {
        ui.getRowCheckboxes().forEach(checkbox => {
            checkbox.checked = event.currentTarget.checked;
        });
        ui.getRowCheckboxes()[0]?.dispatchEvent(new Event("change", { bubbles: true }));
        if (ui.getRowCheckboxes().length === 0) {
            document.getElementById("selectionBar")?.classList.remove("show");
        }
    });

    document.getElementById("pagination")?.addEventListener("click", event => {
        const button = event.target.closest("[data-page]");
        if (!button) return;

        orderDetailPageData.currentPage = Number(button.dataset.page);
        ui.renderOrderItemTable(orderDetailPageData.orderItemFilter);
    });
}

async function loadSelectedProjectItems() {
    const projectID = document.getElementById("projectFilter")?.value || "";
    const loadVersion = ++projectLoadVersion;

    orderDetailPageData.orderItemList = [];
    orderDetailPageData.orderItemFilter = [];
    orderDetailPageData.currentPage = 1;

    if (!projectID) {
        ui.renderOrderItemTable([]);
        return;
    }

    ui.renderOrderItemTable([]);

    try {
        const items = await service.loadOrderItemList(projectID);
        if (loadVersion !== projectLoadVersion) return;

        orderDetailPageData.orderItemList = items;
        ui.applyFilter();
    } catch (error) {
        if (loadVersion !== projectLoadVersion) return;
        console.error("Không tải được danh sách đặt hàng.", error);
        utils.showError(orderPageMessage.loadOrderFailed);
    }
}

document.addEventListener("DOMContentLoaded", init);
