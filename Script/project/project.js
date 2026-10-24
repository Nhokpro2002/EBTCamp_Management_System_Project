// =========================
// IMPORTS
// =========================
import { variableGlobal, projectElements } from "./project.state.js";
import { projectPageMessage } from "./project_page_message.js";

import * as api from "../services/generic.api.js";
import * as ui from "./project.ui.js";
import * as handlerEvent from "./project.handle.event.js";
import * as utils from "../utils/utils.js";

// =========================
// CONSTANTS
// =========================
const COLLECTION_PROJECTS = "Projects";
const COLLECTION_USERS = "Users";

// =========================
// DOM INIT
// =========================
projectElements.projectGrid = document.getElementById("projectGrid");
projectElements.emptyState = document.getElementById("emptyState");
projectElements.pagination = document.getElementById("pagination");

// =========================
// INIT APP
// =========================
$(document).ready(function () {
    if (!checkAuthentication()) return;

    initProjectPage();
});

// =========================
// AUTH
// =========================
function checkAuthentication() {
    const token = localStorage.getItem("token");

    if (!token || !token.trim()) {
        utils.showPopup("Warning", "You must login", "warning")
            .then(() => {
                window.location.href = "http://127.0.0.1:5500/Page/login.html";
            });

        return false;
    }

    return true;
}

// =========================
// INIT DATA
// =========================
async function initProjectPage() {
    try {
        const [projects, users] = await Promise.all([
            api.getRecords(COLLECTION_PROJECTS),
            api.getRecords(COLLECTION_USERS)
        ]);

        variableGlobal.projectList = projects;

        variableGlobal.userMap = Object.fromEntries(
            users.map(user => [user.id, user])
        );

        variableGlobal.filteredProjects = [...projects];

        ui.renderProjectPage();

    } catch (error) {
        console.error(error);
        utils.showError(projectPageMessage.loadError);
    }
}

// =========================
// PAGINATION
// =========================
$(document).on("click", ".js-page", function () {
    const page = Number($(this).data("page"));
    if (!page || page < 1) return;

    ui.handlePageChange(page);
});

// =========================
// GLOBAL CLICK HANDLER (PROJECT ACTIONS)
// =========================
document.addEventListener("click", function (e) {
    const viewMoreItem = e.target.closest(".btn-view-more-project");
    const workflowItem = e.target.closest(".btn-view-progress");

    // =========================
    // VIEW MORE
    // =========================
    if (viewMoreItem) {
        const projectID = viewMoreItem.dataset.id;
        if (!projectID) return;

        // Tìm project theo id
        const project = variableGlobal.projectList.find(
            item => String(item.id) === String(projectID)
        );

        // Lưu tên project vào localStorage
        if (project) {
            localStorage.setItem("projectName", project.name);
        }

        window.location.href = `project_items.html?projectID=${projectID}`;
        return;
    }

    // =========================
    // PROJECT WORKFLOW
    // =========================
    if (workflowItem) {
        const projectID = workflowItem.dataset.id;
        if (!projectID) return;

        // Tìm project theo id
        const project = variableGlobal.projectList.find(
            item => String(item.id) === String(projectID)
        );

        // Lưu tên project vào localStorage
        if (project) {
            localStorage.setItem("projectName", project.name);
        }

        window.location.href = `workflow.html?projectID=${encodeURIComponent(projectID)}`;
        return;
    }

});

// =========================
// UI BUTTON EVENTS
// =========================
$(".btn-create-project").on("click", ui.openCreateProjectPopup);
$(".btn-close-project-popup").on("click", ui.closeCreateProjectPopup);
$(".btn-save-project").on("click", handlerEvent.handleSubmitFormCreateProject);