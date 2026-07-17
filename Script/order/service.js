import { orderPageData } from "./state.js";
import { message } from "./message.js";
import * as api from "../services/generic.api.js"
import * as utils from "../utils/utils.js";

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
        utils.showSuccess(message.saveSuccess);
    } catch (error) {
        console.log(error);
        utils.showSuccess(message.saveFailed);
    }
}