import { orderPageData } from "./state.js";
import * as api from "../services/generic.api.js"

const COLLECTION_ORDER = "Orders";

export async function loadOrderList() {
    try {
        const result = await api.getRecords(COLLECTION_ORDER);
        orderPageData.orderList = result;
    } catch (error) {
        console.log(error);
    }
}

export async function createOrder(data) {
    try {
        const result = await api.createRecord(COLLECTION_ORDER, data);
        orderPageData.orderList.push(result);
    } catch (error) {
        console.log(error);
    }
}