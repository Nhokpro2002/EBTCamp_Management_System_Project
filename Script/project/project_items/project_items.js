// tên sản phảm, month, QCode/XCode, Mô tả, số lượng, đơn giá, tổng, người yêu cầu, ngày yêu cầu, dự án

import * as handleEvent from "./project_items.handle.event.js";
import * as ui from "./project_items.ui.js";

import { variableGlobal } from "../project.state.js";
import { projectElements } from "../project.state.js"

const projectID = new URLSearchParams(location.search).get("projectID");

$(document).ready(async function () {
    await ui.renderProjectTable(projectID);
    await ui.renderInventoryItem();

    syncInventoryItems();
});

$(document).on("input", ".js-required, .js-unit-price", function () {

    const $row = $(this).closest("tr");

    const required = parseFloat($row.find(".js-required").val()) || 0;
    const stock = parseFloat($row.find(".badge-stock").text()) || 0;
    const unitPrice = parseFloat($row.find(".js-unit-price").val()) || 0;

    // ✅ LOGIC ORDER MỚI
    const order = Math.max(required - stock, 0);

    const total = order * unitPrice;

    $row.find(".js-order").text(order);
    $row.find(".js-total-price").text("$ " + total.toLocaleString());

    ui.updateProjectSummary();
});

$(document).on("click", ".btn-outline-danger", function () {
    const row = $(this).closest("tr");
    const index = row.index();
    projectItems.splice(index, 1);
});

document.getElementById("checkAll").addEventListener("change", function () {
    const isChecked = this.checked;

    document.querySelectorAll("#project-item-body .row-checkbox").forEach(cb => {
        cb.checked = isChecked;
    });

    updateBulkActionBar();
});

$("#btn-close-project-items").on("click", function () {
    window.location.href = "project.html";
})

$("#button-export-excel").on("click", function () {
    handleEvent.handleExportExcelProjectItems();
})

$("#button-save-project-item").on("click", function () {
    handleEvent.handleSaveProjectItems();
})

function updateBulkActionBar() {
    const checkedBoxes = document.querySelectorAll(".row-checkbox:checked");
    const bar = document.getElementById("bulkActionBar");

    if (checkedBoxes.length > 0) {
        bar.classList.add("show");
    } else {
        bar.classList.remove("show");
    }
}

document.addEventListener("change", function (e) {
    if (e.target.classList.contains("row-checkbox")) {

        const all = document.querySelectorAll(".row-checkbox");
        const checked = document.querySelectorAll(".row-checkbox:checked");

        // update checkAll state
        const checkAll = document.getElementById("checkAll");

        checkAll.checked = all.length === checked.length && all.length > 0;

        updateBulkActionBar();
    }
});


Sortable.create(document.getElementById("inventory-list"), {
    group: {
        name: "inventory",
        pull: "clone",
        put: false
    },
    sort: false,
    animation: 150
});

Sortable.create(document.getElementById("drop-zone"), {
    group: {
        name: "inventory",
        put: true
    },
    animation: 150,
    onAdd: function (evt) {
        const model = evt.item.dataset.model; // id của item trong bảng inventory
        evt.item.remove();
        handleEvent.handleAddItemToProjectItems(model);

        disableInventoryItem(model);
    }
});

function syncInventoryItems() {
    document.querySelectorAll("#project-item-body tr").forEach(row => {
        disableInventoryItem(row.dataset.model);
    });
}


function disableInventoryItem(model) {
    const item = document.querySelector(`#inventory-list [data-model="${model}"]`);
    if (!item) return;
    item.classList.add("disabled");
    item.setAttribute("data-disabled", "true");
}

// Xóa item trong project-items thì cần enable lại trong inventory-items
function enableInventoryItem(model) {
    const item = document.querySelector(`#inventory-list [data-model="${model}"]`);

    if (!item) return;

    item.classList.remove("disabled");
    item.setAttribute("data-disabled", "false");
}
