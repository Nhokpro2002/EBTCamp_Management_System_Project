import * as service from "./service.js";
import * as ui from "./ui.js";

import { inventoryVariable } from "./state.js";


const COLLECTION_ORDER_ITEMS = "Order_Items";
const COLLECTION_ORDERS = "Orders";
const COLLECTION_USERS = "Users";
const POCKETBASE_URL = "http://127.0.0.1:8090";
const COLLECTION_ITEMS = "Items";

function checkAuthentication() {
    const token = localStorage.getItem("token");
    if (!token || token.trim() === "") {
        Swal.fire({
            icon: 'warning',      // icon của popup: 'warning', 'error', 'success', 'info', 'question'
            title: 'Access Denied',
            text: 'You must log in to access this page',
            confirmButtonText: 'Go to Login'
        }).then(() => {
            window.location.href = "http://127.0.0.1:5500/Page/login.html"; // chuyển hướng sau khi user bấm OK
        });

        return false;

        // ngăn chặn load tiếp các script
    }
    return true;
}

$(document).ready(function () {

    if (!checkAuthentication()) return;

    document.querySelector(".container-fluid").style.display = "block";

    // window.alert(window.innerWidth + " x " + window.innerHeight);
    // Spec: 1528 * 732;

    const currentPage = window.location.pathname;

    if (currentPage.includes('dashboard')) {
        document.getElementById('dashboard-link').classList.add('active');
    } else if (currentPage.includes('order')) {
        document.getElementById('order-link').classList.add('active');
    } else if (currentPage.includes('user')) {
        document.getElementById('user-link').classList.add('active');
    } else if (currentPage.includes('setting')) {
        document.getElementById('setting-link').classList.add('active');
    } else if (currentPage.includes('inventory')) {
        document.getElementById('inventory-link').classList.add('active');
    } else if (currentPage.includes('project')) {
        document.getElementById('project-link').classList.add('active');
    }

    ui.changeIconAvatar();

    ui.changeTopbarText();

    service.loadInventoryItemData("Inventory_Items");

    setupActiveMenu();

    ui.renderTable();

});

function setupActiveMenu() {
    const currentPage = window.location.pathname;

    const map = {
        inventory: "inventory-link",
        project: "project-link",
        user: "user-link"
    };

    Object.entries(map).forEach(([key, id]) => {
        if (currentPage.includes(key)) {
            document.getElementById(id)?.classList.add("active");
        }
    });
}

/*const products = [
    {
        image: "https://picsum.photos/60?1",
        name: "Laptop Pro 14",
        model: "ThinkPad X1",
        code: "LP001",
        brand: "Lenovo",
        type: "Laptop",
        stock: 45
    },
];*/


const pageInfo = document.getElementById("pageInfo");
const pagination = document.getElementById("pagination");

pagination.querySelectorAll(".page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        service.changePage(Number(btn.dataset.page));
    });
});
