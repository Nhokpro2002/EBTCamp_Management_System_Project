import * as api from "../services/generic.api.js";
import * as ui from "./ui.js";

import { inventoryVariable } from "./state.js";

export async function changePage(page) {
    if (page < 1 || page > inventoryVariable.totalPages)
        return;
    inventoryVariable.currentInventoryPage = page;
    await loadInventoryItemData("Inventory_Items", page);
    ui.renderTable();
}

export async function loadInventoryItemData(collection) {
    try {

        const response = await api.loadInventoryItemEachPage(collection);
        if (response) {
            console.log(response);
        }
        //inventoryVariable.inventoryItemList = 

    } catch (error) {
        console.log(error);
    }

}

