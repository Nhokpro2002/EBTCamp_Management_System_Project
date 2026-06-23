import * as ui from "./project.ui.js";
import * as api from "../../services/generic.api.js";
import * as utils from "../../utils/utils.js";
import { variableGlobal } from "../project.state.js";
import { projectElements } from "../project.state.js";
import { messageCommon } from "../project.state.js"

const COLLECTION_PROJECTS = "Projects";
const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_USERS = "Users";

/*
===========================================
                  PROJECT
===========================================
*/


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
        utils.showPopup("Error", "Please complete all required fields.", "error");
        return false;
    }

    return true;
}



export function removeProjectFromState(projectID) {
    const index = variableGlobal.projectList.findIndex(
        p => p.id === projectID
    );
    if (index === -1) return;
    variableGlobal.projectList.splice(index, 1);
}

export function handleFilterChange() {
    const keyword = projectElements.searchInput.value.trim().toLowerCase();
    const selectedStatus = projectElements.statusFilter.value;

    variableGlobal.filteredProjects = variableGlobal.projectList.filter(project => {
        const matchKeyword = project.name.toLowerCase().includes(keyword);
        const matchStatus =
            selectedStatus === "all" || project.status === selectedStatus;

        return matchKeyword && matchStatus;
    });

    variableGlobal.currentPage = 1;
    ui.renderProjectPage();
}

export function handleViewProject(projectId) {
    const project = variableGlobal.projectList.find(p => p.id === projectId);
    if (!project) return;

    alert("View project: " + project.name);
}

export function handleMoreProject(projectID) {
    const project = variableGlobal.projectList.find(p => p.id === projectID);
    if (!project) return;

    alert("More actions for: " + project.name);
}

function getCreateProjectFormData() {
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

    try {
        const result = await api.createRecord(COLLECTION_PROJECTS, payload);
        utils.showSuccess(messageCommon.success.createSuccess);
        variableGlobal.projectList.push(result);
    } catch (error) {
        utils.showError(messageCommon.error.createError);
    }

}


export function buildProjectPayload(data) {
    return {
        name: data.projectName,
        start_date: data.startDate,
        end_date: data.endDate,
        pic: data.pic,
        members: data.members,
        status: "Not Started"
    };
}

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


