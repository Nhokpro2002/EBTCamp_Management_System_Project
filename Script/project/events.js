import * as service from "./service.js";
import * as ui from "./ui.js";
import * as utils from "../utils/utils.js";

import { projectState as state } from "./state.js";
import { projectPageMessage } from "./messages.js";

// =========================
// BIND EVENTS
// =========================
export function bindEvents() {
    // ---------- Pagination ----------
    $(document).on("click", ".js-page", function () {
        const page = Number($(this).data("page"));
        if (!page || page < 1) return;

        handlePageChange(page);
    });

    // ---------- Project card actions ----------
    document.addEventListener("click", handleProjectCardClick);

    // ---------- Create project popup ----------
    $(".btn-create-project").on("click", () =>
        ui.openCreateProjectPopup(Object.values(state.userMap))
    );
    $(".btn-close-project-popup").on("click", ui.closeCreateProjectPopup);
    $(".btn-save-project").on("click", handleSubmitFormCreateProject);
}

// =========================
// RENDER
// =========================
export function renderPage() {
    ui.renderProjectPage(state);
}

// =========================
// PAGINATION
// =========================
function handlePageChange(page) {
    const totalPages = Math.ceil(state.filteredProjects.length / state.pageSize);

    if (page < 1 || page > totalPages) return;

    state.currentPage = page;
    renderPage();
}

// =========================
// PROJECT CARD ACTIONS
// =========================
function handleProjectCardClick(e) {
    const viewMoreItem = e.target.closest(".btn-view-more-project");
    if (viewMoreItem) {
        const projectID = viewMoreItem.dataset.id;
        if (!projectID) return;

        rememberCurrentProject(projectID);
        window.location.href = `project_items.html?projectID=${projectID}`;
        return;
    }

    const workflowItem = e.target.closest(".btn-view-progress");
    if (workflowItem) {
        const projectID = workflowItem.dataset.id;
        if (!projectID) return;

        rememberCurrentProject(projectID);
        window.location.href = `workflow.html?projectID=${encodeURIComponent(projectID)}`;
    }
}

/**
 * Lưu project đang mở vào localStorage cho các trang khác dùng.
 */
function rememberCurrentProject(projectID) {
    const project = state.projectList.find(
        item => String(item.id) === String(projectID)
    );

    if (project) {
        localStorage.setItem("projectName", project.name);
        localStorage.setItem("currentProjectID", String(project.id));
    }
}

// =========================
// CREATE PROJECT
// =========================
async function handleSubmitFormCreateProject() {
    const formData = ui.getCreateProjectFormData();

    if (!service.isValidProjectForm(formData)) {
        utils.showPopup("Lỗi", projectPageMessage.requiredFields, "error");
        return;
    }

    try {
        const project = await service.createProject(formData);

        state.projectList.push(project);
        state.filteredProjects.push(project);
        state.currentPage = Math.ceil(
            state.filteredProjects.length / state.pageSize
        );

        utils.showSuccess(projectPageMessage.createSuccess);

        renderPage();

    } catch (error) {
        console.error(error);
        utils.showError(projectPageMessage.createFailed);
    }
}
