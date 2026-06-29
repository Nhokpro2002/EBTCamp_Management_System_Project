// Chỉ chứa các sự kiện như việc người dùng click chuột
// * Event -> Call function logic -> render UI
// Chỉ chứa hàm render UI


// ==================================================
// Change user avatar in dropdown
// ==================================================

import * as utils from "../../utils/utils.js";
import * as handleEvent from "./project.handle.event.js";
import * as api from "../../services/generic.api.js";
import { messageCommon } from "../project.state.js";
import { variableGlobal } from "../project.state.js";
import { projectElements } from "../project.state.js";

const POCKETBASE_URL = "http://127.0.0.1:8090";
const COLLECTION_USERS = "Users";
const COLLECTION_PROJECTS = "Projects"
const COLLECTION_PROJECT_ITEMS = "Project_Items"
const COLLECTION_INVENTORY_ITEMS = "Inventory_Items";


export function changeIconAvatar() {

    const $dropdownAvatar = $(".dropdown img");
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!$dropdownAvatar.length || !userData) return;

    const avatarUrl =
        `${POCKETBASE_URL}/api/files/users/${userData.id}/${userData.avatar}?t=${Date.now()}`;


    $dropdownAvatar.attr("src", avatarUrl);
}

// ==================================================
// Change topbar welcome text
// ==================================================
export function changeTopbarText() {

    const $topbarText = $(".topbar .text-muted");
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!$topbarText.length || !userData) return;


    $topbarText.text(
        `Welcome back, ${userData.employee_id} 👋`
    );
}

// ==================================================
// Render project option list
// ==================================================

export function getStats(data) {
    return {
        total: data.length,
        inProgress: data.filter(p => p.status === "In Progress").length,
        completed: data.filter(p => p.status === "Completed").length,
        onHold: data.filter(p => p.status === "On Hold").length
    };
}

export function renderStats(data, container) {
    const stats = getStats(data);

    const statItems = [
        {
            label: "Total Projects",
            value: stats.total,
            dotClass: "dot-blue"
        },
        {
            label: "In Progress",
            value: stats.inProgress,
            dotClass: "dot-blue"
        },
        {
            label: "Completed",
            value: stats.completed,
            dotClass: "dot-green"
        },
        {
            label: "On Hold",
            value: stats.onHold,
            dotClass: "dot-orange"
        }
    ];

    container.innerHTML = statItems.map(item => `
            <div class="col-md-6 col-xl-3">
                <div class="stat-card">
                    <div class="stat-top">
                        <span class="stat-dot ${item.dotClass}"></span>
                        <span>${item.label}</span>
                    </div>
                    <div class="stat-value">${item.value}</div>
                </div>
            </div>
        `).join("");
}

export function renderTable(data, currentPage, pageSize, tableBody, tableInfo) {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = data.slice(start, end);

    if (!pageData.length) {
        tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5 text-muted fw-semibold">
                        No projects found.
                    </td>
                </tr>
            `;
        tableInfo.textContent = "Showing 0 to 0 of 0 projects";
        return;
    }

    tableBody.innerHTML = pageData.map(project => `
            <tr>
                <td>
                    <div class="project-name">${project.name}</div>
                </td>
                <td><span class="date-text">${utils.formatDateDisplay(project.start_date)}</span></td>
                <td><span class="date-text">${utils.formatDateDisplay(project.end_date)}</span></td>
                <td class="progress-cell">
                    <div class="progress-percent">${project.progress}%</div>
                    <div class="custom-progress">
                        <div
                            class="progress-bar ${getProgressBarClass(project.status)}"
                            style="width: ${project.progress}%"
                        ></div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${getStatusClass(project.status)}">
                        ${project.status}
                    </span>
                </td>
                <td class="action-cell position-relative">

  <button type="button" class="btn btn-sm btn-light border js-menu-toggle">
    <i class="bi bi-three-dots"></i>
  </button>

  <div class="action-menu">
    <div class="action-item btn-view-more-project text-primary" data-id=${project.id}>
      <i class="bi bi-eye me-2"></i> View more
    </div>

    <div class="action-item btn-edit-project text-warning" data-id=${project.id}>
      <i class="bi bi-pencil-square me-2"></i> Edit
    </div>

    <div class="action-item btn-delete-project text-danger" data-id=${project.id}>
      <i class="bi bi-trash me-2"></i> Delete
    </div>
  </div>

</td>
            </tr>
        `).join("");

    const from = start + 1;
    const to = Math.min(end, data.length);
    tableInfo.textContent = `Showing ${from} to ${to} of ${data.length} projects`;
}

export function renderPagination(totalItems, currentPage, pageSize, paginationContainer) {

    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalPages <= 1) {
        paginationContainer.innerHTML = "";
        return;
    }

    let html = `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <button class="page-link js-page" data-page="${currentPage - 1}">
                <i class="bi bi-chevron-left"></i>
            </button>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <button class="page-link js-page" data-page="${i}">
                    ${i}
                </button>
            </li>
        `;
    }

    html += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <button class="page-link js-page" data-page="${currentPage + 1}">
                <i class="bi bi-chevron-right"></i>
            </button>
        </li>
    `;

    paginationContainer.innerHTML = html;
}

export function handlePageChange(page) {
    const totalPages = Math.ceil(variableGlobal.filteredProjects.length / variableGlobal.pageSize);

    if (page < 1 || page > totalPages) return;

    variableGlobal.currentPage = page;
    renderProjectPage();
}

export function renderProjectPage() {
    renderStats(variableGlobal.filteredProjects, projectElements.statsContainer);
    renderTable(
        variableGlobal.filteredProjects,
        variableGlobal.currentPage,
        variableGlobal.pageSize,
        projectElements.projectTableBody,
        projectElements.tableInfo
    );
    renderPagination(
        variableGlobal.filteredProjects.length,
        variableGlobal.currentPage,
        variableGlobal.pageSize,
        projectElements.pagination
    );
}


export function getProgressBarClass(status) {
    if (status === "Completed") return "progress-green";
    if (status === "On Hold") return "progress-orange";
    if (status === "Not Started") return "progress-red";
    return "progress-blue";
}

export function getStatusClass(status) {
    switch (status) {
        case "In Progress":
            return "status-in-progress";
        case "Completed":
            return "status-completed";
        case "On Hold":
            return "status-on-hold";
        case "Not Started":
            return "status-not-started";
        default:
            return "";
    }
}

export function openCreateProjectPopup() {
    document.getElementById("overlay-create-project").style.display = "flex";
    document.body.style.overflow = "hidden";
    renderMembersSelect("pic");
    renderMembersSelect("members");
}

export function closeCreateProjectPopup() {
    document.getElementById("overlay-create-project").style.display = "none";
    document.body.style.overflow = "auto";
    resetCreateProjectForm();
}

function resetCreateProjectForm() {
    $("#project-name, #start-date, #end-date").val("");
    $("#pic, #members").empty();
    variableGlobal.tomSelectInstances?.pic?.clear(true);
    variableGlobal.tomSelectInstances?.members?.clear(true);
}

function renderMembersSelect(type) {  // type: "pic", "members", "handler"

    const $select = $(`#${type}`);
    if (!$select.length) return;

    // Xoá option cũ
    $select.empty();

    // Thêm option từ userMap
    Object.values(variableGlobal.userMap).forEach(user => {
        const $option = $("<option>", {
            value: user.id,
            text: user.employee_id
        });

        $select.append($option);
    });

    // Nếu chưa có instance TomSelect thì tạo mới
    if (!variableGlobal.tomSelectInstances[type]) {

        variableGlobal.tomSelectInstances[type] = new TomSelect(`#${type}`, {
            plugins: ['remove_button'],
            hideSelected: true,
            create: false,
            placeholder:
                type === "pic" ? "Select PIC" :
                    type === "members" ? "Select Members" :
                        "Select Handler",
        });

    } else {

        // Nếu đã có instance thì refresh options
        const instance = variableGlobal.tomSelectInstances[type];

        instance.clearOptions();

        Object.values(variableGlobal.userMap).forEach(user => {
            instance.addOption({
                value: user.id,
                text: user.employee_id
            });
        });

        instance.refreshOptions(false);
    }
}

export function enableProjectEditMode(tr, projectID) {
    if (!tr) return;

    // tránh enable nhiều lần
    if (tr.classList.contains("editing")) return;
    tr.classList.add("editing");

    const nameTd = tr.querySelector(".project-name").closest("td");
    const startTd = tr.querySelectorAll("td")[1];
    const endTd = tr.querySelectorAll("td")[2];
    const progressTd = tr.querySelector(".progress-cell");
    const statusTd = tr.querySelectorAll("td")[4];

    const name = tr.querySelector(".project-name").innerText;
    const start = tr.querySelectorAll(".date-text")[0].innerText;
    const end = tr.querySelectorAll(".date-text")[1].innerText;
    const progress = tr.querySelector(".progress-percent").innerText.replace("%", "");
    const status = tr.querySelector(".status-badge").innerText.trim();

    // =========================
    // NAME INPUT
    // =========================
    nameTd.innerHTML = `
    <input class="form-control form-control-sm js-edit-name" value="${name}">
  `;

    // =========================
    // START DATE
    // =========================
    startTd.innerHTML = `
    <input type="date" class="form-control form-control-sm js-edit-start" value="${(start)}">
  `;

    // =========================
    // END DATE
    // =========================
    endTd.innerHTML = `
    <input type="date" class="form-control form-control-sm js-edit-end" value="${(end)}">
  `;

    // =========================
    // PROGRESS
    // =========================
    progressTd.innerHTML = `
    <input type="number" min="0" max="100"
      class="form-control form-control-sm js-edit-progress"
      value="${progress}">
  `;

    // =========================
    // STATUS
    // =========================
    statusTd.innerHTML = `
    <select class="form-select form-select-sm js-edit-status">
      <option value="Not Started" ${status == "Not Started" ? "selected" : ""}>Not Started</option>
      <option value="In Progress" ${status == "In Progress" ? "selected" : ""}>In Progress</option>
      <option value="On Hold" ${status == "On Hold" ? "selected" : ""}>On Hold</option>
      <option value="Completed" ${status == "Completed" ? "selected" : ""}>Completed</option>
    </select>
  `;

}


export async function disableProjectEditMode(tr, projectID) {
    if (!tr) return;

    try {
        // =========================
        // 1. KHÔNG THAY ĐỔI
        // =========================
        const hasChanges = hasProjectChanged(tr);
        if (!hasChanges) {
            renderProjectPage();
            return;
        }

        // =========================
        // 2. CÓ THAY ĐỔI → CALL API UPDATE
        // =========================
        const updatedData = buildProjectUpdatePayload(tr);
        const response = await api.updateRecord(
            COLLECTION_PROJECTS,
            projectID,
            updatedData
        );

        if (response) {
            // update trong DATA GỐC
            variableGlobal.projectList = variableGlobal.projectList.map(project =>
                project.id === projectID ? response : project
            );
            variableGlobal.filteredProjects = variableGlobal.filteredProjects.map(project =>
                project.id === projectID ? response : project
            );
            renderProjectPage();
            utils.showSuccess(messageCommon.success.updateSuccess);
        }
    } catch (error) {
        utils.showError(messageCommon.error.updateError);
    }
}


function hasProjectChanged(tr) {
    if (!tr) return false;

    const original = {
        name: tr.querySelector(".project-name")?.innerText?.trim(),
        start: tr.querySelectorAll(".date-text")[0]?.innerText?.trim(),
        end: tr.querySelectorAll(".date-text")[1]?.innerText?.trim(),
        progress: tr.querySelector(".progress-percent")?.innerText?.replace("%", "").trim(),
        status: tr.querySelector(".status-badge")?.innerText?.trim(),
    };

    const current = {
        name: tr.querySelector(".js-edit-name")?.value?.trim(),
        start: tr.querySelector(".js-edit-start")?.value?.trim(),
        end: tr.querySelector(".js-edit-end")?.value?.trim(),
        progress: tr.querySelector(".js-edit-progress")?.value?.trim(),
        status: tr.querySelector(".js-edit-status")?.value?.trim(),
    };

    return JSON.stringify(original) !== JSON.stringify(current);
}

function buildProjectUpdatePayload(tr) {
    if (!tr) return null;

    return {
        name: tr.querySelector(".js-edit-name")?.value?.trim(),
        start_date: tr.querySelector(".js-edit-start")?.value?.trim(),
        end_date: tr.querySelector(".js-edit-end")?.value?.trim(),
        progress: Number(tr.querySelector(".js-edit-progress")?.value || 0),
        status: tr.querySelector(".js-edit-status")?.value?.trim(),
    };
}

export async function renderInventory() {
    try {
        const response = await api.getRecords(COLLECTION_INVENTORY_ITEMS);
        if (!response) return;
        variableGlobal.inventoryItems = response || [];
        const $inventory = $("#inventory-list");
        $inventory.empty();
        $.each(variableGlobal.inventoryItems, function (_, item) {
            $inventory.append(`
                <div class="inventory-item" data-id="${item.id}">
                    <div class="inventory-info">
                        <strong>${item.name}</strong>
                        <div>${item.model ?? ""}</div>
                    </div>
                </div>
            `);
        });
    } catch (error) {
        console.error(error);
        utils.showError(messageCommon.error.getError);
    }
}

export async function renderProjectTable(projectID) {
    const token = localStorage.getItem("token");
    try {
        const response = await api.getRecordsFilter(COLLECTION_PROJECT_ITEMS, "project", projectID);
        if (response) {
            variableGlobal.projectItemList = response;
            const tbody = $("#project-item-body");
            tbody.empty();
            let total = 0;
            variableGlobal.projectItemList.forEach(item => {
                const money = item.purchase_quantity * item.unit_price;
                total += money;
                tbody.append(`
        <tr>
            <td>${item.name}</td>
            <td>${item.model}</td>
            <td>${item.code}</td>
            <td>06/2026</td>
            <td class="text-center" style="min-width: 150px;>
                ${item.required}
            </td>
            <td class="text-center" style="width: 150px;>
                <span class="badge badge-stock">
                    ${item.stock}
                </span>
            </td>
            <td class="text-center" style="width: 150px;>
                <span class="badge badge-order">
                    ${Math.max(item.required - item.stock, 0)}
                </span>
            </td>
            <td class="text-end">
                $ ${item.price.toLocaleString()} 
            </td>
            <td class="text-end">
                $ ${money.toLocaleString()} 
            </td>
            <td>Nguyen Van A</td>
            <td>28/06/2026</td>
            <td>
                <button class="btn btn-sm btn-outline-danger">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
        `);
            });
            $("#lbl-total-item").text(projectItems.length);
            $("#lbl-total-cost").text(total.toLocaleString() + " ₫");

        }
    } catch (error) {
        utils.showError(messageCommon.error.getError);
    }

}




