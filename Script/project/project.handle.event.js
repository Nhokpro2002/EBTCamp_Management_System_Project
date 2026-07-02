import * as ui from "./project.ui.js";
import * as api from "../services/generic.api.js";
import * as utils from "../utils/utils.js";

import { variableGlobal, projectElements } from "./project.state.js";
import { projectPageMessage } from "./project_page_message.js";

// =========================
// CONSTANTS
// =========================
const COLLECTION_PROJECTS = "Projects";

/*
===========================================
                VALIDATION
===========================================
*/

export function validateProjectForm(data) {
    const { projectName, startDate, endDate, pic, members } = data;

    const isValid =
        projectName &&
        startDate &&
        endDate &&
        pic &&
        Array.isArray(members) &&
        members.length > 0;

    if (!isValid) {
        utils.showPopup("Error", projectPageMessage.requiredFields, "error");
        return false;
    }

    return true;
}

/*
===========================================
                STATE HELPERS
===========================================
*/

export function removeProjectFromState(projectID) {
    const list = variableGlobal.projectList;

    const index = list.findIndex(p => p.id === projectID);
    if (index === -1) return;

    list.splice(index, 1);
}

/*
===========================================
                FILTER
===========================================
*/

export function handleFilterChange() {
    const keyword = projectElements.searchInput.value.trim().toLowerCase();
    const selectedStatus = projectElements.statusFilter.value;

    variableGlobal.filteredProjects = variableGlobal.projectList.filter(project => {
        const matchKeyword = project.name?.toLowerCase().includes(keyword);
        const matchStatus = selectedStatus === "all" || project.status === selectedStatus;

        return matchKeyword && matchStatus;
    });

    variableGlobal.currentPage = 1;
    ui.renderProjectPage();
}

/*
===========================================
                CREATE PROJECT
===========================================
*/

function getCreateProjectFormData() {
    return {
        projectName: document.getElementById("project-name")?.value.trim(),
        startDate: document.getElementById("start-date")?.value,
        endDate: document.getElementById("end-date")?.value,
        pic: document.getElementById("pic")?.value,
        members: Array.from(
            document.getElementById("members")?.selectedOptions || []
        ).map(o => o.value)
    };
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

export async function handleSubmitFormCreateProject() {
    const formData = getCreateProjectFormData();

    if (!validateProjectForm(formData)) return;

    const payload = buildProjectPayload(formData);

    try {
        const result = await api.createRecord(COLLECTION_PROJECTS, payload);

        /*
        * Call api tạo một project mới => call api tạo 5 giai đoạn của dự án setup máy
       * Gồm: Desgin (lên bản vẽ), mechanical (gia công), assembly (lắp ráp), electric (đi điện), program (viết chương trình)

        */

        variableGlobal.projectList.push(result);

        utils.showSuccess(projectPageMessage.createSuccess);

        ui.renderProjectPage();

    } catch (error) {
        console.error(error);
        utils.showError(projectPageMessage.createFailed);
    }
}

/*
===========================================
                DELETE PROJECT
===========================================
*/

export async function handleDeleteProject(deleteButton) {
    const projectID = deleteButton.dataset.id;

    try {
        const response = await api.deleteRecord(COLLECTION_PROJECTS, projectID);

        if (!response) return;

        variableGlobal.projectList = variableGlobal.projectList.filter(
            p => p.id !== projectID
        );

        variableGlobal.filteredProjects = variableGlobal.filteredProjects.filter(
            p => p.id !== projectID
        );

        utils.showSuccess(projectPageMessage.deleteSuccess);

        ui.renderProjectPage();

    } catch (error) {
        console.error(error);
        utils.showError(projectPageMessage.deleteFailed);
    }
}

/*
===========================================
                EDIT PROJECT
===========================================
*/

export function handleEditProject(e, editButton) {
    const tr = editButton.closest("tr");
    const projectID = editButton.dataset.id;

    const isActive = editButton.classList.contains("active");

    if (isActive) {
        editButton.classList.remove("active");
        ui.disableProjectEditMode(tr, projectID);
        return;
    }

    editButton.classList.add("active");
    ui.enableProjectEditMode(tr, projectID);
}