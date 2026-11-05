import * as ui from "./ui.js";
import * as service from "./service.js";
import * as utils from "../utils/utils.js";

import { orderDetailPageData } from "./state.js";
import { orderPageMessage } from "./message.js";

export function initOrderItemEvents() {
    const searchInput = document.getElementById("searchInput");
    searchInput?.addEventListener("input", () => {
        orderDetailPageData.searchKeyword = searchInput.value.trim().toLowerCase();
        ui.applyFilter();
    });

    const brandFilter = document.getElementById("brandFilter");
    brandFilter?.addEventListener("change", () => {
        orderDetailPageData.selectedBrand = brandFilter.value;
        ui.applyFilter();
    });

    const typeFilter = document.getElementById("typeFilter");
    typeFilter?.addEventListener("change", () => {
        orderDetailPageData.selectedType = typeFilter.value;
        ui.applyFilter();
    });

    document.getElementById("exportExcelSelected")?.addEventListener("click", () => {
        service.exportExcel();
    });

    document.getElementById("saveSelected")?.addEventListener("click", async () => {
        const projectID = document.getElementById("projectFilter")?.value;
        const selectedItems = ui.getSelectedItems();

        if (!selectedItems.length) {
            utils.showWarning(orderPageMessage.noItemsSelected);
            return;
        }
        if (!projectID) {
            utils.showWarning(orderPageMessage.projectNotSelected);
            return;
        }
        await service.saveOrderItem(selectedItems, projectID);
        if (document.getElementById("projectFilter")?.value === projectID) {
            document.getElementById("projectFilter").dispatchEvent(new Event("change"));
        }
    });

    document.getElementById("deleteSelected")?.addEventListener("click", async () => {
        const projectID = document.getElementById("projectFilter")?.value;
        const selectedItems = ui.getSelectedItems();
        if (!selectedItems.length) {
            utils.showWarning(orderPageMessage.noItemsSelected);
            return;
        }
        if (!projectID) {
            utils.showWarning(orderPageMessage.projectNotSelected);
            return;
        }

        const confirmation = await Swal.fire({
            icon: "warning",
            title: "Xóa các dòng đã chọn?",
            text: orderPageMessage.deleteConfirm,
            showCancelButton: true,
            confirmButtonText: "Delete",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#dc2626"
        });
        if (!confirmation.isConfirmed) return;

        await service.deleteOrderItem(selectedItems, projectID);
        if (document.getElementById("projectFilter")?.value === projectID) {
            document.getElementById("projectFilter").dispatchEvent(new Event("change"));
        }
    });
}
