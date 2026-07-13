import { orderDetailPageData } from "./state.js";
import * as utils from "../utils/utils.js"

export function renderInventoryItemList(inventoryItemList) {
    const container = document.querySelector("#inventoryItemList");
    if (!container) return;
    container.innerHTML = "";
    const html = inventoryItemList.map(item => `
    <div class="inventory-item" data-id="${item.id}">
        <div class="d-flex">
            <img
                src="http://127.0.0.1:8090/api/files/Inventory_Items/${item.id}/${item.image}"
                class="item-image"
                alt="${item.name}"
            >
            <div class="ms-3 flex-grow-1">
                <h6 title="${item.name}">${item.name}</h6>
                <div class="text-muted">
                    ${item.model}
                </div>
            </div>
        </div>
    </div>
`).join("");

    container.insertAdjacentHTML("beforeend", html);
}

export function renderOrderItemTable(orderItemList) {
    const tbody = document.getElementById("orderTable");
    if (!tbody) return;
    tbody.innerHTML = orderItemList
        .map(createOrderItemRow)
        .join("");
}

export function processDropItem(item) {
    const tbody = document.getElementById("orderTable");
    if (!tbody) return;
    tbody.insertAdjacentHTML(
        "beforeend",
        createOrderItemRow(item)
    );
}

function createOrderItemRow(item) {
    const projectOptions = orderDetailPageData.projectList
        .map(project => `
            <option value="${project.id}">
                ${project.name}
            </option>
        `)
        .join("");

    const userOptions = orderDetailPageData.userList
        .map(user => `
            <option value="${user.id}">
                ${user.employee_name}
            </option>
        `)
        .join("");

    const order = item.order_quantity ?? 0;
    const unitPrice = item.unit_price ?? 0;
    const totalPrice = order * unitPrice;

    return `
        <tr data-id="${item.id}">
            <td>${item.name ?? ""}</td>
            <td>${item.model ?? ""}</td>
            <td>${item.code ?? ""}</td>
            <td>
                <select 
                    class="form-select project-select"
                    data-field="project_id">
                    <option value="">
                        Select project
                    </option>
                    ${projectOptions}
                </select>
            </td>
            <td>
                <input
                    type="number"
                    class="form-control order-input"
                    value="${order}"
                    min="0"
                >
            </td>
            <td>
                <input
                    type="number"
                    class="form-control unit-price-input"
                    value="${unitPrice}"
                    min="0"
                >
            </td>
            <td class="total-price">
                ${totalPrice}
            </td>
            <td>
                <select
                    class="form-select requester-select"
                    data-field="requester_id">
                    <option value="">
                        Select requester
                    </option>
                    ${userOptions}
                </select>
            </td>
        </tr>
    `;
}