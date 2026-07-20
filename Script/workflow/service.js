import * as api from "../services/generic.api.js";
import * as utils from "../utils/utils.js";

import { workflowPageMessage } from "./messages.js";
import { workflowData, projectData } from "./states.js";


// COLLECTION_NAME
const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_USERS = "Users";
const COLLECTION_TASK_INFORMATION = "Task_Information";

function createNewTaskInformation(data) {
    try {
        const response = await api.createRecord(COLLECTION_TASK_INFORMATION, data);
    } catch (error) {
        console.log(error);
    }
}

function updateTaskInformation(id, data) {
    try {
        const response = await api.updateRecord(COLLECTION_TASK_INFORMATION, id, data);
    } catch (error) {
        console.log(error);
    }
}

export async function createNewTask() {
    try {
        const payload = {
            name: document.getElementById("task-name").value,
            start_date: document.getElementById("start-date").value,
            duration: parseInt(document.getElementById("duration").value),
            stage: workflowData.currentStageID,
            css: document.getElementById("stage-name").value.toLowerCase(),
            progress: 0,
            createdBy: JSON.parse(localStorage.getItem("user")).employee_name || ""
        }
        if (!payload.name || !payload.start_date || !payload.duration) return;

        const response = await api.createRecord(COLLECTION_TASKS, payload);
        if (response) {
            const taskInformationData = {
                name: payload.name,
                stage: payload.stage,
                start_date: payload.start_date,
                duration_before: payload.duration
            }

            await createNewTaskInformation(taskInformationData);
        }
    } catch (error) {
        console.log(error);
        utils.showError(workflowPageMessage.createFailed);
    }
}

export async function updateTask(id, data) {
    try {
        return await api.updateRecord(COLLECTION_TASKS, id, data);

        // Call api to update Task information collection
    } catch (error) {
        console.log(error);
        utils.showError(workflowPageMessage.updateFailed);
    }
}

export async function deleteTask(id) {
    try {
        return await api.deleteRecord(COLLECTION_TASKS, id);
    } catch (error) {
        console.log(error);
        utils.showError(workflowPageMessage.deleteFailed);
    }
}

export async function loadStageData(projectID) {
    try {
        // Load danh sách stage
        const ORDER = {
            design: 1,
            mechanical: 2,
            assembly: 3,
            electric: 4,
            program: 5
        };

        const stages = await api.getRecordsFilter(COLLECTION_STAGES, "project", projectID);

        stages.sort((a, b) =>
            (ORDER[(a.css || "").toLowerCase()] ?? 999) -
            (ORDER[(b.css || "").toLowerCase()] ?? 999)
        );

        workflowData.stages = stages || [];
        workflowData.tasks = [];

        if (workflowData.stages.length === 0) return;

        // Load task của tất cả stage
        const taskResults = await Promise.all(
            workflowData.stages.map(stage =>
                api.getRecordsFilter(COLLECTION_TASKS, "stage", stage.id)
            )
        );

        // Gộp thành một mảng duy nhất
        workflowData.tasks = taskResults.flat();

    } catch (error) {
        console.error(error);
        utils.showError(workflowPageMessage.loadStageListError);
    }
}

export function mappingData() {
    projectData.data = [];
    projectData.links = [];

    // Stage
    workflowData.stages.forEach(stage => {
        projectData.data.push({
            id: stage.id,
            text: stage.name,
            start_date: stage.start_date,
            duration: stage.duration ?? 0,
            progress: stage.progress ?? 0,
            open: true,
            type: gantt.config.types.project,
            css: stage.css
        });
    });

    // Task => projectData.tasks (chuẩn hóa dữ liệu để render)
    workflowData.tasks.forEach(task => {
        projectData.data.push({
            id: task.id,
            parent: task.stage,
            text: task.name,
            start_date: task.start_date,
            duration: task.duration ?? 0,
            progress: task.progress ?? 0,
            css: task.css
        });
    });

    // ============================
    // Generate Links
    // ============================
    //const taskGroups = {};

    // Gom task theo stage
    workflowData.tasks.forEach(task => {
        if (!workflowData.taskGroups[task.stage]) {
            workflowData.taskGroups[task.stage] = [];
        }
        workflowData.taskGroups[task.stage].push(task);
    });

    let linkId = 1;

    Object.values(workflowData.taskGroups).forEach(tasks => {

        // Nếu cần theo thời gian
        tasks.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        for (let i = 0; i < tasks.length - 1; i++) {
            projectData.links.push({
                id: linkId++,
                source: tasks[i].id,
                target: tasks[i + 1].id,
                type: "0" // Finish to Start
            });
        }
    });
}

export function getMinStartDate(stageID) {
    const stageTasks = workflowData.tasks.filter(task => task.stage == stageID);
    if (!stageTasks.length) return "";
    let latestEndDate = null;
    for (const task of stageTasks) {
        const endDate = new Date(task.start_date);
        endDate.setDate(endDate.getDate() + task.duration - 1);
        if (!latestEndDate || endDate > latestEndDate) {
            latestEndDate = endDate;
        }
    }
    // Task mới phải bắt đầu sau task cuối cùng 1 ngày
    latestEndDate.setDate(latestEndDate.getDate() + 1);
    // Format yyyy-mm-dd cho input[type="date"]
    return latestEndDate.toISOString().split("T")[0];
}



// =====================================================
// Zoom Buttons
// =====================================================
export function changeView(mode) {
    if (mode === "day") {
        gantt.config.scales = [
            {
                unit: "month",
                step: 1,
                format: "%F %Y"
            },
            {
                unit: "day",
                step: 1,
                format: "%d"
            }
        ];
    }

    if (mode === "week") {
        gantt.config.scales = [
            {
                unit: "month",
                step: 1,
                format: "%F %Y"
            },
            {
                unit: "week",
                step: 1,
                format: "Week #%W"
            }
        ];
    }

    if (mode === "month") {
        gantt.config.scales = [
            {
                unit: "year",
                step: 1,
                format: "%Y"
            },
            {
                unit: "month",
                step: 1,
                format: "%M"
            }
        ];
    }
    gantt.render();
}

// =========================================================
// Zoom
// =========================================================
export function setZoom(mode) {
    switch (mode) {
        case "day":
            gantt.config.scales = [
                {
                    unit: "month",
                    step: 1,
                    format: "%F %Y"
                },
                {
                    unit: "day",
                    step: 1,
                    format: "%d"
                }
            ];
            break;

        case "week":
            gantt.config.scales = [
                {
                    unit: "month",
                    step: 1,
                    format: "%F %Y"
                },
                {
                    unit: "week",
                    step: 1,
                    format: "Week %W"
                }
            ];
            break;

        case "month":
            gantt.config.scales = [
                {
                    unit: "year",
                    step: 1,
                    format: "%Y"
                },
                {
                    unit: "month",
                    step: 1,
                    format: "%M"
                }
            ];
            break;
    }
    gantt.render();
}