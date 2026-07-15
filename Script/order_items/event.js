import * as ui from "./ui.js";
import * as service from "./service.js";
import * as utils from "../utils/utils.js";

import { orderDetailPageData } from "./state.js";
import { orderPageMessage } from "./message.js";


export function handleAddItemToProjectItems(itemID) {
    const item = orderDetailPageData.inventoryItemList.find(x => x.id === itemID);
    if (!item) {
        utils.showError(orderPageMessage.itemNotExist);
        return;
    }

    if (orderDetailPageData.orderItemList.some(x => x.id === itemID)) {
        utils.showError(orderPageMessage.itemExistInOrder);
        return;
    }
    const newItem = { ...item };
    delete newItem.id;
    orderDetailPageData.orderItemList.push(item);
    ui.processDropItem(newItem);
    utils.showSuccess(orderPageMessage.addItemSuccess);
}

export function initOrderItemEvents() {
    const tbody = document.getElementById("orderTable");
    if (!tbody) return;
    tbody.addEventListener("input", (event) => {
        ui.changeTotalPrice(event);
    });


    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", () => {
        orderDetailPageData.searchKeyword =
            searchInput.value.trim().toLowerCase();
        ui.applyFilter();
    });

    const brandFilter = document.getElementById("brandFilter");
    brandFilter.addEventListener("change", () => {
        orderDetailPageData.selectedBrand = brandFilter.value;
        ui.applyFilter();
    });

    const typeFilter = document.getElementById("typeFilter");
    typeFilter.addEventListener("change", () => {
        orderDetailPageData.selectedType = typeFilter.value;
        ui.applyFilter();
    });

    const btnExport = document.getElementById("btnExport");
    btnExport.addEventListener("click", async () => {
        service.exportExcel();
    });

    const btnSave = document.getElementById("btnSave");
    btnSave.addEventListener("click", async () => {
        const orderItemList = ui.getSelectedItems();
        service.saveOrderItem(orderItemList);
    })

    const btnDelete = document.getElementById("btnDelete");
    btnDelete.addEventListener("click", async () => {
        const orderItemList = ui.getSelectedItems();
        service.deleteOrderItem(orderItemList);
    })

    document
        .getElementById("back-project-page-button")
        .addEventListener("click", function () {
            window.location.href = "orders.html";
        });
}











