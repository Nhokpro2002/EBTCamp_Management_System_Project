
// change name task and save database
// drag task bar moving new position => save change to database
// change task progress => save database
// change project name on the header
// design idel to delete task

import { workflowData, projectData } from "./states.js";
import * as service from "./service.js";
import * as api from "./service.js"
import * as utils from "../utils/utils.js";

// =====================================================
// Today Line
// =====================================================
export function renderTodayLine() {
    const today = new Date();
    const pos = gantt.posFromDate(today);

    const container = gantt.$task;
    if (!container) return;

    // remove cũ
    const old = document.getElementById("today_line");
    if (old) old.remove();

    const oldLabel = document.getElementById("today_label");
    if (oldLabel) oldLabel.remove();

    // ================= LINE =================
    const line = document.createElement("div");
    line.id = "today_line";
    line.className = "gantt_today_line";
    line.style.left = pos + "px";
    line.style.top = "0px";
    line.style.height = gantt.$task.offsetHeight + "px";

    // ================= LABEL =================
    const label = document.createElement("div");
    label.id = "today_label";
    label.className = "gantt_today_label";
    label.style.left = (pos + 6) + "px";
    label.style.top = "5px";
    label.innerText = "Today";

    container.appendChild(line);
    container.appendChild(label);
}

// =====================================================
// Task Color By Stage
// =====================================================
export function setTaskColor(task) {
    switch (task.css) {

        case "design":
            task.color = "#a1d5ff";
            task.progressColor = "#073374";
            break;

        case "mechanical":
            task.color = "#bcf7ff";
            task.progressColor = "#00705d";
            break;

        case "assembly":
            task.color = "#c9fbca";
            task.progressColor = "#006307";
            break;

        case "electric":
            task.color = "#ffe3b9";
            task.progressColor = "#923300";
            break;

        case "program":
            task.color = "#f6c6ff";
            task.progressColor = "#2f0168";
            break;
    }
}

export function openAddTaskModal(stageID, stageName) {
    workflowData.currentStageID = stageID;

    document.getElementById("stage-name").value = stageName;
    document.getElementById("task-name").value = "";
    document.getElementById("start-date").value = "";
    document.getElementById("start-date").min = service.getMinStartDate(stageID);

    document.getElementById("duration").value = "";

    const modal = document.getElementById("taskModal");
    modal.classList.add("open");
}

export async function submitTask() {
    const response = await api.createNewTask();

    if (response) {
        // 1. add vào global tasks
        workflowData.tasks.push(response);

        // 2. make object for gantt
        const newObject = {
            id: response.id,
            parent: response.stage,
            text: response.name,
            start_date: response.start_date,
            duration: response.duration ?? 0,
            progress: response.progress ?? 0,
            css: response.css
        };

        projectData.data.push(newObject);

        // 3. add vào taskGroups theo stage
        if (!workflowData.taskGroups[response.stage]) {
            workflowData.taskGroups[response.stage] = [];
        }

        const stageTasks = workflowData.taskGroups[response.stage];

        // lấy task cuối cùng trong stage (trước khi push)
        const lastTaskInStage = stageTasks.length
            ? stageTasks[stageTasks.length - 1]
            : null;

        stageTasks.push(response);

        // 4. tạo link nếu có task trước đó trong cùng stage
        if (lastTaskInStage) {
            const newLink = {
                id: projectData.links.length
                    ? Math.max(...projectData.links.map(l => l.id)) + 1
                    : 1,
                source: lastTaskInStage.id,
                target: response.id,
                type: "0"
            };

            projectData.links.push(newLink);
        }

        // 5. render lại gantt
        gantt.parse(projectData);
    }

    closeTaskModal();
}

export function closeTaskModal() {
    document.getElementById("taskModal").classList.remove("open");
} 