import { orderDetailPageData } from "./state.js";
import * as utils from "../utils/utils.js"

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

    renderInventoryItemList(
        orderDetailPageData.inventoryItemFilter
    );
}

export function processDropItem(item) {
    const tbody = document.getElementById("orderTable");
    if (!tbody) return;
    tbody.insertAdjacentHTML(
        "beforeend",
        createOrderItemRow(item)
    );
}

export function getSelectedRows() {
    return [
        ...document.querySelectorAll(".row-checkbox:checked")
    ];
}

export function updateActionButtons() {
    const checkedRows = getRowCheckboxes()
        .filter(cb => cb.checked);

    const hasChecked = checkedRows.length > 0;

    document.getElementById("btnExport").disabled = !hasChecked;
    document.getElementById("btnSave").disabled = !hasChecked;
    document.getElementById("btnDelete").disabled = !hasChecked;
}

export function getRowCheckboxes() {
    return [...document.querySelectorAll(".row-checkbox")];
}

export function getSelectedItems() {
    return getSelectedRows()
        .map(cb => {
            const tr = cb.closest("tr");
            return {
                id: tr.dataset.id || null,
                name:
                    tr.children[1].innerText,
                model:
                    tr.children[2].innerText,
                code:
                    tr.children[3].innerText,
                project:
                    tr.querySelector(".project-select").value,
                order:
                    orderID,
                order_quantity:
                    Number(
                        tr.querySelector(".order-input").value
                    ),
                unit_price:
                    Number(
                        tr.querySelector(".unit-price-input").value
                    ),
                requester:
                    tr.querySelector(".requester-select").value
            };
        });
}

function createOrderItemRow(item) {
    const projectOptions = orderDetailPageData.projectList
        .map(project => `
        <option value="${project.id}" 
            ${project.id === item.project ? "selected" : ""}>
            ${project.name}
        </option>
    `)
        .join("");

    const userOptions = orderDetailPageData.userList
        .map(user => `
        <option value="${user.id}"
            ${user.id === item.requester ? "selected" : ""}>
            ${user.employee_name}
        </option>
    `)
        .join("");

    const order = item.order_quantity ?? 0;
    const unitPrice = item.unit_price ?? 0;
    const totalPrice = order * unitPrice;
    return `
        <tr ${item.id ? `data-id="${item.id}"` : ""}>
            <td class="text-center">
                <input 
                    type="checkbox" 
                    class="form-check-input row-checkbox"
                    ${item.id ? `data-id="${item.id}"` : ""}>
            </td>
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
                    min="0">
            </td>
            <td>
                <input
                    type="number"
                    class="form-control unit-price-input"
                    value="${unitPrice}"
                    min="0">
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


export function changeTotalPrice(event) {
    const target = event.target;
    // Chỉ xử lý khi thay đổi order hoặc unit price
    if (
        !target.classList.contains("order-input") &&
        !target.classList.contains("unit-price-input")
    ) {
        return;
    }

    const row = target.closest("tr");

    const order =
        Number(
            row.querySelector(".order-input").value
        ) || 0;

    const unitPrice =
        Number(
            row.querySelector(".unit-price-input").value
        ) || 0;

    const totalPrice = order * unitPrice;

    row.querySelector(".total-price")
        .textContent =
        totalPrice.toLocaleString();
}