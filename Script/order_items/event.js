import * as ui from "./ui.js";
import { orderDetailPageData } from "./state.js";


export function handleAddItemToProjectItems(itemID) {
    const item = orderDetailPageData.inventoryItemList.find(x => x.id === itemID);
    if (!item) {
        alert("itemNotExist");
        //utils.showError(projectItemPageMessage.itemNotExistInDB);
        return;
    }

    if (orderDetailPageData.orderItemList.some(x => x.id === itemID)) {
        alert("itemExistOnProjectItem");
        //utils.showError(projectItemPageMessage.itemExistOnProjectItem);
        return;
    }
    const newItem = { ...item };
    delete newItem.id;
    orderDetailPageData.orderItemList.push(item);
    ui.processDropItem(newItem);
}

export function initOrderItemEvents() {
    const tbody = document.getElementById("orderTable");

    if (!tbody) return;

    tbody.addEventListener("input", (event) => {
        const target = event.target;
        // Chỉ xử lý khi thay đổi order hoặc unit price
        if (
            !target.classList.contains("order-input") &&
            !target.classList.contains("unit-price-input")
        ) {
            return;
        }

        const row = target.closest("tr");

        const order =
            Number(
                row.querySelector(".order-input").value
            ) || 0;

        const unitPrice =
            Number(
                row.querySelector(".unit-price-input").value
            ) || 0;

        const totalPrice = order * unitPrice;

        row.querySelector(".total-price")
            .textContent =
            totalPrice.toLocaleString();

    });
}