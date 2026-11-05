import { inventoryVariable } from "./state.js";
import { URL_LOCAL } from "../config.js";
import { escapeHtml, getItemImageUrl } from "../services/inventory.api.js";

export { escapeHtml };

const COLLECTION_USERS = "Users";

const tbody = document.getElementById("inventoryTable");


export function changeIconAvatar() {
    const dropdownAvatar = document.querySelector('.dropdown img');
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!dropdownAvatar || !userData) return;
    dropdownAvatar.src =
        `${URL_LOCAL}/api/files/${COLLECTION_USERS}/${userData.id}/${userData.avatar}?t=${Date.now()}`;
}

export function changeTopbarText() {
    const topbarText = document.querySelector('.topbar .text-muted');
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!topbarText || !userData) return;
    topbarText.textContent = `Chào mừng trở lại, ${userData.employee_id} 👋`;
}

// Mức tồn kho: hết hàng / thấp (< 10) / trung bình (< 30) / đủ
function getStockStatus(stock) {
    const value = Number(stock) || 0;
    if (value <= 0) return { className: "is-out", label: "Hết hàng" };
    if (value < 10) return { className: "is-low", label: "Sắp hết" };
    if (value < 30) return { className: "is-medium", label: "Còn ít" };
    return { className: "is-high", label: "Còn hàng" };
}

function renderInventoryRow(item) {
    const imageUrl = getItemImageUrl(item);
    const stock = Number(item.stock) || 0;
    const status = getStockStatus(stock);
    const name = escapeHtml(item.name);

    return `
        <tr data-item-id="${escapeHtml(item.id)}">
            <td class="col-check">
                <input type="checkbox" class="form-check-input row-checkbox"
                    value="${escapeHtml(item.id)}" aria-label="Chọn ${name}">
            </td>
            <td>
                <div class="material-thumb">
                    <i class="bi bi-box-seam" aria-hidden="true"></i>
                    ${imageUrl ? `<img src="${imageUrl}" alt="${name}" loading="lazy" onerror="this.remove()">` : ""}
                </div>
            </td>
            <td><div class="product-name">${name}</div></td>
            <td class="col-description">
                ${item.description
                    ? `<div class="description-cell" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</div>`
                    : '<span class="cell-muted">-</span>'}
            </td>
            <td>${item.code ? `<span class="code-chip">${escapeHtml(item.code)}</span>` : '<span class="cell-muted">-</span>'}</td>
            <td>${item.brand ? `<span class="brand-chip">${escapeHtml(item.brand)}</span>` : '<span class="cell-muted">-</span>'}</td>
            <td>
                <span class="stock-badge ${status.className}" title="${status.label}">
                    <span class="stock-dot" aria-hidden="true"></span>${stock}
                </span>
            </td>
        </tr>`;
}

function renderEmptyRow() {
    const message = inventoryVariable.scanItems
        ? `Không tìm thấy vật tư có mã <b>${escapeHtml(inventoryVariable.scanCode)}</b>`
        : "Không có vật tư nào";

    return `
        <tr class="empty-row">
            <td colspan="7">
                <div class="empty-state">
                    <i class="bi bi-inbox" aria-hidden="true"></i>
                    <span>${message}</span>
                </div>
            </td>
        </tr>`;
}

export function renderTable(filteredList) {
    tbody.innerHTML = filteredList.length
        ? filteredList.map(renderInventoryRow).join("")
        : renderEmptyRow();

    // Bảng vừa vẽ lại → không còn dòng nào được chọn
    updateSelectionState();
    renderPagination();
    renderPageInfo();
}

// ---------- Checkbox / selection ----------

function getRowCheckboxes() {
    return [...tbody.querySelectorAll(".row-checkbox")];
}

export function getSelectedItemIDs() {
    return getRowCheckboxes()
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
}

export function setAllRowsChecked(checked) {
    getRowCheckboxes().forEach(checkbox => {
        checkbox.checked = checked;
    });
    updateSelectionState();
}

/**
 * Đồng bộ ô "chọn tất cả", màu dòng được chọn và thanh Delete theo các ô đang tick.
 */
export function updateSelectionState() {
    const checkboxes = getRowCheckboxes();
    const checkedCount = checkboxes.filter(checkbox => checkbox.checked).length;

    const checkAll = document.getElementById("checkAllItems");
    if (checkAll) {
        checkAll.disabled = checkboxes.length === 0;
        checkAll.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        checkAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }

    checkboxes.forEach(checkbox => {
        checkbox.closest("tr").classList.toggle("is-selected", checkbox.checked);
    });

    const selectionBar = document.getElementById("selectionBar");
    document.getElementById("selectionCount").textContent = checkedCount;
    selectionBar.classList.toggle("show", checkedCount > 0);
    // Ẩn thì không cho tab vào các nút bên trong
    selectionBar.inert = checkedCount === 0;
}

export function setDeleteSaving(isSaving) {
    const button = document.getElementById("btnDeleteSelected");
    button.disabled = isSaving;
    button.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang xóa...'
        : '<i class="bi bi-trash"></i> Xóa';
}

// ---------- Pagination ----------

function renderPageInfo() {
    const total = inventoryVariable.inventoryItemFiltered.length;
    const start = total ? (inventoryVariable.currentInventoryPage - 1) * inventoryVariable.pageSize + 1 : 0;
    const end = Math.min(start + inventoryVariable.pageSize - 1, total);

    document.getElementById("pageInfo").innerHTML =
        `Hiển thị <b>${start}–${end}</b> / <b>${total}</b> vật tư`;
}

export function renderPagination() {
    const pagination = document.getElementById("pagination");
    const { currentInventoryPage: current, totalPages } = inventoryVariable;

    const pageButton = (page, content, { active = false, disabled = false, label = "" } = {}) => `
        <li class="page-item ${active ? "active" : ""} ${disabled ? "disabled" : ""}">
            <button type="button" class="page-link page-btn" data-page="${page}"
                ${disabled ? "disabled" : ""} ${active ? 'aria-current="page"' : ""}
                ${label ? `aria-label="${label}"` : ""}>${content}</button>
        </li>`;

    let html = pageButton(current - 1, '<i class="bi bi-chevron-left"></i>', {
        disabled: current <= 1,
        label: "Trang trước"
    });

    for (let i = 1; i <= totalPages; i++) {
        html += pageButton(i, i, { active: i === current });
    }

    html += pageButton(current + 1, '<i class="bi bi-chevron-right"></i>', {
        disabled: current >= totalPages,
        label: "Trang sau"
    });

    pagination.innerHTML = html;
}

// ---------- Thống kê ----------

export function renderInventoryStats(items) {
    const stocks = items.map(item => Number(item.stock) || 0);
    const format = value => value.toLocaleString("en-US");

    document.getElementById("statTotalItems").textContent = format(items.length);
    document.getElementById("statTotalUnits").textContent = format(stocks.reduce((sum, stock) => sum + stock, 0));
    document.getElementById("statLowStock").textContent = format(stocks.filter(stock => stock > 0 && stock < 10).length);
    document.getElementById("statOutOfStock").textContent = format(stocks.filter(stock => stock <= 0).length);
}

/**
 * Lọc danh sách (theo QR nếu đang lọc QR, rồi theo search + brand)
 * và vẽ trang hiện tại. Phân trang tính trên danh sách đã lọc.
 * @param {boolean} resetPage true: về trang 1, false: giữ trang hiện tại
 */
export function applyFilter(resetPage = true) {
    const source = inventoryVariable.scanItems ?? inventoryVariable.inventoryItemFull;
    const keyword = inventoryVariable.searchKeyword;
    // Quét tem "AAAA-51" vào ô tìm kiếm → cũng tìm theo code "AAAA"
    const keywordCode = keyword.replace(/-\d+$/, "");

    inventoryVariable.inventoryItemFiltered =
        source.filter(item => {
            const matchSearch =
                keyword == "" ||
                // Model không hiện trên bảng nhưng vẫn tìm được
                [item.name, item.description, item.model, item.code].some(value =>
                    String(value ?? "").toLowerCase().includes(keyword)
                ) ||
                (keywordCode !== keyword &&
                    String(item.code ?? "").toLowerCase() === keywordCode);

            const matchBrand =
                inventoryVariable.selectedBrand == "" ||
                item.brand == inventoryVariable.selectedBrand;

            return matchSearch && matchBrand;
        });

    inventoryVariable.totalPages = Math.max(1, Math.ceil(
        inventoryVariable.inventoryItemFiltered.length / inventoryVariable.pageSize
    ));
    inventoryVariable.currentInventoryPage = resetPage
        ? 1
        : Math.min(inventoryVariable.currentInventoryPage, inventoryVariable.totalPages);

    renderCurrentPage();
}

export function renderCurrentPage() {
    const start = (inventoryVariable.currentInventoryPage - 1) * inventoryVariable.pageSize;
    renderTable(
        inventoryVariable.inventoryItemFiltered.slice(start, start + inventoryVariable.pageSize)
    );
}

// ---------- Lọc bằng quét QR ----------

/**
 * Hiện/ẩn thanh "QR filter" phía trên bảng.
 * @param {string} code code đang lọc ("" để ẩn)
 * @param {"loading"|number} state "loading" hoặc số kết quả
 */
export function renderScanFilter(code, state) {
    const bar = document.getElementById("scanFilterBar");
    if (!code) {
        bar.hidden = true;
        bar.innerHTML = "";
        return;
    }

    const status = state === "loading"
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang tìm...'
        : `${state} kết quả`;

    bar.innerHTML = `
        <i class="bi bi-qr-code-scan" aria-hidden="true"></i>
        <span>Lọc theo QR: <b>${escapeHtml(code)}</b></span>
        <span class="scan-filter-count ${state === 0 ? "is-empty" : ""}">${status}</span>
        <button type="button" class="btn btn-sm btn-light" id="clearScanFilterBtn" aria-label="Bỏ lọc QR">
            <i class="bi bi-x-lg"></i> Bỏ lọc
        </button>`;
    bar.hidden = false;
}

