import * as ui from "./project.ui.js";
import * as api from "../services/generic.api.js";

const variableGlobal = {
    projectList: [],
    currentProjectID: null,
    stageListByProject: [],
    currentStageID: null,
    taskListByStage: [],
    currentTaskID: null,
    userMap: {}
}

const COLLECTION_PROJECTS = "projects";
const COLLECTION_STAGES = "stages";
const COLLECTION_TASKS = "tasks";
const COLLECTION_USERS = "users";

/*
===========================================
                  PROJECT
===========================================
*/

export function getCreateProjectFormData() {
    const projectName = document.getElementById("project-name").value.trim();
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
    const pic = document.getElementById("pic").value;

    const members = Array.from(
        document.getElementById("members").selectedOptions
    ).map(o => o.value);

    return { projectName, startDate, endDate, pic, members };
}

export async function handleSubmitFormCreateProject() {
    const formData = getCreateProjectFormData();

    if (!validateProjectForm(formData)) return;

    const payload = buildProjectPayload(formData);

    const result = await api.createRecord(
        COLLECTION_PROJECTS,
        payload
    );

    variableGlobal.projectList.push(result);

    loadProjectData(result.id);
}

export function validateProjectForm(data) {
    const { projectName, startDate, endDate, pic, members } = data;
    const isValid =
        projectName &&
        startDate &&
        endDate &&
        pic &&
        members.length > 0;

    if (!isValid) {
        Toast.fire({
            icon: "warning",
            title: "Please fill all fields"
        });
        return false;
    }

    return true;
}

export function buildProjectPayload(data) {
    return {
        name: data.projectName,
        start_date: data.startDate,
        end_date: data.endDate,
        pic: data.pic,
        members: data.members,
        status: "Pending"
    };
}

export async function handleDeleteProject() {
    const $select = $("#projectSelect");
    const projectID = $select.val();
    if (!projectID) {
        Swal.fire({
            icon: "warning",
            title: "No project selected"
        });
        return;
    }
    const confirm = await Swal.fire({
        icon: "warning",
        title: "Delete this project?",
        text: "This action cannot be undone",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#d33"
    });

    if (!confirm.isConfirmed) return;
    const success = await api.deleteRecord(
        COLLECTION_PROJECTS,
        projectID
    );
    if (!success) return;
    Swal.fire({
        icon: "success",
        title: "Project deleted"
    });
    removeProjectFromState(projectID);
    removeProjectOption(projectID);
    const nextProject = getNextProject();
    if (!nextProject) {
        clearProjectUI();
        return;
    }
    $select
        .val(nextProject.id)
        .trigger("change");

}

export function removeProjectFromState(projectID) {
    const index = variableGlobal.projectList.findIndex(
        p => p.id === projectID
    );
    if (index === -1) return;
    variableGlobal.projectList.splice(index, 1);
}

export function removeProjectOption(projectID) {
    $(`#projectSelect option[value="${projectID}"]`)
        .remove();
}

export function getNextProject() {
    const list = variableGlobal.projectList;
    if (!list.length) return null;
    const currentIndex = $("#projectSelect")
        .prop("selectedIndex");
    if (currentIndex >= list.length) {
        return list[list.length - 1];
    }
    return list[currentIndex];
}

export function clearProjectUI() {
    $("#projectSelect").val("");
    $("#project-status").empty();
    $("#taskBody").empty();
}


/*
===========================================
                  Stage
===========================================
*/
// ==================================================
// Edit stage
// ==================================================
export function handleEditStage(stageID) {
    ui.enableStageEditMode(stageID);
}

// ==================================================
// Delete stage
// ==================================================
export async function handleDeleteStage(stageID) {

    const result = await Swal.fire({
        icon: "warning",
        title: "Delete stage?",
        text: "This action cannot be undone.",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#d33"
    });

    if (!result.isConfirmed) return;

    await api.deleteRecord(
        COLLECTION_STAGES,
        stageID
    );

    variableGlobal.stageListByProject =
        variableGlobal.stageListByProject.filter(
            stage => stage.id != stageID
        );

    ui.renderStages(variableGlobal.stageListByProject);

    await Swal.fire({
        icon: "success",
        title: "Stage deleted",
        timer: 1500,
        showConfirmButton: false
    });
}

// ==================================================
// Save stage
// ==================================================
export async function handleSaveStage($card, stageID) {

    const updatedStageData = {
        name: $card.find("#stage-name").val(),
        start_date: $card.find("#stage-start-date-input").val(),
        end_date: $card.find("#stage-end-date-input").val(),
        status: $card.find("#stage-status-input").val()
    };

    const apiRes = await api.updateRecord(
        COLLECTION_STAGES,
        stageID,
        updatedStageData
    );

    variableGlobal.stageListByProject.forEach(stage => {

        if (stage.id == apiRes.id) {
            Object.assign(stage, apiRes);
        }

    });

    ui.renderStages(variableGlobal.stageListByProject);
}

// ==================================================
// Handle stage click
// ==================================================
export async function handleStageClick(e) {

    const $card = $(e.currentTarget);
    const stageID = $card.data("id");

    setActiveStage($card);

    await loadTasksByStage(stageID);
}

// ==================================================
// Set active stage
// ==================================================
export function setActiveStage($card) {

    $(".stage-card")
        .removeClass("stage-active");

    $(".stage-actions")
        .addClass("d-none");


    $card
        .addClass("stage-active")
        .find(".stage-actions")
        .removeClass("d-none");
}


// ==================================================
// Load tasks by stage
// ==================================================
export async function loadTasksByStage(stageID) {

    variableGlobal.taskListByStage =
        await api.getRecordsFilter(
            COLLECTION_TASKS,
            "stage",
            stageID
        );

    ui.renderTasks(variableGlobal.taskListByStage);
}

// ==================================================
// Return stage
// ==================================================
export function handleCancelEditStage() {
    ui.renderStages(variableGlobal.stageListByProject);
}


/*
===========================================
                  TASK
===========================================
*/

export function handleTaskActions(e) {
    const saveBtn = e.target.closest(".btn-save-task");
    if (saveBtn) return handleSaveTask(e, saveBtn);

    const editBtn = e.target.closest(".btn-edit-task");
    if (editBtn) return handleEditTask(e, editBtn);
}

export async function handleSaveTask(e, saveButton) {
    const tr = saveButton.closest("tr");
    const taskID = saveButton.dataset.id;

    const nameInput = tr.querySelector(".task-name input");
    const statusSelect = tr.querySelector(".task-status select");
    const percentInput = tr.querySelector(".task-percent input");
    const handlerSelect = window.tomSelectInstances?.[taskId];
    const startInput = tr.querySelector(".task-start input");
    const endInput = tr.querySelector(".task-end input");

    const updatedTaskData = {
        name: nameInput.value,
        status: statusSelect.value,
        percent: Number(percentInput.value),
        handler: handlerSelect ? handlerSelect.getValue() : [],
        start_date: startInput.value,
        end_date: endInput.value
    };

    return await api.updateRecord(COLLECTION_TASKS, taskID, updatedTaskData);
}


export function handleEditTask(e, editButton) {
    const tr = editButton.closest("tr");
    const taskId = editButton.dataset.id;

    editButton.classList.toggle("active");

    const isActive = editButton.classList.contains("active");

    if (isActive) {
        ui.enableTaskEditMode(tr, taskId);
    } else {
        ui.disableTaskEditMode(tr, taskId);
    }
}
