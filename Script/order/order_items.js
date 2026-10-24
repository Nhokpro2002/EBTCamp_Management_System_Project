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
        utils.showError("Failed to load order data.");
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
    projectFilter.replaceChildren(new Option("Select Project", ""));
    state.projects.forEach(project => {
        projectFilter.add(new Option(project.name || "Untitled project", project.id));
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
        utils.showError("Failed to load this project's order items.");
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
                        <button class="btn btn-sm btn-outline-primary" type="button" data-add-inventory="${escapeHTML(item.id)}" ${projectFilter.value ? "" : "disabled"} aria-label="Add ${escapeHTML(item.name)}">
                            <i class="bi bi-plus-lg"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join("")
        : `<p class="text-muted mb-0">No materials match the current filters.</p>`;
}

function addInventoryItem(inventoryID) {
    if (!projectFilter.value) {
        utils.showWarning("Select a project before adding materials.");
        return;
    }

    const item = state.inventory.find(inventoryItem => inventoryItem.id === inventoryID);
    if (!item) {
        utils.showError("This material is no longer available in inventory.");
        return;
    }

    const duplicate = state.orders.some(order =>
        order.name === item.name && order.model === item.model && order.code === item.code
    );
    if (duplicate) {
        utils.showWarning("This material is already in the order.");
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
        orderTable.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Select a project to view its order items.</td></tr>`;
        updateSelection();
        return;
    }
    if (!state.orders.length) {
        orderTable.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No order items in this project yet.</td></tr>`;
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
                <td class="text-center"><input type="checkbox" class="form-check-input row-checkbox" aria-label="Select ${escapeHTML(item.name)}"></td>
                <td>${escapeHTML(item.name)}</td>
                <td>${escapeHTML(item.model)}</td>
                <td>${escapeHTML(item.code)}</td>
                <td>${escapeHTML(projectName)}</td>
                <td><input type="number" min="0" step="1" class="form-control order-input" value="${Number(item.order_quantity) || 0}" aria-label="Order quantity"></td>
                <td><input type="number" min="0" step="0.01" class="form-control unit-price-input" value="${Number(item.unit_price) || 0}" aria-label="Unit price"></td>
                <td class="total-price-cell">${(Number(item.order_quantity) || 0) * (Number(item.unit_price) || 0)}</td>
                <td>
                    <select class="form-select requester-select" aria-label="Requester">
                        <option value="">Select requester</option>
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
            utils.showError("Some selected order items could not be saved.");
            return;
        }
        utils.showSuccess("Selected order items saved.");
    } catch (error) {
        console.error("Failed to save selected order items.", error);
        utils.showError("Failed to save selected order items.");
    }
}

async function deleteSelected() {
    const items = getSelectedItems();
    if (!items.length) return;
    const confirmation = await Swal.fire({
        icon: "warning",
        title: "Delete selected items?",
        text: `Delete ${items.length} selected item(s)?`,
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
            utils.showError("Some selected order items could not be deleted.");
            return;
        }
        utils.showSuccess("Selected order items deleted.");
    } catch (error) {
        console.error("Failed to delete selected order items.", error);
        utils.showError("Failed to delete selected order items.");
    }
}

async function exportSelected() {
    const items = getSelectedItems();
    if (!items.length) return;
    if (!window.ExcelJS) {
        utils.showError("Excel export is unavailable. Please reload the page.");
        return;
    }

    const requesterNames = new Map(state.users.map(user => [user.id, user.employee_name]));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Order");
    sheet.columns = [
        { header: "Name", key: "name", width: 24 },
        { header: "Model", key: "model", width: 20 },
        { header: "XCode/QCode", key: "code", width: 20 },
        { header: "Project", key: "project", width: 28 },
        { header: "Order", key: "order_quantity", width: 12 },
        { header: "Unit Price", key: "unit_price", width: 16 },
        { header: "Total Price", key: "total", width: 16 },
        { header: "Requester", key: "requester", width: 24 }
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
        utils.showError("Failed to export selected order items.");
    }
}

init();
