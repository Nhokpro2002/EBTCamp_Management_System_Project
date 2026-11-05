import * as utils from "../utils/utils.js";
import * as api from "../services/generic.api.js";
import * as ui from "./ui.js";

import { orderPageMessage } from "./message.js";
import { orderDetailPageData } from "./state.js";

const COLLECTION_ORDER_ITEMS = "Order_Items";
const COLLECTION_USERS = "Users";
const COLLECTION_PROJECTS = "Projects";

export async function loadOrderItemList(projectID) {
    return api.getRecordsFilter(COLLECTION_ORDER_ITEMS, "project", projectID);
}

export async function loadUserList() {
    const result = await api.getRecords(COLLECTION_USERS);
    orderDetailPageData.userList = result;
    return result;
}

export async function saveOrderItem(orderItemList, projectID) {
    if (!orderItemList.length || !projectID) return false;

    try {
        const results = await Promise.allSettled(orderItemList.map(item => {
            const { id, ...data } = item;
            return id
                ? api.updateRecord(COLLECTION_ORDER_ITEMS, id, data)
                : api.createRecord(COLLECTION_ORDER_ITEMS, data);
        }));

        if (results.some(result => result.status === "rejected")) {
            utils.showError(orderPageMessage.saveItemFailed);
            return false;
        }
        utils.showSuccess(orderPageMessage.saveItemSuccess);
        return true;
    } catch (error) {
        console.error("Failed to save order items.", error);
        utils.showError(orderPageMessage.saveItemFailed);
        return false;
    }
}

export async function deleteOrderItem(orderItemList, projectID) {
    if (!orderItemList.length || !projectID) return false;

    try {
        const persistedItems = orderItemList.filter(item => item.id);
        const results = await Promise.allSettled(
            persistedItems.map(item =>
                api.deleteRecord(COLLECTION_ORDER_ITEMS, item.id)
            )
        );

        if (results.some(result => result.status === "rejected")) {
            utils.showError(orderPageMessage.deleteFailed);
            return false;
        }
        utils.showSuccess(orderPageMessage.deleteItemSuccess);
        return true;
    } catch (error) {
        console.error("Failed to delete order items.", error);
        utils.showError(orderPageMessage.deleteFailed);
        return false;
    }
}

export async function exportExcel() {
    const data = ui.getSelectedItems();
    if (!data.length) {
        utils.showWarning(orderPageMessage.noItemsSelected);
        return;
    }

    if (!window.ExcelJS) {
        utils.showError("Chưa thể xuất Excel. Vui lòng tải lại trang.");
        return;
    }

    const projectFilter = document.getElementById("projectFilter");
    const projectName = projectFilter.selectedOptions[0]?.textContent || "";
    const requesterMap = new Map(
        orderDetailPageData.userList.map(user => [user.id, user.employee_name])
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Đặt hàng");

    sheet.columns = [
        { header: "Tên vật tư", key: "name", width: 24 },
        { header: "Model", key: "model", width: 20 },
        { header: "XCode/QCode", key: "code", width: 20 },
        { header: "Dự án", key: "project", width: 28 },
        { header: "Tồn kho", key: "stock", width: 12 },
        { header: "SL đặt", key: "order_quantity", width: 12 },
        { header: "Đơn giá", key: "unit_price", width: 16 },
        { header: "Ngày yêu cầu", key: "request_date", width: 18 },
        { header: "Người yêu cầu", key: "requester", width: 24 }
    ];

    data.forEach(item => {
        sheet.addRow({
            ...item,
            project: projectName,
            // File Excel: ngày dạng dd/mm/yyyy (database vẫn lưu yyyy-mm-dd)
            request_date: utils.formatDateDisplay(item.request_date),
            requester: requesterMap.get(item.requester) || ""
        });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = {
        horizontal: "center",
        vertical: "middle"
    };

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

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "order.xlsx";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        console.error("Failed to export order items.", error);
        utils.showError("Không thể xuất Excel các dòng đã chọn.");
    }
}

export async function loadProjectList() {
    const result = await api.getRecords(COLLECTION_PROJECTS);
    orderDetailPageData.projectList = result;

    const projectFilter = document.getElementById("projectFilter");
    projectFilter.replaceChildren(new Option("Chọn dự án", ""));

    result.forEach(project => {
        projectFilter.add(new Option(project.name || "Dự án chưa đặt tên", project.id));
    });
}
