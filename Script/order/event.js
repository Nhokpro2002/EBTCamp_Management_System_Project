import * as service from "./service.js";
import * as utils from "../utils/utils.js";
import * as ui from "./ui.js";

import { message } from "./message.js";


export function initOrderEvents() {

    // Bootstrap Modal
    const newOrderModal = new bootstrap.Modal(
        document.getElementById("newOrderModal")
    );

    // Open popup
    document
        .getElementById("btnNewOrder")
        .addEventListener("click", () => {
            newOrderModal.show();
        });


    // Save Order Event
    const btnSaveOrder = document.getElementById("btnSaveOrder");
    if (btnSaveOrder) {
        btnSaveOrder.addEventListener("click", async () => {
            const createdDate = document.getElementById("createdDate").value;
            if (!createdDate) {
                utils.showPopup("Warning", message.saveWarning, "warning");
                return;
            }

            const data = {
                createdDate: createdDate
            };


            await service.createOrder(data);
            newOrderModal.hide();
            document.getElementById("createdDate").value = "";
            ui.renderOrderList();

        });
    }

    // Order Detail Event 
    const tbody = document.querySelector("#orderListTable");
    if (tbody) {
        tbody.addEventListener("click", (event) => {
            const btn = event.target.closest(".btn-detail");
            if (!btn) return;
            const orderID = btn.dataset.id;
            console.log("Clicked order:", orderID);
            window.location.href = `order_items.html?orderID=${orderID}`;
        });
    }

}