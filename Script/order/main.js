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
            service.loadInventoryItemList(),
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

    document.getElementById("btnAddMaterial")?.addEventListener("click", () => {
        const modal = document.getElementById("inventoryModal");
        if (modal) modal.style.display = "flex";
    });

    document.getElementById("btnCloseInventory")?.addEventListener("click", closeInventory);
    document.getElementById("inventoryModal")?.addEventListener("click", event => {
        if (event.target.id === "inventoryModal") closeInventory();
    });

    window.addEventListener("message", handleInventorySelection);
}

async function loadSelectedProjectItems() {
    const projectID = document.getElementById("projectFilter")?.value || "";
    const loadVersion = ++projectLoadVersion;

    ui.updateAddMaterialButton();
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
        console.error("Failed to load order items.", error);
        utils.showError(orderPageMessage.loadOrderFailed);
    }
}

function handleInventorySelection(event) {
    const frame = document.getElementById("inventoryFrame");
    if (!frame || event.source !== frame.contentWindow ||
        event.origin !== window.location.origin ||
        event.data?.type !== "ADD_ITEMS" ||
        !Array.isArray(event.data.ids)) {
        return;
    }

    const selectedIDs = new Set(event.data.ids.filter(id => typeof id === "string"));
    if (!selectedIDs.size) return;

    const selectedItems = orderDetailPageData.inventoryItemList.filter(item =>
        selectedIDs.has(item.id)
    );
    const existingKeys = new Set(orderDetailPageData.orderItemList.map(item =>
        `${item.name || ""}\u0000${item.model || ""}\u0000${item.code || ""}`
    ));
    const newItems = selectedItems.filter(item => {
        const key = `${item.name || ""}\u0000${item.model || ""}\u0000${item.code || ""}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
    }).map(item => ({
        name: item.name,
        model: item.model,
        code: item.code,
        stock: item.stock,
        order_quantity: 0,
        unit_price: 0,
        request_date: "",
        requester: "",
        status: "Pending"
    }));

    if (newItems.length) {
        orderDetailPageData.orderItemList.push(...newItems);
        ui.applyFilter();
    } else {
        utils.showWarning(orderPageMessage.itemExistInOrder);
    }
    closeInventory();
}

function closeInventory() {
    const modal = document.getElementById("inventoryModal");
    if (modal) modal.style.display = "none";
}

document.addEventListener("DOMContentLoaded", init);
