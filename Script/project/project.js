// =========================
// IMPORTS
// =========================
import { variableGlobal, projectElements, messageCommon } from "./project.state.js";

import * as api from "/../services/generic.api.js";
import * as ui from "./project.ui.js";
import * as handlerEvent from "./project.handle.event.js";
import * as utils from "/../utils/utils.js";

// =========================
// CONSTANTS
// =========================
const COLLECTION_PROJECTS = "Projects";
const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_USERS = "Users";

// =========================
// DOM INIT
// =========================
projectElements.statsContainer = document.getElementById("statsContainer");
projectElements.projectTableBody = document.getElementById("projectTableBody");
projectElements.pagination = document.getElementById("pagination");
projectElements.tableInfo = document.getElementById("tableInfo");
projectElements.searchInput = document.getElementById("searchInput");
projectElements.statusFilter = document.getElementById("statusFilter");

// =========================
// INIT APP
// =========================
$(document).ready(function () {
    if (!checkAuthentication()) return;

    showApp();
    setupActiveMenu();

    ui.changeIconAvatar();
    ui.changeTopbarText();

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
// UI BOOTSTRAP HELPERS
// =========================
function showApp() {
    document.querySelector(".container-fluid").style.display = "block";
}

function setupActiveMenu() {
    const currentPage = window.location.pathname;

    const map = {
        dashboard: "dashboard-link",
        user: "user-link",
        stage: "stage-link",
        task: "task-link",
        project: "project-link"
    };

    Object.entries(map).forEach(([key, id]) => {
        if (currentPage.includes(key)) {
            document.getElementById(id)?.classList.add("active");
        }
    });
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

        bindProjectEvents();
        ui.renderProjectPage();

    } catch (error) {
        console.error(error);
        utils.showError(messageCommon.error.getError);
    }
}

// =========================
// EVENTS BINDING
// =========================
function bindProjectEvents() {
    projectElements.searchInput?.addEventListener("input", handlerEvent.handleFilterChange);
    projectElements.statusFilter?.addEventListener("change", handlerEvent.handleFilterChange);
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
// GLOBAL CLICK HANDLER (MENU + ACTIONS)
// =========================
document.addEventListener("click", function (e) {
    const toggleBtn = e.target.closest(".js-menu-toggle");
    const menu = e.target.closest(".action-menu");
    const editItem = e.target.closest(".btn-edit-project");
    const viewMoreItem = e.target.closest(".btn-view-more-project");
    const deleteItem = e.target.closest(".btn-delete-project");

    const openMenus = document.querySelectorAll(".action-menu.show");

    // =========================
    // TOGGLE MENU
    // =========================
    if (toggleBtn) {
        const row = toggleBtn.closest("tr");
        const currentMenu = row.querySelector(".action-menu");

        openMenus.forEach(m => {
            if (m !== currentMenu) m.classList.remove("show");
        });

        currentMenu.classList.toggle("show");
        return;
    }

    // =========================
    // VIEW MORE
    // =========================
    if (viewMoreItem) {
        window.location.href = `project_items.html?projectID=${viewMoreItem.dataset.id}`;
        return;
    }

    // =========================
    // EDIT
    // =========================
    if (editItem) {
        const row = editItem.closest("tr");
        row.querySelector(".action-menu")?.classList.add("show");

        handlerEvent.handleEditProject(e, editItem);
        return;
    }

    // =========================
    // DELETE
    // =========================
    if (deleteItem) {
        handlerEvent.handleDeleteProject(deleteItem);
        return;
    }

    // =========================
    // CLICK INSIDE MENU (IGNORE)
    // =========================
    if (menu) return;

    // =========================
    // CLICK OUTSIDE → CLOSE ALL
    // =========================
    openMenus.forEach(m => m.classList.remove("show"));
});

// =========================
// UI BUTTON EVENTS
// =========================
$(".btn-create-project").on("click", ui.openCreateProjectPopup);
$(".btn-close-project-popup").on("click", ui.closeCreateProjectPopup);
$(".btn-save-project").on("click", handlerEvent.handleSubmitFormCreateProject);