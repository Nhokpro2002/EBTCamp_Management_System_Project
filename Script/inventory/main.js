import * as service from "./service.js";
import * as ui from "./ui.js";

import { inventoryVariable } from "./state.js";


// ==============================
// CONSTANT
// ==============================

const COLLECTION_ITEMS = "Inventory_Items";


// ==============================
// DOM ELEMENT
// ==============================

const pagination = document.getElementById("pagination");
const searchInput = document.getElementById("searchInput");


// ==============================
// INIT PAGE
// ==============================

$(document).ready(async function () {

    if (!checkAuthentication()) return;

    initLayout();

    //ui.changeIconAvatar();
    //ui.changeTopbarText();

    setupActiveMenu();

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
                window.location.href =
                    "http://127.0.0.1:5500/Page/login.html";

            });
        return false;
    }


    return true;
}



// ==============================
// PAGE SETUP
// ==============================
function initLayout() {
    document.querySelector(".container-fluid").style.display = "block";
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


searchInput.addEventListener("input", () => {
    inventoryVariable.searchKeyword =
        searchInput.value.toLowerCase().trim();
    applyFilter();
});

const brandFilter = document.getElementById("brandFilter");
brandFilter.addEventListener("change", () => {
    inventoryVariable.selectedBrand = brandFilter.value;
    applyFilter();
});

const typeFilter = document.getElementById("typeFilter");
typeFilter.addEventListener("change", () => {
    inventoryVariable.selectedType = typeFilter.value;
    applyFilter();
});


// ==============================
// PAGINATION
// ==============================
pagination.addEventListener(
    "click",
    (e) => {
        const btn =
            e.target.closest(".page-btn");
        if (!btn) return;
        service.changePage(
            Number(btn.dataset.page)
        );
    });

// ==============================
// MENU ACTIVE
// ==============================
function setupActiveMenu() {
    const currentPage = window.location.pathname;
    const map = {
        inventory: "inventory-link",
        project: "project-link",
        user: "user-link",
        orders: "orders-link"
    };

    Object.entries(map)
        .forEach(([key, id]) => {
            if (currentPage.includes(key)) {
                document.getElementById(id)?.classList.add("active");
            }
        });
}


function applyFilter() {
    inventoryVariable.inventoryItemFiltered =
        inventoryVariable.inventoryItemFull.filter(item => {
            const matchSearch =
                inventoryVariable.searchKeyword == "" ||
                item.name.toLowerCase().includes(inventoryVariable.searchKeyword) ||
                item.model.toLowerCase().includes(inventoryVariable.searchKeyword);

            const matchBrand =
                inventoryVariable.selectedBrand == "" ||
                item.brand == inventoryVariable.selectedBrand;

            const matchType =
                inventoryVariable.selectedType == "" ||
                item.type == inventoryVariable.selectedType;

            return matchSearch && matchBrand && matchType;
        });

    inventoryVariable.currentInventoryPage = 1;

    ui.renderTable(
        inventoryVariable.inventoryItemFiltered.slice(
            0,
            inventoryVariable.pageSize
        )
    );
}