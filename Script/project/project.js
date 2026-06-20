import * as api from "../services/generic.api.js";
import * as ui from "./project.ui.js";
import * as handleEvent from "./project.handle.event.js";
import { variableGlobal } from "./project.state.js";

/* =====================================================
  Variables
  ===================================================== */

const COLLECTION_PROJECTS = "Projects";
const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_USERS = "Users";

$(document).ready(function () {

    if (!checkAuthentication()) return;

    document.querySelector(".container-fluid").style.display = "block";

    // window.alert(window.innerWidth + " x " + window.innerHeight);
    // Spec: 1528 * 732;

    const currentPage = window.location.pathname;

    if (currentPage.includes('dashboard')) {
        document.getElementById('dashboard-link').classList.add('active');
    } else if (currentPage.includes('order')) {
        document.getElementById('order-link').classList.add('active');
    } else if (currentPage.includes('user')) {
        document.getElementById('user-link').classList.add('active');
    } else if (currentPage.includes('setting')) {
        document.getElementById('setting-link').classList.add('active');
    } else if (currentPage.includes('project')) {
        document.getElementById('project-link').classList.add('active');
    }

    ui.changeIconAvatar();

    ui.changeTopbarText();

    async function init() {
        variableGlobal.projectList = await api.getRecords(COLLECTION_PROJECTS);

        ui.renderProjectOptionList();
        initDefaultProject();

        if (variableGlobal.projectList.length !== 0) {
            handleEvent.loadProjectData(variableGlobal.projectList[0].id);
        }

        const users = await api.getRecords(COLLECTION_USERS);

        users.forEach(user => {
            variableGlobal.userMap[user.id] = user;
        });
    }

    init();

});

/* =========================================
        Check authentication
===========================================*/
function checkAuthentication() {
    const token = localStorage.getItem("token");
    if (!token || token.trim() === "") {
        Swal.fire({
            icon: 'warning',
            title: 'Access Denied',
            text: 'You must log in to access this page',
            confirmButtonText: 'Go to Login'
        }).then(() => {
            window.location.href = "http://127.0.0.1:5500/Page/login.html"; // chuyển hướng sau khi user bấm OK
        });

        return false;
    }

    return true;
}


/* =========================================
    update, change UI when user interact on UI
=============================================*/

function initDefaultProject() {
    const first = variableGlobal.projectList[0];

    if (!first) return;

    $("#projectSelect").value = first.id;
    ui.changeProjectStatusUI(first.status);
}

/* =========================================
        Catch event when user interact on UI
 ===========================================*/
$(document).on("click", "#open-create-project-button", ui.openCreateProjectPopup);

$("#closeCreateProject")?.on("click", ui.closeCreateProjectPopup);

$("#projectSelect").on("change", async function (e) {
    await handleEvent.loadProjectData(e.target.value);
});

$("#logoutLink").on("click", function (e) {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "http://127.0.0.1:5500/Page/login.html";
});

$("#close-create-stage-form").on("click", handleEvent.closeCreateStagePopup);

$("#add-stage-button").on("click", handleEvent.openCreateStagePopup);

$("#submit-create-stage-form").on("click", handleEvent.createNewStage);

$("#taskBody").on("click", handleEvent.handleTaskActions);

$("#button-submit-create-project").on("click", handleEvent.handleSubmitFormCreateProject);

$("#delete-project-button").on("click", handleEvent.handleDeleteProject);

$("#timeline-container")
    .on("click", ".btn-edit-stage", handleEvent.handleEditStage)
    .on("click", ".btn-delete-stage", handleEvent.handleDeleteStage)
    .on("click", ".btn-save-stage", handleEvent.handleSaveStage)
    .on("click", ".btn-return-stage", handleEvent.handleCancelEditStage);

$("#timeline-container").on("click", ".stage-card", handleEvent.handleStageClick);

$(".btn-create-task").on("click", handleEvent.handleCreateTask);

$("#button-add-task").on("click", handleEvent.handleAddNewTask);

$('.menu-link').on('click', function () {
    $('.menu-link').removeClass('active');
    $(this).addClass('active');
});

/*
! Các button ở row task trong bảng table vẫn chưa hoạt động
! làm tính năng hiển thị các vật tư làm cho dự án đó 

 */