import * as utils from "../utils/utils.js";
import * as api from "../services/generic.api.js";
import * as ui from "./ui.js";

import { orderPageMessage } from "./message.js";
import { orderDetailPageData } from "./state.js";

const COLLECTION_INVENTORY_ITEMS = "Inventory_Items";
const COLLECTION_ORDER_ITEMS = "Order_Items";
const COLLECTION_USERS = "Users";
const COLLECTION_PROJECTS = "Projects";



export async function loadInventoryItemList() {
    try {
        const result = await api.getRecords(COLLECTION_INVENTORY_ITEMS);
        orderDetailPageData.inventoryItemList = result;
    } catch (error) {
        console.log(error)
    }
}

export async function loadOrderItemList(orderID) {
    try {
        const result = await api.getRecordsFilter(COLLECTION_ORDER_ITEMS, "order", orderID);
        orderDetailPageData.orderItemList = result;
    } catch (error) {
        console.log(error)
    }
}

export async function loadUserList() {
    try {
        const result = await api.getRecords(COLLECTION_USERS);
        orderDetailPageData.userList = result;
    } catch (error) {
        console.log(error)
    }
}

export async function loadProjectList() {
    try {
        const result = await api.getRecords(COLLECTION_PROJECTS);
        orderDetailPageData.projectList = result;
    } catch (error) {
        console.log(error)
    }
}

export async function saveOrderItem(orderItemList) {
    try {
        const results = await Promise.all(
            orderItemList.map((item) => {
                if (item.id) {
                    return api.updateRecord("Order_Items", item.id, item);
                } else {
                    return api.createRecord("Order_Items", item);
                }
            })
        );

        utils.showSuccess(orderPageMessage.saveItemSuccess);

        return results;
    } catch (error) {
        utils.showError(orderPageMessage.saveItemFailed);
    }
}


export async function deleteOrderItem(orderItemList) {
    try {
        // Xóa những item đã tồn tại trong DB
        const deleteTasks = orderItemList
            .filter(item => item.id)
            .map(item => api.deleteRecord("Order_Items", item.id));

        await Promise.all(deleteTasks);

        // Xóa tất cả row đang được chọn trên UI
        document
            .querySelectorAll(".row-checkbox:checked")
            .forEach(checkbox => {
                checkbox.closest("tr")?.remove();
            });

        utils.showSuccess(orderPageMessage.deleteItemSuccess);

    } catch (error) {
        console.error(error);
        utils.showError(orderPageMessage.deleteFailed);
    }
}


export async function exportExcel() {
    const data = ui.getSelectedItems();

    const projects = orderDetailPageData.projectList;
    const users = orderDetailPageData.userList

    // Convert list sang Map để lookup nhanh
    const projectMap = new Map(
        projects.map(project => [project.id, project.name])
    );

    const requesterMap = new Map(
        users.map(user => [user.id, user.employee_name])
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Order");

    sheet.columns = [
        {
            header: "Name",
            key: "name",
            width: 15
        },
        {
            header: "XCode/QCode",
            key: "model",
            width: 15
        },
        {
            header: "Project",
            key: "project",
            width: 20
        },
        {
            header: "Code",
            key: "code",
            width: 15
        },
        {
            header: "Order",
            key: "order_quantity",
            width: 12
        },
        {
            header: "Unit Price",
            key: "unit_price",
            width: 15
        },
        {
            header: "Total Price",
            key: "total_price",
            width: 18
        },
        {
            header: "Requester",
            key: "requester",
            width: 20
        }
    ];

    // Add data + convert id -> name
    data.forEach(item => {
        sheet.addRow({
            ...item,
            project: projectMap.get(item.project) || "",
            requester: requesterMap.get(item.requester) || "",
            total_price: (item.order_quantity || 0) * (item.unit_price || 0)
        });
    });

    // Auto fit column width
    sheet.columns.forEach(column => {
        let maxLength = 0;

        column.eachCell({ includeEmpty: true }, cell => {
            const value = cell.value ? cell.value.toString() : "";
            maxLength = Math.max(maxLength, value.length);
        });

        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Format header
    const headerRow = sheet.getRow(1);

    headerRow.font = {
        bold: true
    };

    headerRow.alignment = {
        horizontal: "center",
        vertical: "middle"
    };

    // Border
    sheet.eachRow(row => {
        row.eachCell(cell => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        });
    });

    // Export
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
    a.download = "order.xlsx";
    a.click();

    URL.revokeObjectURL(url);
}
