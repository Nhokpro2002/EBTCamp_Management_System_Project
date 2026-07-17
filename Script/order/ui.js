import { orderPageData } from "./state.js";
import * as utils from "../utils/utils.js";

export function renderOrderList() {
    const tbody = document.querySelector("#orderListTable");

    if (!tbody) return;

    tbody.innerHTML = "";

    const html = orderPageData.orderList.map((order, index) => `
        <tr data-id="${order.id}">
            <td>${index + 1}</td>

            <td>
                <span class="fw-semibold">
                    ${order.id}
                </span>
            </td>

            <td>
                ${utils.formatDateDisplay(order.createdDate)}
            </td>

            <td>
                <div class="d-flex justify-content-center gap-2">
                    <button
                        class="btn btn-sm btn-outline-primary btn-detail"
                        data-id="${order.id}">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </button>

                    <button
                        class="btn btn-sm btn-outline-danger btn-delete"
                        data-id="${order.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.insertAdjacentHTML("beforeend", html);
}

