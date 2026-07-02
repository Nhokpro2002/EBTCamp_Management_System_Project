// ==========================
// IMPORTS
// ==========================
import * as handleEvent from "./project_items.handle.event.js";
import * as ui from "./project_items.ui.js";

// ==========================
// STATE
// ==========================
import { projectItemVariable } from "./project_item_variable.js";

const projectID = new URLSearchParams(location.search).get("projectID");

// ==========================
// INIT
// ==========================
$(async function () {
    await ui.renderProjectTable(projectID);
    await ui.renderInventoryItem();

    syncInventoryItems();
    bindEvents();
});

// ==========================
// INPUT CHANGE (RECALC)
// ==========================
$(document).on("input", ".js-required, .js-unit-price", function () {
    const $row = $(this).closest("tr");

    const required = parseFloat($row.find(".js-required").val()) || 0;
    const stock = parseFloat($row.find(".badge-stock").text()) || 0;
    const unitPrice = parseFloat($row.find(".js-unit-price").val()) || 0;

    const order = Math.max(required - stock, 0);
    const total = order * unitPrice;

    $row.find(".js-order").text(order);
    $row.find(".js-total-price").text(`$ ${total.toLocaleString()}`);

    ui.updateProjectSummary();
});

// ==========================
// CHECKBOX (ROW)
// ==========================
$(document).on("change", ".row-checkbox", function () {
    const $all = $(".row-checkbox");
    const $checked = $(".row-checkbox:checked");

    $("#checkAll").prop("checked", $all.length === $checked.length && $all.length > 0);

    ui.updateBulkActionBar();
});

// ==========================
// CHECK ALL
// ==========================
$("#checkAll").on("change", function () {
    $(".row-checkbox").prop("checked", this.checked);
    ui.updateBulkActionBar();
});

// ==========================
// BUTTON EVENTS
// ==========================
function bindEvents() {

    $("#back-project-page-button").on("click", function () {
        window.location.href = "project.html";
    });

    $("#button-export-excel").on("click", function () {
        handleEvent.handleExportExcelProjectItems();
    });

    $("#button-save-project-item").on("click", function () {
        handleEvent.handleSaveProjectItems();
    });

    $("#button-delete-project-item").on("click", function () {
        handleEvent.handleDeleteProjectItems();
    });

    // remove row (nếu còn dùng)
    $(document).on("click", ".btn-outline-danger", function () {
        $(this).closest("tr").remove();
        ui.updateProjectSummary();
    });

    $(document).on("input", ".js-search-inventory", function () {
        const keyword = document.getElementsByClassName("js-search-inventory")[0].value.trim().toLowerCase();

        projectItemVariable.filteredInventoryItems = projectItemVariable.inventoryItemList.filter(inventoryItem => {
            const matchKeyword = inventoryItem.model?.toLowerCase().includes(keyword);

            return matchKeyword;
        });

        const $inventory = $("#inventory-list");
        $inventory.empty();
        $.each(projectItemVariable.filteredInventoryItems, function (_, item) {
            $inventory.append(`
                <div class="inventory-item" data-model="${item.model}">
                    <div title="${item.name}" style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
                        ${item.name}
                    </div>
                    <div>|</div>
                    <div title="${item.model}" style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
                        ${item.model}
                    </div>
                </div>
            `);
        });
    });
}

// ==========================
// SORTABLE INVENTORY
// ==========================
Sortable.create($("#inventory-list")[0], {
    group: {
        name: "inventory",
        pull: "clone",
        put: false
    },
    sort: false,
    animation: 150
});

Sortable.create($("#drop-zone")[0], {
    group: {
        name: "inventory",
        put: true
    },
    animation: 150,

    onAdd: function (evt) {
        const model = $(evt.item).data("model");

        $(evt.item).remove();

        handleEvent.handleAddItemToProjectItems(model);
        disableInventoryItem(model);
    }
});

// ==========================
// INVENTORY SYNC
// ==========================
function syncInventoryItems() {
    $("#project-item-body tr").each(function () {
        const model = $(this).data("model");
        disableInventoryItem(model);
    });
}

// ==========================
// DISABLE INVENTORY ITEM
// ==========================
function disableInventoryItem(model) {
    const $item = $(`#inventory-list [data-model="${model}"]`);

    if (!$item.length) return;

    $item.addClass("disabled").attr("data-disabled", "true");
}