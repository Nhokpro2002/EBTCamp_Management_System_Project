
import * as utils from "../utils/utils.js";
import * as handleEvent from "./project.handle.event.js";
import * as api from "../services/generic.api.js";
import { variableGlobal, projectElements } from "./project.state.js";
import { projectPageMessage } from "./project_page_message.js";

const POCKETBASE_URL = "http://127.0.0.1:8090";
const COLLECTION_USERS = "Users";
const COLLECTION_PROJECTS = "Projects"

// ==================================================
// User Information
// ==================================================

/**
 * Update the user avatar displayed in the top-right dropdown.
 * Avatar information is retrieved from localStorage.
 */
export function changeIconAvatar() {
    const $dropdownAvatar = $(".dropdown img");
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!$dropdownAvatar.length || !userData) return;

    const avatarUrl =
        `${POCKETBASE_URL}/api/files/users/${userData.id}/${userData.avatar}?t=${Date.now()}`;

    $dropdownAvatar.attr("src", avatarUrl);
}

// ==================================================
// Render project option list
// ==================================================

/**
 * Render the current page of projects into the table body.
 *
 * @param {Array} data - Complete project list.
 * @param {number} currentPage - Current page number.
 * @param {number} pageSize - Number of rows per page.
 * @param {HTMLElement} tableBody - Target table body element.
 */
export function renderTable(data, currentPage, pageSize, tableBody) {
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
                            class="progress-bar ${getProgressBarClass(project.progress)}"
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
      <i class="bi bi-box-seam me-2"></i></i> Materials
    </div>

    <div class="action-item btn-workflow-project text-info" data-id=${project.id}>
      <i class="bi bi-calendar2-range me-2"></i> Workflow
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
}

/**
 * Render pagination buttons based on total project count.
 */
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

/**
 * Change current page and refresh project list.
 */
export function handlePageChange(page) {
    const totalPages = Math.ceil(variableGlobal.filteredProjects.length / variableGlobal.pageSize);

    if (page < 1 || page > totalPages) return;

    variableGlobal.currentPage = page;
    renderProjectPage();
}

/**
 * Render project table and pagination using current application state.
 */
export function renderProjectPage() {
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


// ==================================================
// Project Status Helpers
// ==================================================

/**
 * Return Bootstrap progress bar color class based on project status.
 */
export function getProgressBarClass(progress) {
    if (progress == 100) return "progress-green";
    if (progress > 0 && progress < 100) return "progress-orange";
    return "progress-red";
}
/**
 * Return CSS badge class corresponding to project status.
 */
export function getStatusClass(status) {
    switch (status) {
        case "In Progress":
            return "status-in-progress";
        case "Completed":
            return "status-completed";
        case "Not Started":
            return "status-not-started";
        default:
            return "";
    }
}

// ==================================================
// Create Project Popup
// ==================================================

/**
 * Open the Create Project popup and initialize member selectors.
 */
export function openCreateProjectPopup() {
    document.getElementById("overlay-create-project").style.display = "flex";
    document.body.style.overflow = "hidden";
    renderMembersSelect("pic");
    renderMembersSelect("members");
}

/**
 * Close the Create Project popup and reset all form fields.
 */
export function closeCreateProjectPopup() {
    document.getElementById("overlay-create-project").style.display = "none";
    document.body.style.overflow = "auto";
    resetCreateProjectForm();
}

/**
 * Clear all inputs and selections in the Create Project form.
 */
function resetCreateProjectForm() {
    $("#project-name, #start-date, #end-date").val("");
    $("#pic, #members").empty();
    variableGlobal.tomSelectInstances?.pic?.clear(true);
    variableGlobal.tomSelectInstances?.members?.clear(true);
}

/**
 * Render or refresh the TomSelect dropdown for project members.
 *
 * @param {"pic"|"members"} type
 */
function renderMembersSelect(type) {

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

// ==================================================
// Inline Project Editing
// ==================================================

/**
 * Enable inline editing mode for a project row.
 * Replace display elements with editable form controls.
 */
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

    // NAME INPUT 
    nameTd.innerHTML = `
    <input class="form-control form-control-sm js-edit-name" value="${name}">
  `;

    // START DATE
    startTd.innerHTML = `
    <input type="date" class="form-control form-control-sm js-edit-start" value="${(start)}">
  `;

    // END DATE
    endTd.innerHTML = `
    <input type="date" class="form-control form-control-sm js-edit-end" value="${(end)}">
  `;

    // PROGRESS
    progressTd.innerHTML = `
    <input type="number" min="0" max="100"
      class="form-control form-control-sm js-edit-progress"
      value="${progress}">
  `;
}

/**
 * Exit inline editing mode.
 * Save changes to the server if any field has been modified.
 */
export async function disableProjectEditMode(tr, projectID) {
    if (!tr) return;

    try {
        // 1. KHÔNG THAY ĐỔI
        const hasChanges = hasProjectChanged(tr);
        if (!hasChanges) {
            renderProjectPage();
            return;
        }

        // 2. CÓ THAY ĐỔI → CALL API UPDATE
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
            utils.showSuccess(projectPageMessage.updateSuccess);
        }
    } catch (error) {
        utils.showError(projectPageMessage.updateFailed);
    }
}

/**
 * Compare original row values with current editing values.
 *
 * @returns {boolean} True if any field has changed.
 */
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

/**
 * Build request payload from edited project row.
 *
 * @returns {Object} Project update payload.
 */
function buildProjectUpdatePayload(tr) {
    if (!tr) return null;

    const progress = Number(
        tr.querySelector(".js-edit-progress")?.value || 0
    );

    let status;

    if (progress === 0) {
        status = "Not Started";
    } else if (progress === 100) {
        status = "Completed";
    } else {
        status = "In Progress";
    }

    return {
        name: tr.querySelector(".js-edit-name")?.value?.trim(),
        start_date: tr.querySelector(".js-edit-start")?.value?.trim(),
        end_date: tr.querySelector(".js-edit-end")?.value?.trim(),
        progress,
        status,
    };
}