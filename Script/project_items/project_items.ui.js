// design lai phan inventory-item
// code tính năng tìm kiếm trên inventory-items và project-items
// code tính năng xóa item từ project-items, có row có id thì call api xóa, không có id thì xóa trên ui 

import * as utils from "../utils/utils.js";
import * as api from "../services/generic.api.js";
import { projectItemPageMessage } from "./project_item_page_message.js";
import { projectItemVariable } from "./project_item_variable.js";

const COLLECTION_PROJECT_ITEMS = "Project_Items"
const COLLECTION_INVENTORY_ITEMS = "Inventory_Items";


export async function renderInventoryItem() {
    try {
        const response = await api.getRecords(COLLECTION_INVENTORY_ITEMS);
        if (!response) return;
        projectItemVariable.inventoryItemList = response || [];
        const $inventory = $("#inventory-list");
        $inventory.empty();
        $.each(projectItemVariable.inventoryItemList, function (_, item) {
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
    } catch (error) {
        console.error(error);
        utils.showError(projectItemPageMessage.loadInventoryItemListError);
    }
}


export async function renderProjectTable(projectID) {
    try {
        const response = await api.getRecordsFilter(
            COLLECTION_PROJECT_ITEMS,
            "project",
            projectID
        );

        if (!response) return;

        projectItemVariable.projectItemList = response;

        const tbody = $("#project-item-body");
        tbody.empty();

        projectItemVariable.projectItemList.forEach(item => {
            tbody.append(createProjectItemRow(item, "database"));
        });

        initPopovers();
        updateProjectSummary();

    } catch (error) {
        console.error(error);
        utils.showError(projectItemPageMessage.loadProjectItemListError);
    }
}

export function processDropItem(item) {
    $("#project-item-body").append(createProjectItemRow(item));
    initLastPopover();
    updateProjectSummary();
}

function createProjectItemRow(item, type) {
    if (type == "database") {
        const descriptionHtml = (item.description ?? "").replace(/\n/g, "<br>");
        const user = JSON.parse(localStorage.getItem("user") ?? "{}");
        return `
        <tr data-id="${item.id}" data-model="${item.model}">
            <td class="text-center"><input type="checkbox" class="row-checkbox"></td>
            <td>${item.name}</td>
            <td>${item.model ?? ""}</td>
            <td>${item.code ?? ""}</td> 

            <td>
                <span
                    class="description-text"
                    data-bs-toggle="popover"
                    data-bs-html="true"
                    data-bs-content="${descriptionHtml}">
                    ${item.description ?? ""}
                </span>
            </td>

            <td class="text-center">
                <input 
                    type="number"
                    class="form-control form-control-sm text-center js-required"
                    value="${item.required_quantity}"
                    min="0"
                />
            </td>

            <td class="text-center">
                <span class="badge badge-stock">
                    ${item.stock_quantity}
                </span>
            </td>

            <td class="text-center">
                <span class="badge badge-order js-order">
                    ${item.purchase_quantity}
                </span>
                
            </td>

            <td class="text-end">
                <input 
                    type="number"
                    class="form-control form-control-sm text-end js-unit-price"
                    value="${item.unit_price}"
                    min="0"
                />
            </td>

            <td class="text-end js-total-price">
                $ ${item.total_price.toLocaleString()}
            </td>

            <td>${user.employee_id ?? ""}</td>

            <td>
                <input
                    type="date"
                    class="form-control form-control-sm js-request-date"
                    value="${utils.formatDateDisplay(item.request_date) ?? ""}"
                    />
            </td>

        </tr>
    `;
    } else {
        const user = JSON.parse(localStorage.getItem("user") ?? "{}");
        const descriptionHtml = (item.description ?? "").replace(/\n/g, "<br>");
        const required = item.required_quantity ?? 0;
        const stock = item.stock ?? 0;
        const unitPrice = item.unit_price ?? item.price ?? 0;
        const totalPrice = Math.max(required - stock, 0) * unitPrice;

        return `
        <tr data-model="${item.model}">
            <td class="text-center"><input type="checkbox" class="row-checkbox"></td>
            <td>${item.name}</td>
            <td>${item.model ?? ""}</td>
            <td>${item.code ?? ""}</td>

            <td>
                <span
                    class="description-text"
                    data-bs-toggle="popover"
                    data-bs-html="true"
                    data-bs-content="${descriptionHtml}">
                    ${item.description ?? ""}
                </span>
            </td>

            <td class="text-center">
                <input 
                    type="number"
                    class="form-control form-control-sm text-center js-required"
                    value="${required}"
                    min="0"
                />
            </td>

            <td class="text-center">
                <span class="badge badge-stock">
                    ${item.stock}
                </span>
            </td>

            <td class="text-center">
                <span class="badge badge-order js-order">
                    ${Math.max(required - stock, 0)}
                </span>
                
            </td>

            <td class="text-end">
                <input 
                    type="number"
                    class="form-control form-control-sm text-end js-unit-price"
                    value="${unitPrice}"
                    min="0"
                />
            </td>

            <td class="text-end js-total-price">
                $ ${totalPrice.toLocaleString()}
            </td>

            <td>${user.employee_id ?? ""}</td>

            <td>
                <input
                    type="date"
                    class="form-control form-control-sm js-request-date"
                    value="${utils.formatDateDisplay(item.request_date) ?? ""}"
                    />
            </td>

        </tr>
    `;
    }

}

export function updateProjectSummary() {
    let totalCost = 0;
    $("#project-item-body tr").each(function () {
        const totalPriceRow = Number($(this)
            .find(".js-total-price")
            .text()
            .replace(/[^0-9.-]/g, "")
        ) || 0;
        totalCost += totalPriceRow;
    });
    $("#lbl-total-cost").text("$ " + totalCost.toLocaleString());
}

function initPopovers() {
    $("#project-item-body")
        .find('[data-bs-toggle="popover"]')
        .each(function () {
            new bootstrap.Popover(this, {
                html: true
            });
        });
}

function initLastPopover() {
    const element = $("#project-item-body")
        .find('[data-bs-toggle="popover"]')
        .last()[0];
    if (element) {
        new bootstrap.Popover(element, {
            html: true
        });
    }
}

export function updateBulkActionBar() {
    const checkedBoxes = document.querySelectorAll(".row-checkbox:checked");
    const bar = document.getElementById("bulkActionBar");

    if (checkedBoxes.length > 0) {
        bar.classList.add("show");
    } else {
        bar.classList.remove("show");
    }
}
