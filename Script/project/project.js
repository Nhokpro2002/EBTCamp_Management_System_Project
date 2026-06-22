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

$("#taskBody").on("click", handleEvent.handleTaskActions)
    .on("click", ".btn-create-task", handleEvent.handleCreateTask);

$("#button-submit-create-project").on("click", handleEvent.handleSubmitFormCreateProject);

$("#delete-project-button").on("click", handleEvent.handleDeleteProject);

$("#timeline-container")
    .on("click", ".btn-edit-stage", handleEvent.handleEditStage)
    .on("click", ".btn-delete-stage", handleEvent.handleDeleteStage)
    .on("click", ".btn-save-stage", handleEvent.handleSaveStage)
    .on("click", ".btn-return-stage", handleEvent.handleCancelEditStage);

$("#timeline-container").on("click", ".stage-card", handleEvent.handleStageClick);

$("#button-add-task").on("click", handleEvent.handleAddNewTask); // * nhấn vào button "Create Task" bên phải cái task body

$('.menu-link').on('click', function () {
    $('.menu-link').removeClass('active');
    $(this).addClass('active');
});


//const projectItemsData = []; // * cái này sẽ lấy api từ bảng project_items, lấy ra những record có project là projectID đang được chọn
// * show project items table
$("#view-items-button").on("click", function () {
    $("#project-items").addClass("show");
    /*$('#my_table').DataTable({
        data: projectItemsData,
        scrollY: true,
        scrollX: true,
        paging: true,
        sort: true,
        select: true,
        scrollCollapse: true,
        columnDefs: [
            { targets: 0, width: "200px" }, // name
            { targets: 1, width: "200px" }, // model
            { targets: 2, width: "200px" }, // code (XCode/QCode)
            { targets: 3, width: "200px" }, // required_quantity
            { targets: 4, width: "200px" }, // stock_quantity
            { targets: 5, width: "200px" } // purchase_quantity
        ],

        columns: [
            {
                title: "Name", data: "name", render: function (data) {
                    return `<div class="name-cell" title="${data}">${data}</div>`;
                }
            },
            {
                title: "Model", data: "model", render: function (data) {
                    return `<div class="model-cell" title="${data}">${data} </div>`;
                }
            },
            {
                title: "XCode/QCode", data: "code"
            },
            { title: "Required", data: "required_quantity" },
            { title: "Stock", data: "stock_quantity" },
            { title: "Purchase", data: "purchase_quantity" }
        ]
    });*/
});

// INIT GANTT
// =========================
gantt.init("gantt_here");

// =========================
// CONFIG
// =========================
gantt.config.date_format = "%Y-%m-%d";

gantt.config.columns = [
    { name: "text", label: "Name", tree: true, width: 250 },
    { name: "start_date", label: "Start", align: "center" },
    { name: "end_date", label: "End", align: "center" },
    { name: "duration", label: "Duration", align: "center" },
    { name: "progress", label: "Progress", align: "center" }
];

gantt.config.drag_move = true;
gantt.config.drag_resize = true;
gantt.config.drag_progress = true;

gantt.config.open_tree_initially = true;

// =========================
// STYLE (PROJECT / STAGE / TASK)
// =========================
gantt.templates.task_class = function (start, end, task) {

    if (task.type === "project") return "task-project";
    if (task.type === "stage") return "task-stage";
    if (task.type === "task") return "task-task";

    if (task.status === "Done") return "task-done";
    if (task.status === "Processing") return "task-processing";

    return "";
};

// =========================
// DATA STRUCTURE
// =========================

const links = [
    {
        id: 1,
        source: 4, // * id của task
        target: 5, // * id của task
        type: "0"
    },
    {
        id: 2,
        source: 5, // * id của task
        target: 6, // * id của task
        type: "0"
    }
];

const data = [
    // PROJECT (ROOT)
    {
        id: 1, // id của project
        text: "Project Website",
        type: "project",
        open: true
    },

    // STAGES
    {
        id: 2, // id của stage
        text: "Design Phase",
        parent: 1, // id của project chứa nó
        type: "stage",
        start_date: "2026-06-01",
        end_date: "2026-07-01",
        duration: 30,
        progress: 0.3,
        status: "Processing"
    },

    {
        id: 3, // id của stage
        text: "Development Phase",
        parent: 1, // id của project chứa nó
        type: "stage",
        start_date: "2026-06-06",
        end_date: "2026-06-10",
        duration: 4,
        progress: 0.1,
        status: "Processing"
    },

    // TASKS (LEVEL 3)
    {
        id: 4, // id của task
        text: "UI Mockup",
        parent: 2, // id của stage chứa nó
        type: "task",
        start_date: "2026-06-01",
        end_date: "2026-06-11",
        duration: 10,
        progress: 1,
        status: "Done"
    },

    {
        id: 5, // id của task
        text: "Logo Design",
        parent: 2, // id của stage chứa nó
        type: "task",
        start_date: "2026-06-02",
        end_date: "2026-06-04",
        duration: 2,
        progress: 0.5,
        status: "Processing"
    },

    {
        id: 6, // id của task
        text: "Frontend Setup",
        parent: 3, // id của stage chứa nó
        type: "task",
        start_date: "2026-06-06",
        end_date: "2026-06-20",
        duration: 14,
        progress: 0.2,
        status: "Processing"
    }
];

// =========================
// LOAD DATA
// =========================
gantt.parse({ data: data, links: links });

// =========================
// EVENTS
// =========================
gantt.attachEvent("onAfterTaskUpdate", function (id, task) {
    console.log("UPDATED:", task);
});

gantt.attachEvent("onAfterTaskDrag", function (id) {
    console.log("DRAGGED:", gantt.getTask(id));
});

// * disable project items table
$("#back-project-items").on("click", function () {
    $("#project-items").removeClass("show");
});

$("#btn-add-item").on("click", ui.renderProjectItemList);

$("#itemBody").on("click", ".btn-delete-item", function () {
    const index = $(this).data("index");

    variableGlobal.projectItemList.splice(index, 1);

    ui.renderProjectItemList();
});

/*
! Các button ở row task trong bảng table vẫn chưa hoạt động
! làm tính năng hiển thị các vật tư làm cho dự án đó 

 */