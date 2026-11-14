// =====================================================
// UI DÙNG CHUNG cho order.html (sửa được) và order-tracking.html (chỉ xem).
// orderPageState.editable quyết định bảng có ô nhập / checkbox hay không.
// Phần tử nào không có trên trang thì bỏ qua (không lỗi).
// =====================================================
import * as service from "./service.js";
import { orderPageState } from "./state.js";

const moneyFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

const byId = id => document.getElementById(id);

export function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

export function formatMoney(value) {
    return moneyFormat.format(Number(value) || 0);
}

function formatDate(iso) {
    const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

const muted = '<span class="cell-muted">-</span>';

// =====================================================
// OPTION CHO CÁC Ô SELECT
// =====================================================

function renderOptions(list, selectedValue, getValue, getLabel) {
    return list.map(entry => {
        const value = String(getValue(entry));
        return `<option value="${escapeHTML(value)}" ${value === String(selectedValue ?? "") ? "selected" : ""}>${escapeHTML(getLabel(entry))}</option>`;
    }).join("");
}

const userOptions = selected =>
    renderOptions(orderPageState.users, selected, user => user.id, user => user.employee_name || user.email || user.id);

const projectOptions = selected =>
    renderOptions(orderPageState.projects, selected, project => project.id, project => project.name || "Dự án chưa đặt tên");

/**
 * Nhãn của đơn hàng (Orders) trong ô lọc tháng.
 */
export function getMonthOrderLabel(order) {
    return `Đơn hàng tháng ${Number(order.month) || "?"}`;
}

/**
 * Đổ dữ liệu vào các ô lọc và (nếu có) các ô select của form thêm vật tư.
 */
export function renderFilterOptions() {
    const projectFilter = byId("projectFilter");
    if (projectFilter) {
        projectFilter.innerHTML =
            `<option value="">Tất cả dự án</option>${projectOptions(orderPageState.filters.project)}`;
    }

    // Trang Theo dõi: lọc theo đơn hàng (tháng)
    const monthFilter = byId("monthFilter");
    if (monthFilter) {
        monthFilter.innerHTML = `<option value="">Tất cả tháng</option>${renderOptions(
            orderPageState.monthOrders,
            orderPageState.filters.order,
            order => order.id,
            getMonthOrderLabel
        )}`;
    }

    // Form thêm vật tư (trang Tạo đơn hàng)
    if (byId("createProject")) {
        byId("createProject").innerHTML = `<option value="">Chọn dự án</option>${projectOptions("")}`;
        byId("createRequester").innerHTML = `<option value="">Chọn người yêu cầu</option>${userOptions("")}`;
        byId("inventoryOptions").innerHTML = orderPageState.inventory
            .map(item => `<option value="${escapeHTML(getInventoryLabel(item))}"></option>`)
            .join("");
    }
}

/**
 * Nhãn của vật tư trong ô gợi ý: "Tên — CODE"
 */
export function getInventoryLabel(item) {
    return item.code ? `${item.name} — ${item.code}` : String(item.name || "");
}

// =====================================================
// BẢNG
// =====================================================

function renderCommonCells(item) {
    const name = escapeHTML(item.name);
    return {
        name: `<td><span class="order-cell-text" title="${name}">${name}</span></td>`,
        month: `<td><span class="month-chip">${item.month ? `Tháng ${escapeHTML(item.month)}` : "-"}</span></td>`,
        code: `<td>${item.code ? `<span class="code-chip">${escapeHTML(item.code)}</span>` : muted}</td>`,
        description: `<td>${item.description
            ? `<span class="order-description" title="${escapeHTML(item.description)}">${escapeHTML(item.description)}</span>`
            : muted}</td>`,
        total: `<td class="order-total">${formatMoney(service.getTotal(item))}</td>`
    };
}

/**
 * Dòng chỉ xem (trang Theo dõi).
 */
function renderReadonlyRow(item) {
    const cells = renderCommonCells(item);
    const requester = service.getRequesterName(item);
    const project = service.getProjectName(item);

    return `
        <tr data-id="${escapeHTML(item.id)}">
            ${cells.name}
            ${cells.month}
            ${cells.code}
            ${cells.description}
            <td class="text-end">${formatMoney(item.order_quantity)}</td>
            <td class="text-end">${formatMoney(item.unit_price)}</td>
            ${cells.total}
            <td>${requester ? escapeHTML(requester) : muted}</td>
            <td>${item.request_date ? formatDate(item.request_date) : muted}</td>
            <td>${project ? `<span class="project-chip">${escapeHTML(project)}</span>` : muted}</td>
        </tr>`;
}

/**
 * Dòng sửa được (trang Tạo đơn hàng).
 */
function renderEditableRow(item) {
    const cells = renderCommonCells(item);
    const name = escapeHTML(item.name);
    // Dự án / người yêu cầu không còn trong danh sách → vẫn hiện tên từ expand
    const missingProject = item.project && !orderPageState.projects.some(project => project.id === item.project);
    const missingUser = item.requester && !orderPageState.users.some(user => user.id === item.requester);

    return `
        <tr data-id="${escapeHTML(item.id)}" class="${item._dirty ? "is-dirty" : ""}">
            <td class="text-center">
                <input type="checkbox" class="form-check-input row-checkbox" aria-label="Chọn ${name}">
            </td>
            ${cells.name}
            ${cells.month}
            ${cells.code}
            ${cells.description}
            <td><input type="number" class="form-control form-control-sm order-field order-quantity" data-field="order_quantity" value="${Number(item.order_quantity) || 0}" min="0" step="1" aria-label="Số lượng của ${name}"></td>
            <td><input type="number" class="form-control form-control-sm order-field order-price" data-field="unit_price" value="${Number(item.unit_price) || 0}" min="0" step="0.01" aria-label="Đơn giá của ${name}"></td>
            ${cells.total}
            <td>
                <select class="form-select form-select-sm order-field order-requester" data-field="requester" aria-label="Người yêu cầu của ${name}">
                    <option value="">Chọn người yêu cầu</option>
                    ${missingUser ? `<option value="${escapeHTML(item.requester)}" selected>${escapeHTML(service.getRequesterName(item) || item.requester)}</option>` : ""}
                    ${userOptions(item.requester)}
                </select>
            </td>
            <td><input type="date" class="form-control form-control-sm order-field order-date" data-field="request_date" value="${escapeHTML(item.request_date)}" aria-label="Ngày yêu cầu của ${name}"></td>
            <td>
                <select class="form-select form-select-sm order-field order-project" data-field="project" aria-label="Dự án của ${name}">
                    <option value="">Chọn dự án</option>
                    ${missingProject ? `<option value="${escapeHTML(item.project)}" selected>${escapeHTML(service.getProjectName(item) || item.project)}</option>` : ""}
                    ${projectOptions(item.project)}
                </select>
            </td>
        </tr>`;
}

function renderEmptyRow(message) {
    const colspan = orderPageState.editable ? 11 : 10;
    return `<tr class="empty-row"><td colspan="${colspan}" class="text-center text-muted py-4">${message}</td></tr>`;
}

export function renderLoading() {
    const tbody = byId("orderTable");
    if (tbody) {
        tbody.innerHTML = renderEmptyRow('<span class="spinner-border spinner-border-sm me-2"></span>Đang tải đơn hàng...');
    }
}

export function renderTable() {
    const tbody = byId("orderTable");
    const list = orderPageState.filtered;
    const pageSize = orderPageState.pageSize;
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    orderPageState.currentPage = Math.min(Math.max(1, orderPageState.currentPage), totalPages);

    const start = (orderPageState.currentPage - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);
    const renderRow = orderPageState.editable ? renderEditableRow : renderReadonlyRow;

    const emptyMessage = orderPageState.items.length
        ? "Không có vật tư nào khớp bộ lọc."
        : orderPageState.editable
            ? "Đơn hàng chưa có vật tư nào. Bấm \"Thêm vật tư\" để bắt đầu."
            : "Chưa có đơn hàng nào.";

    tbody.innerHTML = pageItems.length
        ? pageItems.map(renderRow).join("")
        : renderEmptyRow(emptyMessage);

    renderPagination(list.length, totalPages);
    renderGrandTotal();
    updateSelectionState();
}

function renderPagination(totalItems, totalPages) {
    const pagination = byId("pagination");
    const pageInfo = byId("pageInfo");

    if (!totalItems) {
        pageInfo.textContent = "Không có dòng nào";
        pagination.replaceChildren();
        return;
    }

    const currentPage = orderPageState.currentPage;
    const firstItem = (currentPage - 1) * orderPageState.pageSize + 1;
    const lastItem = Math.min(currentPage * orderPageState.pageSize, totalItems);
    pageInfo.textContent = `Hiển thị ${firstItem}-${lastItem} / ${totalItems}`;

    pagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        const active = page === currentPage;
        return `
            <li class="page-item ${active ? "active" : ""}">
                <button class="page-link" type="button" data-page="${page}" ${active ? 'aria-current="page"' : ""}>${page}</button>
            </li>`;
    }).join("");
}

export function renderGrandTotal() {
    const total = orderPageState.filtered.reduce((sum, item) => sum + service.getTotal(item), 0);
    const element = byId("grandTotal");
    if (element) element.textContent = formatMoney(total);
}

/**
 * Cập nhật ô Tổng + đánh dấu dòng đã sửa (chưa lưu) mà không vẽ lại cả bảng.
 */
export function refreshRow(row, item) {
    row.querySelector(".order-total").textContent = formatMoney(service.getTotal(item));
    row.classList.toggle("is-dirty", item._dirty);
}

// =====================================================
// CHỌN DÒNG / THANH THAO TÁC (chỉ trang Tạo đơn hàng)
// =====================================================

export function getRowCheckboxes() {
    const tbody = byId("orderTable");
    return tbody ? [...tbody.querySelectorAll(".row-checkbox")] : [];
}

export function getSelectedIDs() {
    return getRowCheckboxes()
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.closest("tr").dataset.id);
}

export function setAllRowsChecked(checked) {
    getRowCheckboxes().forEach(checkbox => {
        checkbox.checked = checked;
    });
    updateSelectionState();
}

export function updateSelectionState() {
    const selectionBar = byId("selectionBar");
    if (!selectionBar) return;

    const checkboxes = getRowCheckboxes();
    const selectedCount = checkboxes.filter(checkbox => checkbox.checked).length;

    checkboxes.forEach(checkbox => {
        checkbox.closest("tr").classList.toggle("is-selected", checkbox.checked);
    });

    byId("selectionCount").textContent = selectedCount;
    selectionBar.classList.toggle("show", selectedCount > 0);
    // Ẩn thì không cho tab vào các nút bên trong
    selectionBar.inert = selectedCount === 0;
    Object.keys(ACTION_LABELS).forEach(id => {
        byId(id).disabled = selectedCount === 0;
    });

    const checkAll = byId("checkAll");
    checkAll.checked = checkboxes.length > 0 && selectedCount === checkboxes.length;
    checkAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
}

const ACTION_LABELS = {
    saveSelected: { idle: '<i class="bi bi-check-lg"></i> Lưu', busy: "Đang lưu..." },
    exportExcelSelected: { idle: '<i class="bi bi-file-earmark-spreadsheet"></i> Xuất Excel', busy: "Đang xuất..." },
    deleteSelected: { idle: '<i class="bi bi-trash"></i> Xóa', busy: "Đang xóa..." }
};

/**
 * Khóa các nút trên thanh thao tác; nút đang chạy (busyID) hiện spinner.
 */
export function setActionsBusy(busy, busyID = "") {
    Object.entries(ACTION_LABELS).forEach(([id, label]) => {
        const button = byId(id);
        button.disabled = busy || getSelectedIDs().length === 0;
        button.innerHTML = busy && id === busyID
            ? `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> ${label.busy}`
            : label.idle;
    });
    byId("btnClearSelection").disabled = busy;
}

// =====================================================
// TRANG TẠO ĐƠN HÀNG: trạng thái đơn của tháng
// =====================================================

/**
 * "loading" | "empty" (tháng chưa có đơn) | "ready" (đã có đơn)
 */
export function renderMonthOrderState(state, month) {
    byId("orderLoadingState").hidden = state !== "loading";
    byId("noOrderState").hidden = state !== "empty";
    byId("orderWorkspace").hidden = state !== "ready";
    byId("btnAddItem").hidden = state !== "ready";

    byId("orderTitle").textContent = `Tạo đơn hàng tháng ${month}`;
    byId("noOrderTitle").textContent = `Chưa có đơn hàng tháng ${month}`;
    byId("btnCreateMonthOrderText").textContent = `Tạo đơn hàng tháng ${month}`;
    const createMonthText = byId("createMonthText");
    if (createMonthText) createMonthText.textContent = `Tháng ${month}`;
}

// =====================================================
// TRANG THEO DÕI: thống kê
// =====================================================

export function renderTrackingStats() {
    const list = orderPageState.filtered;
    const set = (id, value) => {
        const element = byId(id);
        if (element) element.textContent = value;
    };

    set("statOrderCount", new Set(list.map(item => item.order)).size);
    set("statItemCount", list.length);
    set("statProjectCount", new Set(list.map(item => item.project).filter(Boolean)).size);
    set("statTotalAmount", formatMoney(list.reduce((sum, item) => sum + service.getTotal(item), 0)));
}
