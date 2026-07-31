import * as ui from "./ui.js";
import * as api from "./service.js";
import { workflowData, projectData } from "./states.js";

// =========================================================
// GANTT EVENTS
// =========================================================

async function saveTask(id) {

    const task = gantt.getTask(id);

    const success = await api.updateTask(
        id,
        {
            name: task.text,
            start_date: task.start_date,
            duration: task.duration,
            progress: task.progress,
            updatedBy:
                JSON.parse(localStorage.getItem("user"))
                    ?.employee_name ?? ""
        },
        workflowData.currentProjectID
    );



    if (!success)
        return;

}


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

        return true;
    });

    // -------------------------
    // Double click → dùng Lightbox mặc định
    // -------------------------
    gantt.config.details_on_dblclick = true;

    gantt.attachEvent(
        "onTaskDblClick",
        function (id) {

            if (ui.isTaskLocked(id)) {
                return false;
            }

            return true;
        }
    );

    // Chặn thay đổi progress nếu task đang bị khóa
    gantt.attachEvent(
        "onBeforeTaskUpdate",
        function (id, task) {

            if (ui.isTaskLocked(id)) {
                return false;
            }


            return true;
        }
    );

    // -------------------------
    // Add Task
    // -------------------------
    gantt.attachEvent("onAfterTaskAdd", function (id, task) {
        // Nếu có DataProcessor thì KHÔNG cần gọi API ở đây
        // save handled automatically or via dp
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
    gantt.attachEvent(
        "onBeforeTaskDrag",
        function (id) {

            if (ui.isTaskLocked(id)) {
                return false;
            }

            return true;
        }
    );

    gantt.attachEvent("onAfterTaskDrag", async function (id) {

        await saveTask(id);

        gantt.parse(projectData);
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
    document.querySelector("#btnDay")?.addEventListener("click", () => setZoom("day"));
    document.querySelector("#btnWeek")?.addEventListener("click", () => setZoom("week"));
    document.querySelector("#btnMonth")?.addEventListener("click", () => setZoom("month"));

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

    const buttons = {
        day: document.getElementById("btnDay"),
        week: document.getElementById("btnWeek"),
        month: document.getElementById("btnMonth")
    };

    function activeZoom(level) {
        Object.values(buttons).forEach(btn => {
            btn.classList.remove("active-day", "active-week", "active-month");
        });

        buttons[level].classList.add(`active-${level}`);
    }

    buttons.day.addEventListener("click", () => {
        activeZoom("day");
        setZoom("day");
    });

    buttons.week.addEventListener("click", () => {
        activeZoom("week");
        setZoom("week");
    });

    buttons.month.addEventListener("click", () => {
        activeZoom("month");
        setZoom("month");
    });


}

gantt.ext.zoom.init({
    levels: [
        {
            name: "day",
            scale_height: 60,
            min_column_width: 50,
            scales: [
                { unit: "month", step: 1, format: "%F %Y" },
                { unit: "day", step: 1, format: "%d" }
            ]
        },
        {
            name: "week",
            scale_height: 60,
            min_column_width: 70,
            scales: [
                { unit: "month", step: 1, format: "%F %Y" },
                {
                    unit: "week",
                    step: 1,
                    format(date) {
                        const end = gantt.date.add(date, 6, "day");
                        return `${gantt.date.date_to_str("%d/%m")(date)} - ${gantt.date.date_to_str("%d/%m")(end)}`;
                    }
                }
            ]
        },
        {
            name: "month",
            scale_height: 60,
            min_column_width: 80,
            scales: [
                { unit: "year", step: 1, format: "%Y" },
                { unit: "month", step: 1, format: "%F" }
            ]
        }
    ]
});

function setZoom(level) {
    gantt.ext.zoom.setLevel(level);
}



