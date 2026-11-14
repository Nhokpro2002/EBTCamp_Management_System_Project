import * as api from "../services/generic.api.js";
import * as utils from "../utils/utils.js";

import { orderPageState } from "./state.js";

const COLLECTION_ORDERS = "Orders";
const COLLECTION_ORDER_ITEMS = "Order_Items";
const COLLECTION_USERS = "Users";
const COLLECTION_PROJECTS = "Projects";
const COLLECTION_INVENTORY_ITEMS = "Inventory_Items";

// Các field của Order_Items được sửa trên bảng (tháng đi theo đơn hàng, không sửa)
const EDITABLE_FIELDS = ["order_quantity", "unit_price", "requester", "request_date", "project"];

export function getCurrentMonth() {
    return new Date().getMonth() + 1;
}

// =====================================================
// LOAD
// =====================================================

export async function loadReferenceData() {
    const [users, projects, inventory] = await Promise.all([
        api.getAllRecords(COLLECTION_USERS, { sort: "employee_name" }),
        api.getAllRecords(COLLECTION_PROJECTS, { sort: "name" }),
        api.getAllRecords(COLLECTION_INVENTORY_ITEMS, { sort: "name" })
    ]);
    orderPageState.users = users;
    orderPageState.projects = projects;
    orderPageState.inventory = inventory;
}

/**
 * Đơn hàng (Orders) của một tháng, chưa có thì trả về null.
 */
export async function findMonthOrder(month) {
    const records = await api.getAllRecords(COLLECTION_ORDERS, {
        filter: `month = ${Number(month)}`,
        sort: "created"
    });
    return records[0] || null;
}

/**
 * Tạo đơn hàng cho tháng (mỗi tháng chỉ 1 đơn: đã có thì dùng lại đơn cũ).
 */
export async function createMonthOrder(month) {
    const existing = await findMonthOrder(month);
    if (existing) return existing;
    return api.createRecord(COLLECTION_ORDERS, { month: Number(month) });
}

/**
 * Tất cả đơn hàng, tháng mới nhất trước.
 */
export async function loadMonthOrders() {
    const orders = await api.getAllRecords(COLLECTION_ORDERS, { sort: "-month,-created" });
    orderPageState.monthOrders = orders;
    return orders;
}

/**
 * Vật tư của 1 đơn hàng (orderID) hoặc của mọi đơn hàng (không truyền orderID).
 */
export async function loadItems(orderID = "") {
    const items = await api.getAllRecords(COLLECTION_ORDER_ITEMS, {
        filter: orderID ? `order = ${api.quoteFilterValue(orderID)}` : `order != ""`,
        expand: "requester,project,order",
        sort: "-request_date,-created"
    });
    orderPageState.items = items.map(normalizeItem);
    return orderPageState.items;
}

/**
 * Chuẩn hóa bản ghi từ PocketBase để UI dùng trực tiếp.
 * request_date: "2026-11-04 00:00:00.000Z" → "2026-11-04"
 */
function normalizeItem(record) {
    return {
        ...record,
        month: Number(record.month) || Number(record.expand?.order?.month) || "",
        order_quantity: Number(record.order_quantity) || 0,
        unit_price: Number(record.unit_price) || 0,
        request_date: String(record.request_date || "").slice(0, 10),
        _dirty: false
    };
}

// =====================================================
// TÍNH TOÁN / TRA CỨU
// =====================================================

export function getTotal(item) {
    return (Number(item.order_quantity) || 0) * (Number(item.unit_price) || 0);
}

export function getRequesterName(item) {
    const user = orderPageState.users.find(entry => entry.id === item.requester) ||
        item.expand?.requester;
    return user?.employee_name || user?.email || "";
}

export function getProjectName(item) {
    const project = orderPageState.projects.find(entry => entry.id === item.project) ||
        item.expand?.project;
    return project?.name || "";
}

export function findItem(id) {
    return orderPageState.items.find(item => item.id === id);
}

export function getCurrentUserID() {
    try {
        return JSON.parse(sessionStorage.getItem("user"))?.id || "";
    } catch {
        return "";
    }
}

export function isValidItem(item) {
    return Number(item.order_quantity) >= 0 && Number(item.unit_price) >= 0;
}

// =====================================================
// LỌC
// =====================================================

export function filterItems() {
    const { order, project, name, code } = orderPageState.filters;

    orderPageState.filtered = orderPageState.items.filter(item =>
        (!order || item.order === order) &&
        (!project || item.project === project) &&
        (!name || String(item.name || "").toLowerCase().includes(name)) &&
        (!code || String(item.code || "").toLowerCase().includes(code))
    );
    return orderPageState.filtered;
}

// =====================================================
// SAVE / ADD / DELETE (trang Tạo đơn hàng)
// =====================================================

function pickEditableData(item) {
    const data = {};
    EDITABLE_FIELDS.forEach(field => {
        data[field] = item[field];
    });
    data.order_quantity = Number(item.order_quantity) || 0;
    data.unit_price = Number(item.unit_price) || 0;
    return data;
}

/**
 * Lưu các vật tư đã chọn. Bản ghi lưu thành công được cập nhật lại trong state.
 * @returns {Promise<{ saved: number, failed: number }>}
 */
export async function saveItems(items) {
    const results = await Promise.allSettled(items.map(item =>
        api.updateRecord(COLLECTION_ORDER_ITEMS, item.id, pickEditableData(item))
    ));

    let failed = 0;
    results.forEach((result, index) => {
        if (result.status === "fulfilled") {
            Object.assign(items[index], normalizeItem({ ...items[index], ...result.value }));
        } else {
            failed += 1;
            console.error("Không lưu được vật tư trong đơn.", items[index].id, result.reason);
        }
    });
    return { saved: items.length - failed, failed };
}

/**
 * Thêm 1 vật tư (từ kho) vào đơn hàng của tháng đang làm việc.
 */
export async function addItem({ item, project, order_quantity, unit_price, requester, request_date }) {
    const monthOrder = orderPageState.monthOrder;
    const record = await api.createRecord(COLLECTION_ORDER_ITEMS, {
        order: monthOrder.id,
        month: Number(monthOrder.month),
        name: item.name || "",
        code: item.code || "",
        description: item.description || "",
        order_quantity,
        unit_price,
        requester,
        request_date,
        project
    });
    const newItem = normalizeItem(record);
    orderPageState.items.unshift(newItem);
    return newItem;
}

/**
 * @returns {Promise<{ deleted: number, failed: number }>}
 */
export async function deleteItems(ids) {
    const results = await Promise.allSettled(
        ids.map(id => api.deleteRecord(COLLECTION_ORDER_ITEMS, id))
    );

    const deletedIDs = new Set(ids.filter((_, index) => results[index].status === "fulfilled"));
    orderPageState.items = orderPageState.items.filter(item => !deletedIDs.has(item.id));
    return { deleted: deletedIDs.size, failed: ids.length - deletedIDs.size };
}

/**
 * Đơn hàng đang làm việc đã có vật tư này (cùng code + tên) cho dự án này chưa?
 */
export function findDuplicateItem({ item, project }) {
    return orderPageState.items.find(entry =>
        entry.project === project &&
        String(entry.code || "") === String(item.code || "") &&
        String(entry.name || "") === String(item.name || "")
    );
}

// =====================================================
// EXCEL
// =====================================================

export async function exportExcel(items, fileName = "don-hang") {
    if (!window.ExcelJS) {
        throw new Error("ExcelJS not loaded");
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Đơn hàng");

    sheet.columns = [
        { header: "Tên sản phẩm", key: "name", width: 28 },
        { header: "Tháng", key: "month", width: 8 },
        { header: "QCode/XCode", key: "code", width: 18 },
        { header: "Mô tả", key: "description", width: 36 },
        { header: "Số lượng", key: "order_quantity", width: 10 },
        { header: "Đơn giá", key: "unit_price", width: 14 },
        { header: "Tổng", key: "total", width: 16 },
        { header: "Người yêu cầu", key: "requester", width: 24 },
        { header: "Ngày yêu cầu", key: "request_date", width: 14 },
        { header: "Dự án", key: "project", width: 28 }
    ];

    items.forEach(item => {
        sheet.addRow({
            name: item.name,
            month: Number(item.month) || "",
            code: item.code,
            description: item.description,
            order_quantity: Number(item.order_quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            total: getTotal(item),
            requester: getRequesterName(item),
            // File Excel: ngày dạng dd/mm/yyyy (database vẫn lưu yyyy-mm-dd)
            request_date: utils.formatDateDisplay(item.request_date),
            project: getProjectName(item)
        });
    });

    ["unit_price", "total"].forEach(key => {
        sheet.getColumn(key).numFmt = "#,##0";
    });

    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.alignment = { horizontal: "center", vertical: "middle" };

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

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
