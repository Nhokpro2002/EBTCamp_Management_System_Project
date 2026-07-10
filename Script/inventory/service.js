import * as api from "../services/generic.api.js";
import * as ui from "./ui.js";

import { inventoryVariable } from "./state.js";

export async function changePage(page) {
    console.log(page);
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

