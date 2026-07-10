import { inventoryVariable } from "./state.js";

const POCKETBASE_URL = "http://127.0.0.1:8090";
const COLLECTION_USERS = "Users";

const tbody = document.getElementById("inventoryTable");


export function changeIconAvatar() {
    const dropdownAvatar = document.querySelector('.dropdown img');
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!dropdownAvatar || !userData) return;
    dropdownAvatar.src =
        `${POCKETBASE_URL}/api/files/${COLLECTION_USERS}/${userData.id}/${userData.avatar}?t=${Date.now()}`;
}

export function changeTopbarText() {
    const topbarText = document.querySelector('.topbar .text-muted');
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!topbarText || !userData) return;
    topbarText.textContent = `Welcome back, ${userData.employee_id} 👋`;
}

export function renderTable(filteredList) {
    tbody.innerHTML = "";
    filteredList.forEach(item => {
        let stockClass = "high";
        if (item.stock < 10)
            stockClass = "low";
        else if (item.stock < 30)
            stockClass = "medium";

        const imageUrl = `http://127.0.0.1:8090/api/files/Inventory_Items/${item.id}/${item.image}`;

        tbody.innerHTML += `
        <tr style="font-size:14px">
            <td>
                <img src="${imageUrl}" class="product-img" alt="${item.name}">
            </td>

            <td><div class="product-name">${item.name}</div></td>

            <td>${item.model}</td>
            <td>${item.code}</td>
            <td>${item.brand}</td>
            <td>${item.type}</td>

            <td>
                <span class="stock ${stockClass}">${item.stock}</span>
            </td>

            <td>
                <button class="action-btn">
                    <i class="bi bi-three-dots-vertical"></i>
                </button>
            </td>
        </tr>
        `;
    });

    renderPagination();
}


export function renderPagination() {
    pagination.innerHTML = "";

    // Previous
    pagination.innerHTML += `
    <li class="page-item ${inventoryVariable.currentInventoryPage === 1 ? "disabled" : ""}">
        <button class="page-link page-btn" data-page="${inventoryVariable.currentInventoryPage - 1}">
            <i class="bi bi-chevron-left"></i>
        </button>
    </li>
    `;

    // Các nút số trang
    for (let i = 1; i <= inventoryVariable.totalPages; i++) {
        pagination.innerHTML += `
        <li class="page-item ${inventoryVariable.currentInventoryPage === i ? "active" : ""}">
            <button class="page-link page-btn" data-page="${i}">
                ${i}
            </button> 
        </li>
        `;
    }

    // Next
    pagination.innerHTML += `
    <li class="page-item ${inventoryVariable.currentInventoryPage === inventoryVariable.totalPages ? "disabled" : ""}">
        <button class="page-link page-btn" data-page="${inventoryVariable.currentInventoryPage + 1}">
            <i class="bi bi-chevron-right"></i>
        </button>
    </li>
    `;
}

