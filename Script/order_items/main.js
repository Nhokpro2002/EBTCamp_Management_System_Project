import * as service from "./service.js";
import * as ui from "./ui.js";
import * as event from "./event.js";

import { orderDetailPageData } from "./state.js";

async function init() {
    try {
        const params = new URLSearchParams(window.location.search);
        const orderID = params.get("orderID");

        await Promise.all([
            service.loadInventoryItemList(),
            service.loadOrderItemList(orderID),
            service.loadUserList(),
            service.loadProjectList()
        ]);

        ui.renderInventoryItemList(orderDetailPageData.inventoryItemList);
        ui.renderOrderItemTable(orderDetailPageData.orderItemList);
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", init);


Sortable.create($("#orderTable")[0], {
    group: {
        name: "inventory",
        put: true
    },
    animation: 150,

    onAdd: function (evt) {
        const itemID = $(evt.item).data("id");
        $(evt.item).remove();
        event.handleAddItemToProjectItems(itemID);
    }
});

Sortable.create(
    document.getElementById("inventoryItemList"),
    {
        group: {
            name: "inventory",
            pull: "clone",
            put: false
        },
        sort: false
    }
);

event.initOrderItemEvents();

$(document).on("input", ".js-search-inventory", function () {
    const keyword = document.getElementsByClassName("js-search-inventory")[0].value.trim().toLowerCase();

    orderDetailPageData.inventoryItemFilter =
        orderDetailPageData.inventoryItemList.filter(item =>
            item.model?.toLowerCase().includes(keyword) ||
            item.name?.toLowerCase().includes(keyword)
        );

    ui.renderInventoryItemList(orderDetailPageData.inventoryItemFilter);
});

function applyFilter() {
    orderDetailPageData.inventoryItemFilter =
        orderDetailPageData.inventoryItemList.filter(item => {
            const matchSearch =
                item.name.toLowerCase().includes(keyword) ||
                item.model.toLowerCase().includes(keyword);

            const matchBrand =
                inventoryVariable.selectedBrand == "" ||
                item.brand == inventoryVariable.selectedBrand;

            const matchType =
                inventoryVariable.selectedType == "" ||
                item.type == inventoryVariable.selectedType;

            return matchSearch && matchBrand && matchType;
        });


    ui.renderTable(
        inventoryVariable.inventoryItemFiltered.slice(
            0,
            inventoryVariable.pageSize
        )
    );
}


const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("input", () => {
    inventoryVariable.searchKeyword =
        searchInput.value.toLowerCase().trim();
    applyFilter();
});

const brandFilter = document.getElementById("brandFilter");
brandFilter.addEventListener("change", () => {
    inventoryVariable.selectedBrand = brandFilter.value;
    applyFilter();
});

const typeFilter = document.getElementById("typeFilter");
typeFilter.addEventListener("change", () => {
    inventoryVariable.selectedType = typeFilter.value;
    applyFilter();
});