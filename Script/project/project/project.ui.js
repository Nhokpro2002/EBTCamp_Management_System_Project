// Chỉ chứa các sự kiện như việc người dùng click chuột
// * Event -> Call function logic -> render UI
// Chỉ chứa hàm render UI


// ==================================================
// Change user avatar in dropdown
// ==================================================

import * as utils from "../../utils/utils.js";
import { variableGlobal } from "../project.state.js";

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
    const stats = this.getStats(data);

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
                <td><span class="date-text">${project.startDate}</span></td>
                <td><span class="date-text">${project.endDate}</span></td>
                <td class="progress-cell">
                    <div class="progress-percent">${project.progress}%</div>
                    <div class="custom-progress">
                        <div
                            class="progress-bar ${this.getProgressBarClass(project.status)}"
                            style="width: ${project.progress}%"
                        ></div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${this.getStatusClass(project.status)}">
                        ${project.status}
                    </span>
                </td>
                <td>
                    <div class="action-group">
                        <button class="icon-action" title="View" onclick="ProjectHandler.handleViewProject(${project.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="icon-action" title="More" onclick="ProjectHandler.handleMoreProject(${project.id})">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
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
                <button class="page-link" onclick="ProjectHandler.handlePageChange(${currentPage - 1})">
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
        `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
                <li class="page-item ${i === currentPage ? "active" : ""}">
                    <button class="page-link" onclick="ProjectHandler.handlePageChange(${i})">${i}</button>
                </li>
            `;
    }

    html += `
            <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
                <button class="page-link" onclick="ProjectHandler.handlePageChange(${currentPage + 1})">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `;

    paginationContainer.innerHTML = html;
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




