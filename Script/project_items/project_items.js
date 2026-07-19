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
document.querySelector(".project-info").textContent =
    localStorage.getItem("projectName") || "";
console.log(localStorage.getItem("projectName"));

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

    // Export Excel
    document.getElementById("button-export-excel")?.addEventListener("click", () => {
        handleEvent.handleExportExcelProjectItems();
    });

    // Save Project Items
    document.getElementById("button-save-project-item")?.addEventListener("click", () => {
        handleEvent.handleSaveProjectItems();
    });

    // Delete Project Items
    document.getElementById("button-delete-project-item")?.addEventListener("click", () => {
        handleEvent.handleDeleteProjectItems();
    });

    // Remove row (Event Delegation)
    document.addEventListener("click", (e) => {
        const button = e.target.closest(".btn-outline-danger");

        if (!button) return;

        const row = button.closest("tr");

        if (row) {
            row.remove();
            ui.updateProjectSummary();
        }
    });

    // Back button (nếu dùng id btnBack)
    document.getElementById("btnBack")?.addEventListener("click", () => {
        window.location.href = "project.html";
    });

    // Tìm kiếm trong inventory list (list  trái)
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