import { orderDetailPageData } from "./state.js";
import { URL_LOCAL } from "../config.js";

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

export function renderInventoryItemList(inventoryItemList) {
    const container = document.querySelector("#inventoryItemList");
    if (!container) return;

    container.innerHTML = inventoryItemList.map(item => {
        const image = item.image
            ? `${URL_LOCAL}/api/files/Inventory_Items/${encodeURIComponent(item.id)}/${encodeURIComponent(item.image)}`
            : "";
        return `
            <div class="inventory-item" data-id="${escapeHTML(item.id)}">
                <div class="d-flex">
                    ${image ? `<img src="${image}" class="item-image" alt="">` : ""}
                    <div class="ms-3 flex-grow-1">
                        <h6 title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</h6>
                        <div class="text-muted">${escapeHTML(item.model)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

export function renderOrderItemTable(orderItemList) {
    const tbody = document.getElementById("orderTable");
    if (!tbody) return;

    const pageSize = orderDetailPageData.pageSize;
    const totalPages = Math.max(1, Math.ceil(orderItemList.length / pageSize));
    orderDetailPageData.currentPage = Math.min(orderDetailPageData.currentPage, totalPages);
    const start = (orderDetailPageData.currentPage - 1) * pageSize;
    const pageItems = orderItemList.slice(start, start + pageSize);

    tbody.innerHTML = pageItems.length
        ? pageItems.map(createOrderItemRow).join("")
        : `<tr><td colspan="10" class="text-center text-muted py-4">No order items to display.</td></tr>`;

    renderPagination(orderItemList.length, totalPages);
    bindCheckboxEvents();
}

function renderPagination(totalItems, totalPages) {
    const pagination = document.getElementById("pagination");
    const pageInfo = document.getElementById("pageInfo");
    if (!pagination || !pageInfo) return;

    if (!totalItems) {
        pageInfo.textContent = "No items";
        pagination.replaceChildren();
        return;
    }

    const currentPage = orderDetailPageData.currentPage;
    const firstItem = (currentPage - 1) * orderDetailPageData.pageSize + 1;
    const lastItem = Math.min(currentPage * orderDetailPageData.pageSize, totalItems);
    pageInfo.textContent = `Showing ${firstItem}-${lastItem} of ${totalItems}`;

    const pages = [];
    for (let page = 1; page <= totalPages; page += 1) {
        pages.push(`
            <li class="page-item ${page === currentPage ? "active" : ""}">
                <button class="page-link" type="button" data-page="${page}" aria-current="${page === currentPage ? "page" : "false"}">${page}</button>
            </li>
        `);
    }
    pagination.innerHTML = pages.join("");
}

function bindCheckboxEvents() {
    const checkboxes = document.querySelectorAll(".row-checkbox");
    const selectionBar = document.getElementById("selectionBar");

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("change", updateSelectionState);
    });

    updateSelectionState();

    function updateSelectionState() {
        const selectedCount = document.querySelectorAll(".row-checkbox:checked").length;
        selectionBar?.classList.toggle("show", selectedCount > 0);
        ["saveSelected", "exportExcelSelected", "deleteSelected"].forEach(id => {
            const button = document.getElementById(id);
            if (button) button.disabled = selectedCount === 0;
        });

        const checkAll = document.getElementById("checkAll");
        if (checkAll) {
            checkAll.checked = checkboxes.length > 0 &&
                [...checkboxes].every(checkbox => checkbox.checked);
            checkAll.indeterminate = selectedCount > 0 &&
                selectedCount < checkboxes.length;
        }
    }
}

export function applyFilter() {
    const keyword = orderDetailPageData.searchKeyword;
    orderDetailPageData.orderItemFilter = orderDetailPageData.orderItemList.filter(item => {
        const matchSearch = !keyword || [
            item.name,
            item.model,
            item.code
        ].some(value => String(value ?? "").toLowerCase().includes(keyword));
        const matchBrand = !orderDetailPageData.selectedBrand ||
            item.brand === orderDetailPageData.selectedBrand;
        const matchType = !orderDetailPageData.selectedType ||
            item.type === orderDetailPageData.selectedType;

        return matchSearch && matchBrand && matchType;
    });

    orderDetailPageData.currentPage = 1;
    renderOrderItemTable(orderDetailPageData.orderItemFilter);
}

export function getSelectedRows() {
    return [...document.querySelectorAll(".row-checkbox:checked")];
}

export function getRowCheckboxes() {
    return [...document.querySelectorAll(".row-checkbox")];
}

export function getSelectedItems() {
    const project = document.getElementById("projectFilter")?.value || "";

    return getSelectedRows().map(checkbox => {
        const row = checkbox.closest("tr");
        const readText = index => row.children[index]?.textContent.trim() || "";
        const id = row.dataset.id || null;

        return {
            ...(id ? { id } : {}),
            name: readText(1),
            model: readText(2),
            code: readText(3),
            stock: Number(readText(4)) || 0,
            project,
            order_quantity: Number(row.querySelector(".order-input")?.value) || 0,
            unit_price: Number(row.querySelector(".unit-price-input")?.value) || 0,
            request_date: row.querySelector(".request-date-input")?.value || "",
            requester: row.querySelector(".requester-select")?.value || "",
            status: readText(9)
        };
    });
}

export function createOrderItemRow(item) {
    const order = Number(item.order_quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const requestDate = escapeHTML(item.request_date || "");
    const userOptions = orderDetailPageData.userList.map(user => `
        <option value="${escapeHTML(user.id)}" ${user.id === (item.requester?.id || item.requester) ? "selected" : ""}>
            ${escapeHTML(user.employee_name)}
        </option>
    `).join("");
    const stock = Number(item.stock) || 0;

    return `
        <tr ${item.id ? `data-id="${escapeHTML(item.id)}"` : ""}>
            <td class="text-center">
                <input type="checkbox" class="form-check-input row-checkbox" aria-label="Select ${escapeHTML(item.name)}">
            </td>
            <td><span class="d-inline-block text-truncate order-cell-text" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</span></td>
            <td><span class="d-inline-block text-truncate order-cell-text" title="${escapeHTML(item.model)}">${escapeHTML(item.model)}</span></td>
            <td class="text-center">${escapeHTML(item.code)}</td>
            <td class="text-center">${stock}</td>
            <td><input type="number" class="form-control order-input" value="${order}" min="0" step="1" aria-label="Order quantity for ${escapeHTML(item.name)}"></td>
            <td><input type="number" class="form-control unit-price-input" value="${unitPrice}" min="0" step="0.01" aria-label="Unit price for ${escapeHTML(item.name)}"></td>
            <td><input type="date" class="form-control request-date-input" value="${requestDate}" aria-label="Request date for ${escapeHTML(item.name)}"></td>
            <td>
                <select class="form-select requester-select" aria-label="Requester for ${escapeHTML(item.name)}">
                    <option value="">Select requester</option>
                    ${userOptions}
                </select>
            </td>
            <td class="text-center">${escapeHTML(item.status || "Pending")}</td>
        </tr>
    `;
}
