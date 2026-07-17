import * as api from "../services/generic.api.js";
import * as ui from "./ui.js";
import * as utils from "../utils/utils.js";

const COLLECTION_INVENTORY_ITEMS = "Inventory_Items";

import { inventoryItemPageMessage } from "./inventory_items_page_message.js"
import { inventoryVariable } from "./state.js";

export async function changePage(page) {
    if (page < 1 || page > inventoryVariable.totalPages)
        return;
    inventoryVariable.currentInventoryPage = page;
    await loadInventoryItemData("Inventory_Items");
    const start = (inventoryVariable.currentInventoryPage - 1) * inventoryVariable.pageSize;
    const end = start + inventoryVariable.pageSize;
    inventoryVariable.inventoryItemFiltered = inventoryVariable.inventoryItemFull.slice(start, end);
    ui.renderTable(inventoryVariable.inventoryItemFiltered);
}

export async function loadInventoryItemData(collection) {
    try {
        const response = await api.getRecords(collection);
        if (response) {
            inventoryVariable.inventoryItemFull = response;
            return response;
        }

    } catch (error) {
        console.log(error);
    }
}

export async function saveItem(data) {
    try {
        const response = await api.createRecord(COLLECTION_INVENTORY_ITEMS, data);
        if (response) {
            utils.showSuccess(inventoryItemPageMessage.saveSuccess);
        }
    } catch (error) {
        console.log(error);
        utils.showError(inventoryItemPageMessage.saveFailed);
    }
}

