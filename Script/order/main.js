import * as service from "./service.js";
import * as ui from "./ui.js";
import * as event from "./event.js";

import { orderDetailPageData } from "./state.js";

async function init() {
    try {
        const params = new URLSearchParams(window.location.search);

        await Promise.all([
            service.loadInventoryItemList(),
            service.loadUserList(),
            service.loadProjectList()
        ]);

        //ui.renderInventoryItemList(orderDetailPageData.inventoryItemList);
        ui.renderOrderItemTable(orderDetailPageData.orderItemList);
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", init);

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

});

document.getElementById("projectFilter").addEventListener("change", async (e) => {
    const projectID = e.target.value;
    ui.updateAddMaterialButton();
    await service.loadOrderItemList(projectID);
    ui.renderOrderItemTable(orderDetailPageData.orderItemList);
});


document
    .getElementById("btnAddMaterial")
    .addEventListener("click", function () {
        openInventory();
    });


document
    .getElementById("btnCloseInventory")
    .addEventListener("click", function () {
        closeInventory();
    });


function closeInventory() {
    document.getElementById(
        "inventoryModal"
    ).style.display = "none";
}


function openInventory() {
    document.getElementById(
        "inventoryModal"
    ).style.display = "flex";
}

window.addEventListener("message", function (event) {

    if (event.data.type !== "ADD_ITEMS") return;

    const selectedIds = event.data.ids;

    const newItems =
        orderDetailPageData.inventoryItemList
            .filter(item => selectedIds.includes(item.id))
            .map(item => ({
                name: item.name,
                model: item.model,
                code: item.code,
                stock: item.stock,
                order_quantity: 0,
                unit_price: 0,
                request_date: "",
                requester: null,
                status: ""
            }));

    orderDetailPageData.orderItemList.push(...newItems);

    ui.renderOrderItemTable(orderDetailPageData.orderItemList);

});

document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    new bootstrap.Tooltip(el);
});


