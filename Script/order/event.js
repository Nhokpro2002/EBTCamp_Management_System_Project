import * as service from "./service.js";

export function initOrderEvents() {
    // Save Order Event
    const btnSaveOrder = document.getElementById("btnSaveOrder");
    if (btnSaveOrder) {
        btnSaveOrder.addEventListener("click", async () => {
            const orderDate = document.getElementById("orderDate").value;
            if (!orderDate) {
                Swal.fire({
                    icon: "warning",
                    title: "Please select order date."
                });
                return;
            }

            const data = {
                orderDate: orderDate
            };

            try {
                await service.createOrder(data);
                Swal.fire({
                    icon: "success",
                    title: "Order created."
                });
                newOrderModal.hide();

            } catch (error) {
                Swal.fire({
                    icon: "error",
                    title: "Create order failed."
                });
                console.error(error);
            }
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