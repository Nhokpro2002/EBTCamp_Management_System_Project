// =====================================================
// SỰ KIỆN TRANG TẠO ĐƠN HÀNG (order.html)
// =====================================================
import * as ui from "./ui.js";
import * as service from "./service.js";
import * as utils from "../utils/utils.js";

import { orderPageState } from "./state.js";
import { orderPageMessage } from "./message.js";

const NUMBER_FIELDS = new Set(["order_quantity", "unit_price"]);

export function initEvents({ onCreateMonthOrder }) {
    initFilterEvents();
    initTableEvents();
    initActionEvents();
    initAddItemEvents();

    document.getElementById("btnCreateMonthOrder").addEventListener("click", onCreateMonthOrder);
}

// =====================================================
// BỘ LỌC: dự án, tên sản phẩm, QCode/XCode
// =====================================================

export function applyFilters() {
    orderPageState.currentPage = 1;
    service.filterItems();
    ui.renderTable();
}

/**
 * Gắn sự kiện cho các ô lọc có trên trang (dùng chung với trang Theo dõi).
 * @param {Function} onChange - gọi sau khi lọc lại
 */
export function bindFilterInputs(onChange = applyFilters) {
    const filters = orderPageState.filters;
    const normalizeText = value => value.trim().toLowerCase();
    const inputs = [
        ["projectFilter", "change", "project", value => value],
        ["monthFilter", "change", "order", value => value],
        ["nameFilter", "input", "name", normalizeText],
        ["codeFilter", "input", "code", normalizeText]
    ];

    inputs.forEach(([id, event, key, transform]) => {
        const element = document.getElementById(id);
        element?.addEventListener(event, () => {
            filters[key] = transform(element.value);
            onChange();
        });
    });

    document.getElementById("resetFilters")?.addEventListener("click", () => {
        Object.assign(filters, { order: "", project: "", name: "", code: "" });
        inputs.forEach(([id]) => {
            const element = document.getElementById(id);
            if (element) element.value = "";
        });
        onChange();
    });

    document.getElementById("pagination").addEventListener("click", event => {
        const button = event.target.closest("[data-page]");
        if (!button) return;
        orderPageState.currentPage = Number(button.dataset.page);
        ui.renderTable();
    });
}

function initFilterEvents() {
    bindFilterInputs();
}

// =====================================================
// BẢNG: sửa trực tiếp, chọn dòng
// =====================================================

function initTableEvents() {
    const tbody = document.getElementById("orderTable");

    // Sửa ô nào → ghi ngay vào state (chuyển trang / lọc không mất), đánh dấu "chưa lưu"
    const onFieldEdit = event => {
        const input = event.target.closest(".order-field");
        if (!input) return;

        const row = input.closest("tr");
        const item = service.findItem(row.dataset.id);
        if (!item) return;

        const field = input.dataset.field;
        item[field] = NUMBER_FIELDS.has(field)
            ? (input.value === "" ? "" : Number(input.value))
            : input.value;
        item._dirty = true;
        ui.refreshRow(row, item);
        ui.renderGrandTotal();

        // Sửa dòng nào thì tự tick dòng đó để bấm Lưu luôn
        const checkbox = row.querySelector(".row-checkbox");
        if (!checkbox.checked) {
            checkbox.checked = true;
            ui.updateSelectionState();
        }
    };
    tbody.addEventListener("input", onFieldEdit);
    tbody.addEventListener("change", event => {
        if (event.target.matches(".row-checkbox")) {
            ui.updateSelectionState();
            return;
        }
        onFieldEdit(event);
    });

    // Bấm vào chỗ trống trên dòng cũng chọn / bỏ chọn dòng đó
    tbody.addEventListener("click", event => {
        if (event.target.closest("input, select, button, a, textarea, label")) return;
        const checkbox = event.target.closest("tr")?.querySelector(".row-checkbox");
        if (!checkbox) return;
        checkbox.checked = !checkbox.checked;
        ui.updateSelectionState();
    });

    document.getElementById("checkAll").addEventListener("change", event => {
        ui.setAllRowsChecked(event.target.checked);
    });

    document.getElementById("btnClearSelection").addEventListener("click", () => {
        ui.setAllRowsChecked(false);
    });
}

// =====================================================
// THANH THAO TÁC: Lưu / Xuất Excel / Xóa
// =====================================================

function getSelectedItems() {
    return ui.getSelectedIDs().map(service.findItem).filter(Boolean);
}

function initActionEvents() {
    document.getElementById("saveSelected").addEventListener("click", async () => {
        const items = getSelectedItems();
        if (!items.length) {
            utils.showWarning(orderPageMessage.noItemsSelected);
            return;
        }
        if (!items.every(service.isValidItem)) {
            utils.showWarning(orderPageMessage.invalidRow);
            return;
        }

        ui.setActionsBusy(true, "saveSelected");
        try {
            const { failed } = await service.saveItems(items);
            if (failed) utils.showError(orderPageMessage.saveItemFailed);
            else utils.showSuccess(orderPageMessage.saveItemSuccess);
        } finally {
            ui.setActionsBusy(false);
            // Có thể đổi dự án → lọc lại
            service.filterItems();
            ui.renderTable();
        }
    });

    document.getElementById("exportExcelSelected").addEventListener("click", async () => {
        const items = getSelectedItems();
        if (!items.length) {
            utils.showWarning(orderPageMessage.noItemsSelected);
            return;
        }

        ui.setActionsBusy(true, "exportExcelSelected");
        try {
            await service.exportExcel(items, `don-hang-thang-${orderPageState.monthOrder?.month ?? ""}`);
        } catch (error) {
            console.error("Failed to export order items.", error);
            utils.showError(window.ExcelJS ? orderPageMessage.exportFailed : orderPageMessage.exportNotReady);
        } finally {
            ui.setActionsBusy(false);
        }
    });

    document.getElementById("deleteSelected").addEventListener("click", async () => {
        const ids = ui.getSelectedIDs();
        if (!ids.length) {
            utils.showWarning(orderPageMessage.noItemsSelected);
            return;
        }

        const confirmation = await Swal.fire({
            icon: "warning",
            title: `Xóa ${ids.length} vật tư khỏi đơn?`,
            text: orderPageMessage.deleteConfirm,
            showCancelButton: true,
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy",
            confirmButtonColor: "#dc2626"
        });
        if (!confirmation.isConfirmed) return;

        ui.setActionsBusy(true, "deleteSelected");
        try {
            const { failed } = await service.deleteItems(ids);
            if (failed) utils.showError(orderPageMessage.deleteFailed);
            else utils.showSuccess(orderPageMessage.deleteItemSuccess);
        } finally {
            ui.setActionsBusy(false);
            service.filterItems();
            ui.renderTable();
        }
    });
}

// =====================================================
// THÊM VẬT TƯ VÀO ĐƠN (modal)
// =====================================================

function todayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function findInventoryByLabel(label) {
    const text = label.trim();
    if (!text) return null;
    return orderPageState.inventory.find(item => ui.getInventoryLabel(item) === text) ||
        // Gõ đúng mã code cũng nhận
        orderPageState.inventory.find(item => item.code && item.code.toLowerCase() === text.toLowerCase()) ||
        null;
}

function initAddItemEvents() {
    const modalElement = document.getElementById("createOrderModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    const form = document.getElementById("createOrderForm");
    const field = id => document.getElementById(id);

    const updateTotal = () => {
        const total = (Number(field("createQuantity").value) || 0) * (Number(field("createUnitPrice").value) || 0);
        field("createTotal").textContent = ui.formatMoney(total);
    };

    const updateItemInfo = () => {
        const item = findInventoryByLabel(field("createItem").value);
        field("createItem").classList.remove("is-invalid");
        field("createItemInfo").textContent = item
            ? `${item.description || "Không có mô tả"} · Tồn kho: ${Number(item.stock) || 0}`
            : "Chọn một vật tư có sẵn trong kho.";
    };

    field("btnAddItem").addEventListener("click", () => {
        if (!orderPageState.monthOrder) return;

        form.reset();
        form.querySelectorAll(".is-invalid").forEach(element => element.classList.remove("is-invalid"));

        // Mặc định: dự án đang lọc, người đang đăng nhập, hôm nay
        field("createProject").value = orderPageState.filters.project;
        const currentUserID = service.getCurrentUserID();
        if (orderPageState.users.some(user => user.id === currentUserID)) {
            field("createRequester").value = currentUserID;
        }
        field("createRequestDate").value = todayISO();
        updateItemInfo();
        updateTotal();
        modal.show();
    });

    modalElement.addEventListener("shown.bs.modal", () => field("createItem").focus());
    field("createItem").addEventListener("input", updateItemInfo);
    field("createQuantity").addEventListener("input", updateTotal);
    field("createUnitPrice").addEventListener("input", updateTotal);

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const data = {
            item: findInventoryByLabel(field("createItem").value),
            project: field("createProject").value,
            order_quantity: Number(field("createQuantity").value),
            unit_price: Number(field("createUnitPrice").value),
            requester: field("createRequester").value,
            request_date: field("createRequestDate").value
        };

        const checks = [
            [!data.item, "createItem", orderPageMessage.createItemRequired],
            [!data.project, "createProject", orderPageMessage.createProjectRequired],
            [!(data.order_quantity > 0), "createQuantity", orderPageMessage.createQuantityInvalid],
            [!(data.unit_price >= 0) || field("createUnitPrice").value === "", "createUnitPrice", orderPageMessage.createPriceInvalid],
            [!data.requester, "createRequester", orderPageMessage.createRequesterRequired],
            [!data.request_date, "createRequestDate", orderPageMessage.createDateRequired]
        ];
        form.querySelectorAll(".is-invalid").forEach(element => element.classList.remove("is-invalid"));
        const failedChecks = checks.filter(([failed]) => failed);
        if (failedChecks.length) {
            failedChecks.forEach(([, id]) => field(id).classList.add("is-invalid"));
            utils.showWarning(failedChecks[0][2]);
            return;
        }

        if (service.findDuplicateItem(data)) {
            const confirmation = await Swal.fire({
                icon: "question",
                title: "Vật tư đã có trong đơn",
                text: `Đơn hàng tháng này đã có "${data.item.name}" cho dự án này. Vẫn thêm dòng mới?`,
                showCancelButton: true,
                confirmButtonText: "Vẫn thêm",
                cancelButtonText: "Hủy"
            });
            if (!confirmation.isConfirmed) return;
        }

        const submitButton = field("createOrderSubmit");
        submitButton.disabled = true;
        try {
            await service.addItem(data);
            utils.showSuccess(orderPageMessage.addItemSuccess);
            modal.hide();
            service.filterItems();
            ui.renderTable();
        } catch (error) {
            console.error("Failed to add order item.", error);
            utils.showError(orderPageMessage.addItemFailed);
        } finally {
            submitButton.disabled = false;
        }
    });
}
