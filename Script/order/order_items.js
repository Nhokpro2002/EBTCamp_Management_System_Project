import * as api from "../services/generic.api.js";
import * as utils from "../utils/utils.js";
import { URL_LOCAL } from "../config.js";

const state = {
    inventory: [],
    orders: [],
    users: [],
    projects: [],
    search: "",
    brand: "",
    type: ""
};

const projectFilter = document.getElementById("projectFilter");
const orderTable = document.getElementById("orderTable");
const inventoryList = document.getElementById("inventoryItemList");
let projectLoadVersion = 0;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

async function init() {
    bindEvents();
    renderOrders();

    try {
        const [inventory, users, projects] = await Promise.all([
            api.getRecords("Inventory_Items"),
            api.getRecords("Users"),
            api.getRecords("Projects")
        ]);
        state.inventory = inventory;
        state.users = users;
        state.projects = projects;
        renderProjectOptions();
        renderInventory();
    } catch (error) {
        console.error("Failed to initialize order details.", error);
        utils.showError("Không tải được dữ liệu đặt hàng.");
    }
}

function bindEvents() {
    projectFilter.addEventListener("change", loadProjectOrders);
    document.getElementById("checkAll").addEventListener("change", event => {
        orderTable.querySelectorAll(".row-checkbox").forEach(checkbox => {
            checkbox.checked = event.target.checked;
        });
        updateSelection();
    });
    document.getElementById("searchInput").addEventListener("input", event => {
        state.search = event.target.value.trim().toLowerCase();
        renderInventory();
    });
    document.getElementById("brandFilter").addEventListener("change", event => {
        state.brand = event.target.value;
        renderInventory();
    });
    document.getElementById("typeFilter").addEventListener("change", event => {
        state.type = event.target.value;
        renderInventory();
    });
    document.getElementById("resetFilters").addEventListener("click", () => {
        document.getElementById("searchInput").value = "";
        document.getElementById("brandFilter").value = "";
        document.getElementById("typeFilter").value = "";
        state.search = "";
        state.brand = "";
        state.type = "";
        renderInventory();
    });
    inventoryList.addEventListener("click", event => {
        const button = event.target.closest("[data-add-inventory]");
        if (!button) return;
        addInventoryItem(button.dataset.addInventory);
    });
    orderTable.addEventListener("change", event => {
        if (event.target.matches(".row-checkbox")) updateSelection();
        if (event.target.matches(".order-input, .unit-price-input")) {
            updateRowTotal(event.target.closest("tr"));
        }
    });

    document.getElementById("btnSave").addEventListener("click", saveSelected);
    document.getElementById("btnDelete").addEventListener("click", deleteSelected);
    document.getElementById("btnExport").addEventListener("click", exportSelected);
    document.getElementById("back-project-page-button").addEventListener("click", () => {
        if (window.history.length > 1) window.history.back();
        else window.location.href = "project.html";
    });
}

function renderProjectOptions() {
    projectFilter.replaceChildren(new Option("Chọn dự án", ""));
    state.projects.forEach(project => {
        projectFilter.add(new Option(project.name || "Dự án chưa đặt tên", project.id));
    });

    const params = new URLSearchParams(window.location.search);
    const initialProject = params.get("projectID") || params.get("project");
    if (initialProject && state.projects.some(project => project.id === initialProject)) {
        projectFilter.value = initialProject;
        loadProjectOrders();
    }
}

async function loadProjectOrders() {
    const projectID = projectFilter.value;
    const loadVersion = ++projectLoadVersion;
    setActionButtonsDisabled(true);
    state.orders = [];
    renderOrders();
    renderInventory();
    if (!projectID) return true;

    try {
        const orders = await api.getRecordsFilter("Order_Items", "project", projectID);
        if (loadVersion !== projectLoadVersion) return true;
        state.orders = orders;
        renderOrders();
        return true;
    } catch (error) {
        if (loadVersion !== projectLoadVersion) return true;
        console.error("Failed to load project order items.", error);
        utils.showError("Không tải được danh sách đặt hàng của dự án này.");
        return false;
    }
}

function renderInventory() {
    const items = state.inventory.filter(item => {
        const matchesSearch = !state.search ||
            [item.name, item.model, item.code].some(value =>
                String(value ?? "").toLowerCase().includes(state.search)
            );
        return matchesSearch &&
            (!state.brand || item.brand === state.brand) &&
            (!state.type || item.type === state.type);
    });

    inventoryList.innerHTML = items.length
        ? items.map(item => {
            const imageURL = item.image
                ? `${URL_LOCAL}/api/files/Inventory_Items/${encodeURIComponent(item.id)}/${encodeURIComponent(item.image)}`
                : "";
            return `
                <div class="inventory-item">
                    <div class="d-flex gap-2">
                        ${imageURL ? `<img src="${imageURL}" class="item-image" alt="">` : ""}
                        <div class="flex-grow-1">
                            <h6 title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</h6>
                            <div class="text-muted">${escapeHTML(item.model)}</div>
                        </div>
                        <button class="btn btn-sm btn-outline-primary" type="button" data-add-inventory="${escapeHTML(item.id)}" ${projectFilter.value ? "" : "disabled"} aria-label="Thêm ${escapeHTML(item.name)}">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join("")
        : `<p class="text-muted mb-0">Không có vật tư nào khớp bộ lọc.</p>`;
}

function addInventoryItem(inventoryID) {
    if (!projectFilter.value) {
        utils.showWarning("Hãy chọn dự án trước khi thêm vật tư.");
        return;
    }

    const item = state.inventory.find(inventoryItem => inventoryItem.id === inventoryID);
    if (!item) {
        utils.showError("Vật tư này không còn trong kho.");
        return;
    }

    const duplicate = state.orders.some(order =>
        order.name === item.name && order.model === item.model && order.code === item.code
    );
    if (duplicate) {
        utils.showWarning("Vật tư này đã có trong đơn.");
        return;
    }

    state.orders.push({
        name: item.name,
        model: item.model,
        code: item.code,
        stock: item.stock,
        order_quantity: 0,
        unit_price: 0,
        requester: ""
    });
    renderOrders();
}

function renderOrders() {
    if (!orderTable) return;
    if (!projectFilter.value) {
        orderTable.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Chọn dự án để xem danh sách đặt hàng.</td></tr>`;
        updateSelection();
        return;
    }
    if (!state.orders.length) {
        orderTable.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Dự án này chưa có vật tư đặt hàng.</td></tr>`;
        updateSelection();
        return;
    }

    const projectName = projectFilter.selectedOptions[0]?.textContent || "";
    orderTable.innerHTML = state.orders.map(item => {
        const requesterOptions = state.users.map(user => `
                <option value="${escapeHTML(user.id)}" ${user.id === (item.requester?.id || item.requester) ? "selected" : ""}>
                ${escapeHTML(user.employee_name)}
            </option>
        `).join("");
        return `
            <tr ${item.id ? `data-id="${escapeHTML(item.id)}"` : ""}>
                <td class="text-center"><input type="checkbox" class="form-check-input row-checkbox" aria-label="Chọn ${escapeHTML(item.name)}"></td>
                <td>${escapeHTML(item.name)}</td>
                <td>${escapeHTML(item.model)}</td>
                <td>${escapeHTML(item.code)}</td>
                <td>${escapeHTML(projectName)}</td>
                <td><input type="number" min="0" step="1" class="form-control order-input" value="${Number(item.order_quantity) || 0}" aria-label="Số lượng đặt"></td>
                <td><input type="number" min="0" step="0.01" class="form-control unit-price-input" value="${Number(item.unit_price) || 0}" aria-label="Đơn giá"></td>
                <td class="total-price-cell">${(Number(item.order_quantity) || 0) * (Number(item.unit_price) || 0)}</td>
                <td>
                    <select class="form-select requester-select" aria-label="Người yêu cầu">
                        <option value="">Chọn người yêu cầu</option>
                        ${requesterOptions}
                    </select>
                </td>
            </tr>
        `;
    }).join("");
    updateSelection();
}

function updateRowTotal(row) {
    if (!row) return;
    const quantity = Number(row.querySelector(".order-input").value) || 0;
    const price = Number(row.querySelector(".unit-price-input").value) || 0;
    row.querySelector(".total-price-cell").textContent = String(quantity * price);
}

function getSelectedItems() {
    return [...orderTable.querySelectorAll(".row-checkbox:checked")].map(checkbox => {
        const row = checkbox.closest("tr");
        return {
            ...(row.dataset.id ? { id: row.dataset.id } : {}),
            name: row.children[1].textContent.trim(),
            model: row.children[2].textContent.trim(),
            code: row.children[3].textContent.trim(),
            project: projectFilter.value,
            order_quantity: Number(row.querySelector(".order-input").value) || 0,
            unit_price: Number(row.querySelector(".unit-price-input").value) || 0,
            requester: row.querySelector(".requester-select").value
        };
    });
}

function updateSelection() {
    const checkboxes = [...orderTable.querySelectorAll(".row-checkbox")];
    const selectedCount = checkboxes.filter(checkbox => checkbox.checked).length;
    ["btnSave", "btnDelete", "btnExport"].forEach(id => {
        document.getElementById(id).disabled = selectedCount === 0;
    });

    const checkAll = document.getElementById("checkAll");
    if (checkAll) {
        checkAll.checked = checkboxes.length > 0 && selectedCount === checkboxes.length;
        checkAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
    }
}

function setActionButtonsDisabled(disabled) {
    ["btnSave", "btnDelete", "btnExport"].forEach(id => {
        document.getElementById(id).disabled = disabled;
    });
}

async function saveSelected() {
    const items = getSelectedItems();
    if (!items.length) return;
    try {
        const results = await Promise.allSettled(items.map(item => {
            const { id, ...data } = item;
            return id
                ? api.updateRecord("Order_Items", id, data)
                : api.createRecord("Order_Items", data);
        }));
        const refreshed = await loadProjectOrders();
        if (!refreshed) return;
        if (results.some(result => result.status === "rejected")) {
            utils.showError("Một số dòng không lưu được.");
            return;
        }
        utils.showSuccess("Đã lưu các dòng đã chọn.");
    } catch (error) {
        console.error("Không thể lưu các dòng đã chọn.", error);
        utils.showError("Không thể lưu các dòng đã chọn.");
    }
}

async function deleteSelected() {
    const items = getSelectedItems();
    if (!items.length) return;
    const confirmation = await Swal.fire({
        icon: "warning",
        title: "Xóa các dòng đã chọn?",
        text: `Xóa ${items.length} dòng đã chọn?`,
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626"
    });
    if (!confirmation.isConfirmed) return;

    try {
        const results = await Promise.allSettled(items.filter(item => item.id).map(item =>
            api.deleteRecord("Order_Items", item.id)
        ));
        const refreshed = await loadProjectOrders();
        if (!refreshed) return;
        if (results.some(result => result.status === "rejected")) {
            utils.showError("Một số dòng không xóa được.");
            return;
        }
        utils.showSuccess("Đã xóa các dòng đã chọn.");
    } catch (error) {
        console.error("Không thể xóa các dòng đã chọn.", error);
        utils.showError("Không thể xóa các dòng đã chọn.");
    }
}

async function exportSelected() {
    const items = getSelectedItems();
    if (!items.length) return;
    if (!window.ExcelJS) {
        utils.showError("Chưa thể xuất Excel. Vui lòng tải lại trang.");
        return;
    }

    const requesterNames = new Map(state.users.map(user => [user.id, user.employee_name]));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Đặt hàng");
    sheet.columns = [
        { header: "Tên vật tư", key: "name", width: 24 },
        { header: "Model", key: "model", width: 20 },
        { header: "XCode/QCode", key: "code", width: 20 },
        { header: "Dự án", key: "project", width: 28 },
        { header: "SL đặt", key: "order_quantity", width: 12 },
        { header: "Đơn giá", key: "unit_price", width: 16 },
        { header: "Thành tiền", key: "total", width: 16 },
        { header: "Người yêu cầu", key: "requester", width: 24 }
    ];
    items.forEach(item => sheet.addRow({
        ...item,
        project: projectFilter.selectedOptions[0]?.textContent || "",
        total: item.order_quantity * item.unit_price,
        requester: requesterNames.get(item.requester) || ""
    }));
    sheet.getRow(1).font = { bold: true };

    try {
        const blob = new Blob([await workbook.xlsx.writeBuffer()], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "order.xlsx";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
        console.error("Failed to export order items.", error);
        utils.showError("Không thể xuất Excel các dòng đã chọn.");
    }
}

init();
