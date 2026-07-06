import * as ui from "./ui.js";
import * as api from "./service.js";
import { workflowData } from "./states.js";

//
// =========================================================
// GANTT EVENTS
// =========================================================
export function bindGanttEvents() {

    // -------------------------
    // Select Task
    // -------------------------
    gantt.attachEvent("onTaskSelected", function (id) {
        workflowData.currentTaskID = id;
        return true;
    });

    // -------------------------
    // Click Task (optional - debug only)
    // -------------------------
    gantt.attachEvent("onTaskClick", function (id) {
        // const task = gantt.getTask(id);
        return true;
    });

    // -------------------------
    // Double click → dùng Lightbox mặc định
    // -------------------------
    gantt.config.details_on_dblclick = true;

    gantt.attachEvent("onTaskDblClick", function () {
        return true; // mở lightbox mặc định
    });

    // -------------------------
    // Add Task
    // -------------------------
    gantt.attachEvent("onAfterTaskAdd", function (id, task) {
        // Nếu có DataProcessor thì KHÔNG cần gọi API ở đây
        // save handled automatically or via dp
        return true;
    });

    // -------------------------
    // Update Task
    // -------------------------
    gantt.attachEvent("onAfterTaskUpdate", async function (id, task) {
        const updatedTaskData = {
            name: task.text,
            start_date: task.start_date,
            duration: task.duration,
            progress: task.progress,
        };

        const result = await api.updateTask(id, updatedTaskData);
        return true;
    });

    gantt.attachEvent("onLightboxSave", async function (id, task) {

        const updatedTaskData = {
            name: task.text,
            start_date: task.start_date,
            duration: task.duration,
            progress: task.progress,
        };

        const result = await api.updateTask(id, updatedTaskData);
        return true;
    });

    // -------------------------
    // Delete Task
    // -------------------------
    gantt.attachEvent("onAfterTaskDelete", async function (id) {
        // Call api delete task
        const result = await api.deleteTask(id);

        if (workflowData.currentTaskID === id) {
            workflowData.currentTaskID = null;
        }
        return true;
    });

    // -------------------------
    // Drag
    // -------------------------
    gantt.attachEvent("onBeforeTaskDrag", function () {
        return true;
    });

    gantt.attachEvent("onAfterTaskDrag", function () {
        // dùng để trigger autosave nếu cần
        return true;
    });

    // -------------------------
    // Links (dependency)
    // -------------------------
    gantt.attachEvent("onAfterLinkAdd", function (id, link) {
        return true;
    });

    // -------------------------
    // Task styling
    // -------------------------
    gantt.attachEvent("onTaskLoading", function (task) {
        ui.setTaskColor(task);
        return true;
    });

    gantt.attachEvent("onScroll", ui.renderTodayLine);

    gantt.attachEvent("onTaskDrag", ui.renderTodayLine);

    gantt.attachEvent("onGanttRender", function () {
        ui.renderTodayLine();
    });

    gantt.attachEvent("onGanttRender", function () {
        ui.renderTodayLine();
    });

    gantt.config.auto_scheduling = true;

    gantt.plugins({
        auto_scheduling: true
    });

}

//
// =========================================================
// UI EVENTS (Toolbar + Buttons)
// =========================================================
export function bindUIEvents() {

    // -------------------------
    // Zoom
    // -------------------------
    //document.querySelector("#btnDay")?.addEventListener("click", () => setZoom("day"));
    //document.querySelector("#btnWeek")?.addEventListener("click", () => setZoom("week"));
    //document.querySelector("#btnMonth")?.addEventListener("click", () => setZoom("month"));

    // -------------------------
    // Add Task → dùng Lightbox mặc định
    // -------------------------
    document.querySelector("#btnAddTask")?.addEventListener("click", function () {
        gantt.createTask(); // chuẩn DHTMLX
    });

    // -------------------------
    // Delete Task
    // -------------------------
    document.querySelector("#btnDeleteTask")?.addEventListener("click", function () {
        const id = gantt.getSelectedId();
        if (!id) return;

        gantt.deleteTask(id);
    });

    // -------------------------
    // Export
    // -------------------------
    document.querySelector("#btnExport")?.addEventListener("click", function () {
        const data = gantt.serialize();
        console.log(data);
    });

    // -------------------------
    // Collapse All
    // -------------------------
    document.querySelector("#btnCollapse")?.addEventListener("click", function () {
        gantt.batchUpdate(() => {
            gantt.eachTask(task => task.$open = false);
        });
        gantt.render();
    });

    // -------------------------
    // Expand All
    // -------------------------
    document.querySelector("#btnExpand")?.addEventListener("click", function () {
        gantt.batchUpdate(() => {
            gantt.eachTask(task => task.$open = true);
        });
        gantt.render();
    });

    document.querySelector("#back-project-page-button")?.addEventListener("click", function () {
        window.location.href = "project.html";
    })

    document.addEventListener("click", function (e) {
        const icon = e.target.closest(".add-task-icon");
        if (!icon) return;

        ui.openAddTaskModal(icon.dataset.id, icon.dataset.name);
    });

    document.addEventListener("click", function (e) {
        const id = e.target.id;
        if (id === "btnCancel") {
            ui.closeTaskModal();
        }
        if (id === "btnCreate") {
            ui.submitTask();
        }
    });


}


