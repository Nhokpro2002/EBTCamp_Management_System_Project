import * as utils from "../utils/utils.js";
import * as ui from "./project_items.ui.js";
import * as api from "../services/generic.api.js";

import { projectItemVariable } from "./project_item_variable.js";
import { projectItemPageMessage } from "./project_item_page_message.js"

const COLLECTION_PROJECT_ITEMS = "Project_Items";

/**
 * Handles adding an inventory item to the project items list.
 *
 * - Finds the item by its ID from the inventory.
 * - Validates that the item exists.
 * - Prevents adding duplicate items.
 * - Creates a copy of the item and passes it to the UI for rendering.
 *
 * @param {number|string} model - The unique identifier of the inventory item to add.
 * @returns {void}
 */
export function handleAddItemToProjectItems(model) {  // Cái này là id của item trong inventory - không phù hợp để đối chiếu

    // trong project item sẽ có những row có id - là những row mà data được lấy từ db => call api update
    // các row không có id là do người dùng thêm mới vào => call api tạo mới
    const item = projectItemVariable.inventoryItemList.find(x => x.model === model);


    if (!item) {
        utils.showError(projectItemPageMessage.itemNotExistInDB);
        return;
    }

    if (projectItemVariable.projectItemList.some(x => x.model === model)) {
        utils.showError(projectItemPageMessage.itemExistOnProjectItem);
        return;
    }

    const newItem = { ...item };

    projectItemVariable.projectItemList.push(item);

    ui.processDropItem(newItem);
}

export async function handleExportExcelProjectItems() {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Project Items");

    const table = document.getElementById("project-items-table");
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");

    const ignoreColumns = ["", "Required", "Stock"];
    const headers = [];
    const exportIndexes = [];

    // Lấy header
    thead.querySelectorAll("th").forEach((th, index) => {

        const title = th.innerText.trim();

        if (!ignoreColumns.includes(title)) {
            headers.push(title);
            exportIndexes.push(index);
        }
    });

    // Thêm header
    worksheet.addRow(headers);

    // Thêm dữ liệu
    tbody.querySelectorAll("tr").forEach(tr => {

        const cells = tr.querySelectorAll("td");

        const rowData = exportIndexes.map(index => {

            const cell = cells[index];
            if (!cell) return "";

            const input = cell.querySelector("input");

            return input
                ? input.value
                : cell.innerText.trim();
        });

        worksheet.addRow(rowData);
    });

    // Style header
    const headerRow = worksheet.getRow(1);

    headerRow.font = {
        bold: true
    };

    headerRow.alignment = {
        horizontal: "center",
        vertical: "middle"
    };

    // Độ rộng cột
    headers.forEach((header, index) => {

        worksheet.getColumn(index + 1).width =
            header === "Description" ? 36 : 22;
    });

    // Download
    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob(
        [buffer],
        {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "Project_Items.xlsx";
    a.click();

    URL.revokeObjectURL(url);
}

function buildDataPayload() {
    const rows = Array.from(document.querySelectorAll("#project-item-body tr"))
        .filter(row => row.querySelector(".row-checkbox")?.checked);

    return rows.map(row => {
        const required_quantity =
            parseFloat(row.querySelector(".js-required")?.value || 0);

        const stock_quantity =
            parseFloat(
                row.querySelector("td:nth-child(7) .badge-stock")?.innerText || 0
            );

        const order_quantity =
            parseFloat(row.querySelector(".js-order")?.innerText || 0);

        const unit_price =
            parseFloat(row.querySelector(".js-unit-price")?.value || 0);

        const total_price =
            parseFloat(
                row.querySelector(".js-total-price")?.innerText.replace(/[^0-9.-]+/g, "") || 0
            );

        return {
            id: row.dataset.id || null,

            name: row.querySelector("td:nth-child(2)")?.innerText.trim() || "",
            model: row.querySelector("td:nth-child(3)")?.innerText.trim() || "",
            code: row.querySelector("td:nth-child(4)")?.innerText.trim() || "",
            description: row.querySelector("td:nth-child(5)")?.innerText.trim() || "",

            required_quantity,
            stock_quantity,
            order_quantity,
            purchase_quantity: Math.max(required_quantity - stock_quantity, 0),

            project: new URLSearchParams(location.search).get("projectID"),

            unit_price,
            total_price,

            request_date: row.querySelector(".js-request-date")?.value || null
        };
    });
}
export async function handleSaveProjectItems() {
    const payload = buildDataPayload();

    try {
        const requests = payload.map(({ id, ...data }) =>
            id
                ? api.updateRecord(COLLECTION_PROJECT_ITEMS, id, data)
                : api.createRecord(COLLECTION_PROJECT_ITEMS, data)
        );

        await Promise.all(requests);

        utils.showSuccess(projectItemPageMessage.updateSuccess);
    } catch (error) {
        utils.showError(projectItemPageMessage.updateFailed);
    }
}

/*
! Error
 */
export async function handleDeleteProjectItems() {
    const rows = Array.from(
        document.querySelectorAll("#project-item-body tr")
    ).filter(row => row.querySelector(".row-checkbox")?.checked);

    if (!rows.length) return;

    try {
        const requests = [];

        rows.forEach(row => {
            const id = row.dataset.id;

            if (id) {
                // Có trong DB -> xóa DB rồi xóa UI
                requests.push(
                    api.deleteRecord(COLLECTION_PROJECT_ITEMS, id)
                        .then(() => row.remove())
                );
            } else {
                // Chưa lưu DB -> chỉ xóa UI
                row.remove();
            }
            enableInventoryItem(row.dataset.model);

        });

        await Promise.all(requests);

        //updateTotalCost();
        ui.updateBulkActionBar();

        const checkAll = document.getElementById("checkAll");
        if (checkAll) checkAll.checked = false;
        ui.updateProjectSummary();

        utils.showSuccess(projectItemPageMessage.deleteSuccess);
    } catch (error) {
        utils.showError(projectItemPageMessage.createFailed);
    }
}

function enableInventoryItem(model) {
    const item = document.querySelector(`#inventory-list [data-model="${model}"]`);

    if (!item) return;

    item.classList.remove("disabled");
    item.setAttribute("data-disabled", "false");
}
