import * as utils from "../utils/utils.js"

import { orderPageMessage } from "./message.js";
import { orderDetailPageData } from "./state.js";
import { URL_LOCAL } from "../config.js";

const params = new URLSearchParams(window.location.search);
const orderID = params.get("orderID");

export function renderInventoryItemList(inventoryItemList) {
    const container = document.querySelector("#inventoryItemList");
    if (!container) return;
    container.innerHTML = "";
    const html = inventoryItemList.map(item => `
    <div class="inventory-item" data-id="${item.id}">
        <div class="d-flex">
            <img
                src=${URL_LOCAL}/api/files/Inventory_Items/${item.id}/${item.image}
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

    bindCheckboxEvent();

}

function bindCheckboxEvent() {
    const checkboxes = document.querySelectorAll(
        ".row-checkbox"
    );

    const selectionBar = document.getElementById(
        "selectionBar"
    );

    checkboxes.forEach(cb => {
        cb.addEventListener(
            "change",
            function () {
                const checkedCount =
                    document.querySelectorAll(
                        ".row-checkbox:checked"
                    ).length;


                if (checkedCount > 0) {
                    selectionBar.classList.add("show");
                }
                else {
                    selectionBar.classList.remove("show");
                }
            }
        );
    });
}

export function applyFilter() {
    if (!orderDetailPageData.inventoryItemList) return;
    const keyword = searchInput.value.trim().toLowerCase();
    orderDetailPageData.inventoryItemFilter =
        orderDetailPageData.inventoryItemList.filter(item => {
            const matchSearch =
                (item.name || "").toLowerCase().includes(keyword) ||
                (item.model || "").toLowerCase().includes(keyword);

            const matchBrand =
                !orderDetailPageData.selectedBrand ||
                item.brand === orderDetailPageData.selectedBrand;

            const matchType =
                !orderDetailPageData.selectedType ||
                item.type === orderDetailPageData.selectedType;

            return matchSearch && matchBrand && matchType;
        });

}

export function getSelectedRows() {
    return [
        ...document.querySelectorAll(".row-checkbox:checked")
    ];
}


export function getRowCheckboxes() {
    return [...document.querySelectorAll(".row-checkbox")];
}

export function getSelectedItems() {
    const project = document.getElementById("projectFilter").value;

    return getSelectedRows()
        .map(cb => {
            const tr = cb.closest("tr");
            return {
                id: tr.dataset.id || null,
                name: tr.children[1].innerText,
                model: tr.children[2].innerText,
                code: tr.children[3].innerText,
                stock: tr.children[4].innerText,
                project: project,
                order_quantity: Number(
                    tr.querySelector(".order-input").value
                ),
                unit_price: Number(
                    tr.querySelector(".unit-price-input").value
                ),
                requester: tr.querySelector(".requester-select").value,
                request_date: tr.querySelector(".request-date-input").value,
            };
        });
}

export function createOrderItemRow(item, index) {
    const order = item.order_quantity ?? 0;
    const unitPrice = item.unit_price ?? 0;
    const requestDate = item.request_date ?? "";

    const userOptions = orderDetailPageData.userList
        .map(user => `
            <option value="${user.id}"
                ${user.id === item.requester ? "selected" : ""}>
                ${user.employee_name}
            </option>
        `)
        .join("");

    // item.id: order item đã tồn tại trong DB
    // item.inventoryId: item mới thêm từ inventory

    return `
    <tr 
        ${item.id ? `data-id="${item.id}"` : ""}
    >
        <td class="text-center">
            <input 
                type="checkbox"
                class="form-check-input row-checkbox"
                ${item.id ? `data-id="${item.id}"` : ""}               
            >
        </td>
        <td>
            <span
                class="d-inline-block text-truncate"
                style="max-width:150px"
                title="${item.name ?? ""}">
                ${item.name ?? ""}
            </span>
        </td>
        <td>
            <span
                class="d-inline-block text-truncate"
                style="max-width:150px"
                title="${item.model ?? ""}">
                ${item.model ?? ""}
            </span>
        </td>
        <td class="text-center">${item.code ?? ""}</td>
        <td class="text-center">${item.stock ?? 0}</td>
        <td>
            <input
                type="number"
                class="form-control order-input"
                value="${order}"
                min="0">
        </td>

        <td>
            <input
                type="number"
                class="form-control unit-price-input"
                value="${unitPrice}"
                min="0">
        </td>

        <td>
            <input
                type="date"
                class="form-control request-date-input"
                value="${requestDate}">
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

        <td class="text-center">
            ${item.status ?? 0}
        </td>

    </tr>
    `;
}

export function updateAddMaterialButton() {
    const projectFilter = document.getElementById("projectFilter");
    const btnAddMaterial = document.getElementById("btnAddMaterial");

    btnAddMaterial.disabled = projectFilter.value === "";
}
