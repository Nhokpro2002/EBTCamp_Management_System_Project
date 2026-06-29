import { variableGlobal } from "../project.state.js";
import { projectElements } from "../project.state.js";
import { messageCommon } from "../project.state.js";
import * as api from "../../services/generic.api.js";
import * as ui from "./project.ui.js";
import * as handlerEvent from "./project.handle.event.js";
import * as utils from "../../utils/utils.js";

const COLLECTION_PROJECTS = "Projects";
const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_USERS = "Users";

projectElements.statsContainer = document.getElementById("statsContainer");
projectElements.projectTableBody = document.getElementById("projectTableBody");
projectElements.pagination = document.getElementById("pagination");
projectElements.tableInfo = document.getElementById("tableInfo");
projectElements.searchInput = document.getElementById("searchInput");
projectElements.statusFilter = document.getElementById("statusFilter");


$(document).ready(function () {
    if (!checkAuthentication()) return;
    document.querySelector(".container-fluid").style.display = "block";
    // window.alert(window.innerWidth + " x " + window.innerHeight);
    // Spec: 1528 * 732;
    const currentPage = window.location.pathname;
    if (currentPage.includes('dashboard')) {
        document.getElementById('dashboard-link').classList.add('active');
    } else if (currentPage.includes('user')) {
        document.getElementById('user-link').classList.add('active');
    } else if (currentPage.includes('stage')) {
        document.getElementById('stage-link').classList.add('active');
    } else if (currentPage.includes('task')) {
        document.getElementById('task-link').classList.add('active');
    } else if (currentPage.includes('project')) {
        document.getElementById('project-link').classList.add('active');
    }

    ui.changeIconAvatar();

    ui.changeTopbarText();

    initProjectPage();

    ui.renderInventory();

    ui.renderProjectTable();
});

function bindProjectEvents() {
    projectElements.searchInput.addEventListener("input", handlerEvent.handleFilterChange);
    projectElements.statusFilter.addEventListener("change", handlerEvent.handleFilterChange);
}


async function initProjectPage() {
    try {
        variableGlobal.projectList = await api.getRecords(COLLECTION_PROJECTS);

        const users = await api.getRecords(COLLECTION_USERS);

        variableGlobal.userMap = Object.fromEntries(
            users.map(user => [user.id, user])
        );

        variableGlobal.filteredProjects = [...variableGlobal.projectList];

        bindProjectEvents();
        ui.renderProjectPage();

    } catch (error) {
        console.log(error);
        utils.showError(messageCommon.error.getError);
    }
}

function checkAuthentication() {
    const token = localStorage.getItem("token");
    if (!token || token.trim() === "") {
        utils.showPopup("Warning", "You must login", "warning")
            .then(() => {
                window.location.href = "http://127.0.0.1:5500/Page/login.html";// chuyển hướng sau khi user bấm OK
            });
        return false;
    }
    return true;
}

$(document).on("click", ".js-page", function () {

    const page = Number($(this).data("page"));

    if (!page || page < 1) return;

    ui.handlePageChange(page);
});

document.addEventListener("click", function (e) {
    const toggleBtn = e.target.closest(".js-menu-toggle");
    const menu = e.target.closest(".action-menu");
    const editItem = e.target.closest(".btn-edit-project");
    const viewMoreItem = e.target.closest(".btn-view-more-project");
    const deleteItem = e.target.closest(".btn-delete-project");

    const openMenus = document.querySelectorAll(".action-menu.show");

    // =========================
    // 1. CLICK BUTTON ...
    // =========================
    if (toggleBtn) {
        const row = toggleBtn.closest("tr");
        const currentMenu = row.querySelector(".action-menu");

        // đóng menu khác
        openMenus.forEach(m => {
            if (m !== currentMenu) m.classList.remove("show");
        });

        // toggle menu hiện tại
        currentMenu.classList.toggle("show");
        return;
    }

    /*
    * Click xem nhiều thông tin project hơn, list vật tư của nó nữa
    */
    if (viewMoreItem) {
        console.log("AAAAAAAAA");
        openDrawer();
    }

    // =========================
    // 2. CLICK EDIT → KHÔNG ĐÓNG MENU
    // =========================
    if (editItem) {
        const row = editItem.closest("tr");
        const menu = row.querySelector(".action-menu");

        // giữ menu mở
        menu.classList.add("show");

        // handle edit logic
        handlerEvent.handleEditProject(e, editItem);

        return;
    }

    if (deleteItem) {
        const row = deleteItem.closest("tr");
        const menu = row.querySelector(".action-menu");

        // handle delete project logic
        handlerEvent.handleDeleteProject(deleteItem);

        return;
    }

    // =========================
    // 3. CLICK TRONG MENU → KHÔNG ĐÓNG
    // =========================
    if (menu) {
        return;
    }

    // =========================
    // 4. CLICK NGOÀI → ĐÓNG ALL MENU
    // =========================
    openMenus.forEach(m => m.classList.remove("show"));
});

$(".btn-create-project").on("click", ui.openCreateProjectPopup);

$(".btn-close-project-popup").on("click", ui.closeCreateProjectPopup);

$(".btn-save-project").on("click", handlerEvent.handleSubmitFormCreateProject);



