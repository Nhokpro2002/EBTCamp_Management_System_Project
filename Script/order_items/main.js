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


const checkAll = document.getElementById("checkAll");

// Checkbox cha
checkAll.addEventListener("change", function () {
    const checked = this.checked;

    ui.getRowCheckboxes().forEach(cb => {
        cb.checked = checked;

        // giả lập sự kiện change của checkbox con
        cb.dispatchEvent(new Event("change", {
            bubbles: true
        }));
    });
});

// Checkbox con
document.addEventListener("change", function (e) {
    if (!e.target.classList.contains("row-checkbox")) {
        return;
    }
    const checkboxes = [...ui.getRowCheckboxes()];
    const checkedCount = checkboxes.filter(
        cb => cb.checked
    ).length;

    // Tất cả checkbox con được chọn
    if (checkedCount === checkboxes.length) {
        checkAll.checked = true;
    }
    // Có một phần hoặc không có checkbox nào được chọn
    else {
        checkAll.checked = false;
    }

    ui.updateActionButtons();
});