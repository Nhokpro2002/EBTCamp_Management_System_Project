import { orderDetailPageData } from "./state.js";
import * as api from "../services/generic.api.js"

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

