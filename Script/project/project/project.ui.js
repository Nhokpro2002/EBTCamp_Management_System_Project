// Chỉ chứa các sự kiện như việc người dùng click chuột
// * Event -> Call function logic -> render UI
// Chỉ chứa hàm render UI


// ==================================================
// Change user avatar in dropdown
// ==================================================

import * as utils from "../../utils/utils.js";
import { variableGlobal } from "../project.state.js";
import { projectElements } from "../project.state.js";
import * as handleEvent from "./project.handle.event.js";

const POCKETBASE_URL = "http://127.0.0.1:8090";
const COLLECTION_USERS = "users";


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
                <td class="action-cell">
                    <div class="dropdown">
                        <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots"></i>
                        </button>

                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><button class="dropdown-item js-view">View more</button></li>
                        <li><button class="dropdown-item js-edit">Edit</button></li>
                        <li><button class="dropdown-item js-save">Save</button></li>
                        <li><button class="dropdown-item text-danger js-delete">Delete</button></li>
                    </ul>
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
    // ! Error
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




