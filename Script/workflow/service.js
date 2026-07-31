import * as api from "../services/generic.api.js";
import * as utils from "../utils/utils.js";

import { workflowPageMessage } from "./messages.js";
import { workflowData, projectData } from "./states.js";


// =====================================================
// COLLECTIONS
// =====================================================

const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_NOTIFICATIONS = "Notifications";



// =====================================================
// NOTIFICATION
// =====================================================
/**
 * Tạo notification khi task thay đổi
 */
async function createNotification(data) {
    try {
        await api.createRecord(
            COLLECTION_NOTIFICATIONS,
            data
        );
    }
    catch (error) {
        console.log(error);
    }
}


/**
 * Chuẩn hóa dữ liệu notification
 * So sánh dữ liệu trước và sau update
 */
function createPayloadData(beforeUpdateTask, updatedTask) {
    const stageName =
        workflowData.stages.find(
            stage => stage.id === beforeUpdateTask.stage
        )?.name ?? "";

    return {

        name: updatedTask.name,

        stage: stageName,

        duration_before:
            beforeUpdateTask.duration,

        duration_updated:
            updatedTask.duration,

        progress_before:
            beforeUpdateTask.progress,

        progress_updated:
            updatedTask.progress,

        updated_by:
            JSON.parse(localStorage.getItem("user"))
                ?.employee_name ?? ""
    };
}


// =====================================================
// TASK CRUD
// =====================================================


/**
 * Tạo task mới
 */
export async function createNewTask() {
    try {
        const user = JSON.parse(localStorage.getItem("user"));

        const payload = {
            name:
                document.getElementById("task-name").value,
            start_date:
                document.getElementById("start-date").value,
            duration:
                parseInt(
                    document.getElementById("duration").value
                ),
            stage:
                workflowData.currentStageID,
            css:
                document.getElementById("stage-name")
                    .value
                    .toLowerCase(),
            progress:
                0,
            createdBy:
                user?.employee_name ?? ""

        };

        if (
            !payload.name ||
            !payload.start_date ||
            !payload.duration
        )
            return;

        const response =
            await api.createRecord(
                COLLECTION_TASKS,
                payload
            );

        if (response) {
            utils.showSuccess(
                workflowPageMessage.createSuccess
            );
        }
    }
    catch (error) {
        console.log(error);
        utils.showError(
            workflowPageMessage.createFailed
        );
    }
}

/**
 * Update task
 * 
 * Flow:
 * 1. Lưu dữ liệu cũ
 * 2. Update database
 * 3. Tạo notification
 * 4. Update state local
 */
export async function updateTask(id, data, projectID) {
    try {
        const beforeUpdateTask =
            workflowData.tasks.find(task => task.id === id);

        const response = await api.updateRecord(
            COLLECTION_TASKS,
            id,
            data
        );

        if (!response)
            return false;

        await createNotification(
            createPayloadData(beforeUpdateTask, data)
        );

        await updateFollowingTasks({
            ...beforeUpdateTask,
            ...data
        });

        // đồng bộ lại toàn bộ dữ liệu
        await loadStageData(projectID);

        mappingData();

        return true;

    } catch (error) {

        console.log(error);

        utils.showError(
            workflowPageMessage.updateFailed
        );

        return false;
    }
}



/**
 * Delete task
 */
export async function deleteTask(id) {
    try {
        return await api.deleteRecord(
            COLLECTION_TASKS,
            id
        );
    }
    catch (error) {
        console.log(error);
        utils.showError(
            workflowPageMessage.deleteFailed
        );
    }
}



// =====================================================
// LOAD DATA
// =====================================================


/**
 * Load stages và tasks của project
 */
export async function loadStageData(projectID) {
    try {
        const ORDER = {
            design: 1,
            mechanical: 2,
            assembly: 3,
            electric: 4,
            program: 5
        };

        // Load stages
        const stages =
            await api.getRecordsFilter(
                COLLECTION_STAGES,
                "project",
                projectID
            );

        stages.sort((a, b) =>
            (ORDER[a.css?.toLowerCase()] ?? 999) - (ORDER[b.css?.toLowerCase()] ?? 999)

        );

        workflowData.stages = stages ?? [];

        workflowData.tasks = [];

        if (!workflowData.stages.length)
            return;

        // Load task theo stage
        const taskResults =
            await Promise.all(
                workflowData.stages.map(stage =>
                    api.getRecordsFilter(
                        COLLECTION_TASKS,
                        "stage",
                        stage.id
                    )
                )
            );

        // Flatten array

        workflowData.tasks =
            taskResults.flat();


    }
    catch (error) {
        console.error(error);
        utils.showError(
            workflowPageMessage.loadStageListError
        );
    }
}


// =====================================================
// MAP DATA TO GANTT
// =====================================================


/**
 * Convert data từ PocketBase
 * sang format DHTMLX Gantt
 */
export function mappingData() {
    projectData.data = [];
    projectData.links = [];

    // -------------------------
    // Stage
    // -------------------------
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


    // -------------------------
    // Tasks
    // -------------------------
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


    // -------------------------
    // Generate links
    // -------------------------
    workflowData.taskGroups = {};

    workflowData.tasks.forEach(task => {
        if (!workflowData.taskGroups[task.stage]) {
            workflowData.taskGroups[task.stage] = [];
        }

        workflowData.taskGroups[task.stage]
            .push(task);

    });

    let linkId = 1;

    Object.values(workflowData.taskGroups)
        .forEach(tasks => {
            tasks.sort(
                (a, b) => new Date(a.start_date) - new Date(b.start_date)
            );

            for (let i = 0; i < tasks.length - 1; i++) {
                projectData.links.push({
                    id:
                        linkId++,
                    source:
                        tasks[i].id,
                    target:
                        tasks[i + 1].id,
                    type:
                        "0"
                });
            }
        });
}


// =====================================================
// DATE HELPER
// =====================================================

/**
 * Lấy ngày bắt đầu task mới
 * sau task cuối cùng trong stage
 */
export function getMinStartDate(stageID) {
    const stageTasks =
        workflowData.tasks.filter(
            task => task.stage == stageID
        );

    if (!stageTasks.length)
        return "";

    let latestEndDate = null;

    stageTasks.forEach(task => {
        const endDate = new Date(task.start_date);
        endDate.setDate(endDate.getDate() + task.duration - 1);

        if (!latestEndDate || endDate > latestEndDate)
            latestEndDate = endDate;
    });

    latestEndDate.setDate(latestEndDate.getDate() + 1);

    return latestEndDate
        .toISOString()
        .split("T")[0];
}


async function updateFollowingTasks(updatedTask) {

    const stageTasks = workflowData.tasks.filter(
        task => task.stage === updatedTask.stage
    );

    const currentIndex = stageTasks.findIndex(
        task => task.id === updatedTask.id
    );

    if (currentIndex === -1)
        return;

    let nextStart = new Date(updatedTask.start_date);
    nextStart.setHours(0, 0, 0, 0);
    nextStart.setDate(
        nextStart.getDate() + updatedTask.duration
    );

    for (let i = currentIndex + 1; i < stageTasks.length; i++) {

        const task = stageTasks[i];

        const startDate =
            nextStart.toISOString().split("T")[0];

        if (task.start_date !== startDate) {

            await api.updateRecord(
                COLLECTION_TASKS,
                task.id,
                {
                    start_date: startDate
                }
            );
        }

        nextStart.setDate(
            nextStart.getDate() + task.duration
        );
    }
}

// =====================================================
// GANTT ZOOM
// =====================================================
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
