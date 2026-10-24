
import * as utils from "../utils/utils.js";
import * as handleEvent from "./project.handle.event.js";
import * as api from "../services/generic.api.js";
import { URL_LOCAL } from "../config.js";
import { variableGlobal, projectElements } from "./project.state.js";
import { projectPageMessage } from "./project_page_message.js";

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
        `${URL_LOCAL}/api/files/users/${userData.id}/${userData.avatar}?t=${Date.now()}`;

    $dropdownAvatar.attr("src", avatarUrl);
}

// ==================================================
// Render project option list
// ==================================================

/**
 * Render the current page of projects into the project grid.
 *
 * @param {Array} data - Complete project list.
 * @param {number} currentPage - Current page number.
 * @param {number} pageSize - Number of rows per page.
 * @param {HTMLElement} projectGrid - Target project grid.
 * @param {HTMLElement} emptyState - Empty-state element shown when there are no projects.
 */
export function renderProjectCards(data, currentPage, pageSize, projectGrid, emptyState) {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = data.slice(start, end);

    if (!pageData.length) {
        projectGrid.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";
    projectGrid.innerHTML = pageData.map(project => `
        <article class="project-card" data-name="${project.name}">

            <div class="project-image-wrap">
                <img
                    class="project-image"
                    src="${project.image_project
                        ? `${URL_LOCAL}/api/files/Projects/${project.id}/${encodeURIComponent(project.image_project)}`
                        : "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1000&q=85"}"
                    alt="${project.name}"
                    loading="lazy"
                >
            </div>

            <div class="project-body">

                <div class="project-title-row">
                    <div class="project-icon">
                        <i class="bi bi-robot"></i>
                    </div>

                    <div>
                        <h2 class="project-name">${project.name}</h2>
                    </div>
                </div>

                <div class="project-dates">

                    <div class="date-item">
                        <i class="bi bi-calendar3 date-icon"></i>
                        <div>
                            <div class="date-label">Ngày bắt đầu</div>
                            <div class="date-value">
                                ${utils.formatDateDisplay(project.start_date)}
                            </div>
                        </div>
                    </div>

                    <div class="date-item">
                        <i class="bi bi-calendar-check date-icon"></i>
                        <div>
                            <div class="date-label">Ngày kết thúc</div>
                            <div class="date-value">
                                ${utils.formatDateDisplay(project.end_date)}
                            </div>
                        </div>
                    </div>

                </div>

                <div class="project-footer">

                    <button
                        type="button"
                        class="btn-view-progress btn-workflow-project"
                        data-id="${project.id}"
                    >
                        <i class="bi bi-eye"></i>
                        Progress
                    </button>

                    <button
                        type="button"
                        class="btn-view-matherial btn-view-more-project"
                        data-id="${project.id}"
                    >
                        <i class="bi bi-eye"></i>
                        Material
                    </button>

                </div>

            </div>
        </article>
    `).join("");
}

/**
 * Render pagination buttons based on total project count.
 */
export function renderPagination(totalItems, currentPage, pageSize, paginationContainer) {
    if (!paginationContainer) return;

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
 * Render project cards and pagination using current application state.
 */
export function renderProjectPage() {
    renderProjectCards(
        variableGlobal.filteredProjects,
        variableGlobal.currentPage,
        variableGlobal.pageSize,
        projectElements.projectGrid,
        projectElements.emptyState
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
 * Open the Create Project popup and initialize the PIC selector.
 */
export function openCreateProjectPopup() {
    document.getElementById("overlay-create-project").style.display = "flex";
    document.body.style.overflow = "hidden";
    renderPicSelect();
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
    $("#project-name, #start-date, #end-date, #image-project").val("");
    $("#pic").empty();
    variableGlobal.picSelectInstance?.clear(true);
}

/**
 * Render or refresh the TomSelect dropdown for the project PIC.
 */
function renderPicSelect() {

    const $select = $("#pic");
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
    if (!variableGlobal.picSelectInstance) {

        variableGlobal.picSelectInstance = new TomSelect("#pic", {
            plugins: ['remove_button'],
            hideSelected: true,
            create: false,
            placeholder: "Select PIC",
        });

    } else {

        // Nếu đã có instance thì refresh options
        const instance = variableGlobal.picSelectInstance;

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