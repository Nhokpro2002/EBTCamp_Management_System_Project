import * as service from "./service.js";
import * as ui from "./ui.js";
import * as event from "./event.js";

import { inventoryVariable } from "./state.js";


// ==============================
// CONSTANT
// ==============================
const COLLECTION_ITEMS = "Inventory_Items";


// ==============================
// INIT PAGE
// ==============================

$(document).ready(async function () {

    if (!checkAuthentication()) return;

    event.initEvent();

    await loadInventory();
});


// ==============================
// AUTHENTICATION
// ==============================
function checkAuthentication() {

    const token = localStorage.getItem("token");


    if (!token || token.trim() === "") {
        Swal.fire({
            icon: "warning",
            title: "Access Denied",
            text: "You must log in to access this page",
            confirmButtonText: "Go to Login"
        })
            .then(() => {
                // Đường dẫn tương đối: chạy được ở cả máy test lẫn server thật
                window.location.href = "login.html";

            });
        return false;
    }

    return true;
}

// ==============================
// LOAD DATA
// ==============================
async function loadInventory() {
    const response =
        await service.loadInventoryItemData(
            COLLECTION_ITEMS
        );

    /*
        Lưu data gốc
        Không thay đổi biến này khi search/filter
    */
    inventoryVariable.inventoryItemFull = response;

    inventoryVariable.totalPages = response.totalPages;

    inventoryVariable.totalPages = Math.ceil(
        inventoryVariable.inventoryItemFull.length / inventoryVariable.pageSize
    );

    inventoryVariable.currentInventoryPage = 1;

    renderCurrentPage();
    ui.renderMaterialCodeOptions(inventoryVariable.inventoryItemFull);
}


// ==============================
// RENDER
// ==============================
function renderCurrentPage() {
    const start = (inventoryVariable.currentInventoryPage - 1) * inventoryVariable.pageSize;
    const end = start + inventoryVariable.pageSize;
    inventoryVariable.inventoryItemFiltered =
        inventoryVariable.inventoryItemFull
            .slice(start, end);
    ui.renderTable(inventoryVariable.inventoryItemFiltered);

    ui.renderPagination?.();
}

