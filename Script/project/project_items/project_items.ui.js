import * as utils from "../../utils/utils.js";
import * as api from "../../services/generic.api.js";
import { messageCommon } from "../project.state.js";
import { variableGlobal } from "../project.state.js";

const COLLECTION_PROJECT_ITEMS = "Project_Items"
const COLLECTION_INVENTORY_ITEMS = "Inventory_Items";


export async function renderInventoryItem() {
    try {
        const response = await api.getRecords(COLLECTION_INVENTORY_ITEMS);
        if (!response) return;
        variableGlobal.inventoryItems = response || [];
        const $inventory = $("#inventory-list");
        $inventory.empty();
        $.each(variableGlobal.inventoryItems, function (_, item) {
            $inventory.append(`
                <div class="inventory-item" data-model="${item.model}">
                    <div style="display: flex; flex-direction: column; padding: 6px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.05);">
                        <div style="font-size: 14px; font-weight: 600; color: #222; line-height: 1.2;">${item.name}</div>
                        <div style="margin-top: 2px; font-size: 12px; color: #6b7280; line-height: 1.2;">${item.model ?? ""}</div>
                    </div>
                </div>
            `);
        });
    } catch (error) {
        console.error(error);
        utils.showError(messageCommon.error.getError);
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

        variableGlobal.projectItemList = response;

        const tbody = $("#project-item-body");
        tbody.empty();

        variableGlobal.projectItemList.forEach(item => {
            tbody.append(createProjectItemRow(item, "database"));
        });

        initPopovers();
        updateProjectSummary();

    } catch (error) {
        console.error(error);
        utils.showError(messageCommon.error.getError);
    }
}

export function processDropItem(item) {
    $("#project-item-body").append(createProjectItemRow(item));
    initLastPopover();
    updateProjectSummary();
}

function createProjectItemRow(item, type) {
    const user = JSON.parse(localStorage.getItem("user") ?? "{}");
    const descriptionHtml = (item.description ?? "").replace(/\n/g, "<br>");
    const required = item.required_quantity ?? item.required ?? 0;
    const stock = item.stock ?? 0;
    const unitPrice = item.unit_price ?? item.price ?? 0;
    const totalPrice = Math.max(required - stock, 0) * unitPrice;
    if (type == "database") {
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
                    value="${required}"
                    min="0"
                />
            </td>

            <td class="text-center">
                <span class="badge badge-stock">
                    ${stock}
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
    } else {
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
                    ${stock}
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
