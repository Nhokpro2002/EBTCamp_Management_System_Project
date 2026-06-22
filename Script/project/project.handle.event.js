import * as ui from "./project.ui.js";
import * as api from "../services/generic.api.js";
import * as utils from "../utils/utils.js";
import { variableGlobal } from "./project.state.js";
import { messageCommon } from "./project.state.js"

const COLLECTION_PROJECTS = "Projects";
const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_USERS = "Users";

/*
===========================================
                  PROJECT
===========================================
*/
// ! ID có thể sẽ trùng khi code scale
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

/*
  ! process: create new project -> push data response into project list -> selecte new project option -> call load function project data
 */
export async function handleSubmitFormCreateProject() {
    const formData = getCreateProjectFormData();

    if (!validateProjectForm(formData)) return;

    const payload = buildProjectPayload(formData);

    try {
        const result = await api.createRecord(COLLECTION_PROJECTS, payload);
        utils.showSuccess(messageCommon.success.createSuccess);
        variableGlobal.projectList.push(result);
        loadProjectData(result.id);
    } catch (error) {
        utils.showError(messageCommon.error.createError);
    }

}

// * Function này đang làm hơi nhiều việc, cần cải thiện
export async function loadProjectData(projectID) {
    const project = variableGlobal.projectList.find(p => p.id == projectID);
    if (!project) return;
    variableGlobal.currentProjectID = projectID;
    $("#projectSelect").value = projectID;
    ui.changeProjectStatusUI(project.status);
    variableGlobal.stageListByProject = await api.getRecordsFilter(COLLECTION_STAGES, "project", projectID);
    ui.renderStages(variableGlobal.stageListByProject);
    variableGlobal.currentStageID = null;
    variableGlobal.taskListByStage = [];
    ui.renderTasks([]);
}

// * Done
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

// * Done
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

/*
! Error
! Delete selected project -> 
! + nếu là project cuối thì sẽ chọn vào cái trên nó
! + nếu là cái ở phần giữa thì sẽ chọn project tiếp theo, xóa cái n thì chọn cái n + 1
! + nếu xóa cái đầu thì chọn cái thứ 2
! + xóa cái cuối cùng thì sẽ rỗng
 */
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
    try {
        const success = await api.deleteRecord(COLLECTION_PROJECTS, projectID);
        if (!success) return;
        utils.showSuccess(messageCommon.success.deleteSuccess);
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
    } catch (error) {
        utils.showSuccess(messageCommon.error.deleteError);
    }

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
// * Done
export function handleEditStage(e) {
    const card = e.currentTarget.closest(".stage-card");
    const selectedStageID = card.dataset.id;
    ui.enableStageEditMode(selectedStageID);
}

// ==================================================
// Delete stage
// ==================================================
// * Done
export async function handleDeleteStage(e) {

    const card = e.currentTarget.closest(".stage-card");
    const selectedStageID = card.dataset.id;

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

    try {
        await api.deleteRecord(COLLECTION_STAGES, selectedStageID);
        variableGlobal.stageListByProject =
            variableGlobal.stageListByProject.filter(
                stage => stage.id != selectedStageID
            );

        ui.renderStages(variableGlobal.stageListByProject);

        utils.showSuccess(messageCommon.success.deleteSuccess);
    } catch (error) {
        utils.showError(messageCommon.error.deleteError);
    }
}

// ==================================================
// Save stage
// ==================================================
// * Done
export async function handleSaveStage($card, stageID) {

    const updatedStageData = {
        name: $card.find("#stage-name").val(),
        start_date: $card.find("#stage-start-date-input").val(),
        end_date: $card.find("#stage-end-date-input").val(),
        status: $card.find("#stage-status-input").val()
    };

    try {
        const apiRes = await api.updateRecord(COLLECTION_STAGES, stageID, updatedStageData);
        variableGlobal.stageListByProject.forEach(stage => {

            if (stage.id == apiRes.id) {
                Object.assign(stage, apiRes);
            }
        });
        ui.renderStages(variableGlobal.stageListByProject);

    } catch (error) {
        utils.showError(messageCommon.error.updateError);
        return;
    }

}

// ==================================================
// Handle stage click
// ==================================================
// * Done
export async function handleStageClick(e) {
    const $card = $(e.currentTarget);
    const stageID = $card.data("id");
    variableGlobal.currentStageID = stageID;
    setActiveStage($card);
    await loadTasksByStage(stageID);
}

// ==================================================
// Set active stage
// ==================================================
// * Done
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
// * Done
export async function loadTasksByStage(stageID) {
    try {
        variableGlobal.taskListByStage =
            await api.getRecordsFilter(
                COLLECTION_TASKS,
                "stage",
                stageID
            );

        ui.renderTasks(variableGlobal.taskListByStage);
    } catch (error) {
        utils.showError(messageCommon.error.getError);
    }

}

// ==================================================
// Return stage
// ==================================================
// * Done
export function handleCancelEditStage() {
    ui.renderStages(variableGlobal.stageListByProject);
}


/*
===========================================
                  TASK
===========================================
*/

// * Còn tính năng view more, xem chi tiết task
export function handleTaskActions(e) {
    const saveBtn = e.target.closest(".btn-save-task"); // save button after edit
    if (saveBtn) return handleSaveTask(e, saveBtn);

    const editBtn = e.target.closest(".btn-edit-task");
    if (editBtn) return handleEditTask(e, editBtn);

    const deleteBtn = e.target.closest(".btn-delete-task");
    if (deleteBtn) return handleDeleteTask(e, deleteBtn);

    // * Làm tính năng viewmore sau
    //const viewMoreBtn = e.target.closest(".btn-edit-task");
    //if (editBtn) return handleEditTask(e, editBtn);
}

// * Đã hoàn thiện, cái này đôi lúc đang bị reset nhưng về cơ bản đã hoàn thiện tính năng
async function handleDeleteTask(e, editButton) {
    //const tr = editButton.closest("tr");
    const taskID = editButton.dataset.id;

    try {
        const response = await api.deleteRecord(COLLECTION_TASKS, taskID);

        if (response) {

            variableGlobal.taskListByStage =
                variableGlobal.taskListByStage.filter(
                    task => task.id !== taskID
                );

            utils.showSuccess(messageCommon.success.deleteSuccess);

            ui.renderTasks(variableGlobal.taskListByStage);

        }
    } catch (error) {
        utils.showError(messageCommon.error.deleteError);
    }
}

// * Đã hoàn thiện
async function handleSaveTask(e, saveButton) {
    const tr = saveButton.closest("tr");
    const taskID = saveButton.dataset.id;

    const nameInput = tr.querySelector(".task-name input");
    const statusSelect = tr.querySelector(".task-status select");
    const percentInput = tr.querySelector(".task-percent input");
    const handlerSelect = variableGlobal.tomSelectInstances?.[taskID];
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

    try {
        const response = await api.updateRecord(COLLECTION_TASKS, taskID, updatedTaskData);
        variableGlobal.taskListByStage = variableGlobal.taskListByStage.map(task =>
            task.id === response.id ? response : task
        );

        ui.renderTasks(variableGlobal.taskListByStage);
    } catch (error) {
        utils.showError(messageCommon.error.updateError);
    }

}

// * Đã hoàn thiện
export function handleAddNewTask() {

    const $tbody = $("#taskBody");

    const tempId = "new_" + Date.now(); // id tạm

    const newRowHtml = `
        <tr class="task-row-new" data-temp-id="${tempId}"> 

            <td>
                <input type="text" class="form-control form-control-sm new-task-name" placeholder="Task name">
            </td>

            <td class="task-handler">
                <select id="handler-${tempId}" multiple></select>
            </td>

            <td>
                <select class="form-select form-select-sm new-task-status">
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Done">Done</option>
                </select>
            </td>

            <td>
                <input type="number" class="form-control form-control-sm new-task-percent" value="0">
            </td>

            <td>
                <input type="date" class="form-control form-control-sm new-task-start">
            </td>

            <td>
                <input type="date" class="form-control form-control-sm new-task-end">
            </td>

            <td class="task-action-button">
                <div class="d-flex gap-1">

                    <button class="btn btn-sm btn-success btn-create-task" data-temp-id="${tempId}">
                        <i class="bi bi-check-lg"></i>
                    </button>

                    <button class="btn btn-sm btn-secondary btn-cancel-new-task" data-temp-id="${tempId}">
                        <i class="bi bi-x-lg"></i>
                    </button>

                </div>
            </td>

        </tr>
    `;

    $tbody.append(newRowHtml);

    // 👉 init TomSelect sau khi DOM render
    setTimeout(() => {

        const select = document.getElementById(`handler-${tempId}`);
        if (!select) return;

        // add user options
        Object.values(variableGlobal.userMap || {}).forEach(user => {
            const option = document.createElement("option");
            option.value = user.id;
            option.textContent = user.employee_id;
            select.appendChild(option);
        });

        // init storage
        if (!variableGlobal.tomSelectInstances) {
            variableGlobal.tomSelectInstances = {};
        }

        // init TomSelect
        variableGlobal.tomSelectInstances[tempId] = new TomSelect(select, {
            plugins: ['remove_button'],
            hideSelected: true,
            placeholder: "Select Handler"
        });

    }, 0);
}

/*
* button này click vào sẽ hủy cái row nhập input mà người dùng vừa tạo
 */
export function cancelCreateNewTask(e) {

}

/*
* Cái này là button "✓" khi người dùng click button "Create Task" thì nó tạo ra một row có các field input để người dùng nhập
* ấn cái này thì sẽ lưu data vào db 
 */
export async function handleCreateTask(e) {

    const $row = $(e.currentTarget).closest("tr");

    const taskId = $(e.currentTarget).data("id");

    // 👉 lấy handler từ TomSelect
    const tempId = $row.data("temp-id") || taskId;

    let handlerValues = [];

    const tomSelect = variableGlobal.tomSelectInstances?.[tempId];
    if (tomSelect) {
        handlerValues = tomSelect.getValue();
    }

    const payload = {
        name: $row.find(".new-task-name, .task-name input").val(),
        status: $row.find(".new-task-status, .task-status select").val(),
        percent: $row.find(".new-task-percent, .task-percent input").val(),
        start_date: $row.find(".new-task-start, .task-start input").val(),
        end_date: $row.find(".new-task-end, .task-end input").val(),
        handler: handlerValues,
        stage: variableGlobal.currentStageID
    };

    try {

        let response;

        // CREATE
        if (!taskId) {
            response = await api.createRecord(COLLECTION_TASKS, payload);
            variableGlobal.taskListByStage.push(response);

            utils.showSuccess(messageCommon.success.createSuccess);
        }

        ui.renderTasks(variableGlobal.taskListByStage);

    } catch (error) {
        console.error(error);
        utils.showError(messageCommon.error.updateError);
    }
}

// * Đã hoàn thiện
function handleEditTask(e, editButton) {

    const $row = $(e.currentTarget).closest("tr");
    $row.find(".btn-save-task").prop("disabled", false);
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

// * Đã hoàn thiện
export function openCreateStagePopup() {
    $("#overlay-create-stage").css("display", "flex");
    $("body").css("overflow", "hidden");

    const projectName = $("#projectSelect option:selected").text();
    $("#stage-project-name").val(projectName);

    // reset form
    $("#stage-name-input").val("");
    $("#start-date").val("");
    $("#end-date").val("");
    $("#stage-status-input").val("");
}

// * Đã hoàn thiện
export function closeCreateStagePopup() {
    $("#overlay-create-stage").css("display", "none");
    $("body").css("overflow", "auto");
}

// * Đã hoàn thiện
export async function createNewStage() {
    const project = variableGlobal.currentProjectID;

    const stageName = $("#stage-name-input").val().trim();
    const startDate = $("#stage-start-date-input").val();
    const endDate = $("#stage-end-date-input").val();
    const status = $("#stage-status-input").val();

    const payload = {
        project: project,
        name: stageName,
        start_date: startDate,
        end_date: endDate,
        status: status
    };

    try {
        const response = await api.createRecord(COLLECTION_STAGES, payload);

        utils.showSuccess(messageCommon.success.createSuccess);

        variableGlobal.stageListByProject.push(response);

        ui.renderStages(variableGlobal.stageListByProject);

    } catch (error) {
        utils.showError(messageCommon.error.createError);
    }
}
