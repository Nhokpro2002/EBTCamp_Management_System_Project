
import * as api from "../services/generic.api.js";

let workflowData = {
    projectID: null,
    stages: [],
    tasks: []
};

let tomSelectTaskHandler = null;

let userMap = null;

const COLLECTION_USERS = "Users";
const COLLECTION_TASKS = "Tasks";


// =====================================================
// DHTMLX Gantt Configuration
// =====================================================
gantt.config.date_format = "%Y-%m-%d";
gantt.config.xml_date = "%Y-%m-%d";
gantt.config.readonly = false;
gantt.config.drag_progress = true;
gantt.config.drag_move = true;
gantt.config.drag_resize = true;
gantt.config.open_tree_initially = true;
gantt.config.autosize = false;
gantt.config.row_height = 38;
gantt.config.bar_height = 22;
gantt.config.grid_width = 340;
gantt.config.min_column_width = 50;
gantt.config.scale_height = 60;
gantt.config.show_progress = true;
gantt.config.show_links = true;
gantt.config.highlight_critical_path = false;
gantt.config.order_branch = true;
gantt.config.order_branch_free = true;
gantt.config.fit_tasks = true;

// =========================================================
// Auto Schedule
// =========================================================
gantt.config.auto_scheduling = true;
gantt.config.auto_scheduling_strict = true;
gantt.config.schedule_from_end = false;


// =====================================================
// Timeline
// =====================================================
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

// =====================================================
// Grid
// =====================================================

gantt.config.columns = [
    {
        name: "name",
        label: "Task",
        tree: true,
        width: "*",
        template: function (task) {
            if (task.$level === 0) {
                return `
                    <span class="stage-name">${task.text}</span>

                    <button
                        class="btn btn-sm btn-link open-create-task-popup-btn p-0 ms-2"
                        data-id="${task.id}"
                        title="Add Task">
                        <i class="bi bi-node-plus-fill"></i>
                    </button>
                `;
            }
            return task.text;
        }
    },
    {
        name: "start_date",
        label: "Start",
        align: "center",
        width: 80
    },
    {
        name: "duration",
        label: "Duration",
        align: "center",
        width: 60
    },
    {
        name: "progress",
        label: "%",
        align: "center",
        width: 60,

        template(task) {
            return Math.round(task.progress * 100) + "%";
        }
    }
];


// =====================================================
// Task Color
// =====================================================
gantt.templates.task_class = function (start, end, task) {
    return task.css || "";
};
gantt.attachEvent("onScroll", renderTodayLine);
gantt.attachEvent("onTaskDrag", renderTodayLine);

gantt.attachEvent("onGanttRender", function () {
    renderTodayLine();
});

// =====================================================
// Left Icon
// =====================================================

gantt.templates.grid_file = function (item) {
    return "<i class='bi bi-file-earmark'></i>";
};

// =====================================================
// Tooltip
// =====================================================
gantt.plugins({
    tooltip: true,
    auto_scheduling: true
});

gantt.templates.tooltip_text = function (start, end, task) {
    return `
        <div style="padding:10px">
            <b>${task.text}</b>
            <hr>
            Start :
            ${gantt.templates.tooltip_date_format(start)}
            <br>
            End :
            ${gantt.templates.tooltip_date_format(end)}
            <br>
            Progress :
            ${Math.round(task.progress * 100)}%
        </div>
    `;
};


// =====================================================
// Task Text
// =====================================================
gantt.templates.task_text = function (start, end, task) {
    return task.text;
};

// =====================================================
// Today Line
// =====================================================
function renderTodayLine() {
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

gantt.attachEvent("onGanttRender", function () {
    renderTodayLine();
});

// =====================================================
// Task Color By Stage
// =====================================================

function setTaskColor(task) {
    switch (task.css) {
        case "design":
            task.color = "#1976d2";
            task.progressColor = "#0d47a1";
            break;

        case "mechanical":
            task.color = "#00acc1";
            task.progressColor = "#00838f";
            break;

        case "assembly":
            task.color = "#43a047";
            task.progressColor = "#2e7d32";
            break;

        case "electric":
            task.color = "#fb8c00";
            task.progressColor = "#ef6c00";
            break;

        case "program":
            task.color = "#7b1fa2";
            task.progressColor = "#512da8";
            break;
    }
}

gantt.attachEvent("onTaskLoading", function (task) {
    setTaskColor(task);
    return true;
});

// =====================================================
// Click Event
// =====================================================

gantt.attachEvent("onTaskClick", function (id) {
    const task = gantt.getTask(id);
    //console.log(task);
    return true;
});

// =====================================================
// Drag Event
// =====================================================
gantt.attachEvent("onAfterTaskDrag", function (id) {
    //console.log("Task Updated");
});

// =====================================================
// Double Click
// =====================================================
gantt.attachEvent("onTaskDblClick", function (id) {
    //console.log(gantt.getTask(id));
    return false;
});


// =====================================================
// Zoom Buttons
// =====================================================
function changeView(mode) {
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


// =====================================================
// Init
// =====================================================
gantt.init("gantt_here");

// =====================================================
// Data
// =====================================================

const projectData = {
    data: [
        //==================================================
        // DESIGN
        //==================================================
        {
            id: 1,
            text: "🎨 Design",
            start_date: "2026-07-01",
            duration: 10,
            progress: 0.45,
            open: true,
            type: gantt.config.types.project,
            css: "design"
        },
        {
            id: 11,
            parent: 1,
            text: "Design Frame",
            start_date: "2026-07-01",
            duration: 2,
            progress: 1,
            css: "design"
        },
        {
            id: 12,
            parent: 1,
            text: "Design Conveyor",
            start_date: "2026-07-03",
            duration: 2,
            progress: 0.8,
            css: "design"
        },
        {
            id: 13,
            parent: 1,
            text: "Design Sensor Bracket",
            start_date: "2026-07-05",
            duration: 2,
            progress: 0.3,
            css: "design"
        },
        {
            id: 14,
            parent: 1,
            text: "Design Cover",
            start_date: "2026-07-07",
            duration: 2,
            progress: 0,
            css: "design"
        },

        //==================================================
        // MECHANICAL
        //==================================================
        {
            id: 2,
            text: "⚙ Mechanical",
            start_date: "2026-07-03",
            duration: 18,
            progress: 0.25,
            open: true,
            type: gantt.config.types.project,
            css: "mechanical"
        },
        {
            id: 21,
            parent: 2,
            text: "Machine Frame",
            start_date: "2026-07-03",
            duration: 4,
            progress: 1,
            css: "mechanical"
        },
        {
            id: 22,
            parent: 2,
            text: "Machine Conveyor",
            start_date: "2026-07-07",
            duration: 4,
            progress: 0.5,
            css: "mechanical"
        },
        {
            id: 23,
            parent: 2,
            text: "Machine Sensor Bracket",
            start_date: "2026-07-11",
            duration: 3,
            progress: 0.1,
            css: "mechanical"
        },
        {
            id: 24,
            parent: 2,
            text: "Machine Cover",
            start_date: "2026-07-14",
            duration: 3,
            progress: 0,
            css: "mechanical"
        },

        //==================================================
        // ASSEMBLY
        //==================================================
        {
            id: 3,
            text: "🔧 Assembly",
            start_date: "2026-07-07",
            duration: 18,
            progress: 0.1,
            open: true,
            type: gantt.config.types.project,
            css: "assembly"
        },
        {
            id: 31,
            parent: 3,
            text: "Assembly Frame",
            start_date: "2026-07-07",
            duration: 2,
            progress: 1,
            css: "assembly"
        },
        {
            id: 32,
            parent: 3,
            text: "Assembly Conveyor",
            start_date: "2026-07-11",
            duration: 2,
            progress: 0.3,
            css: "assembly"
        },
        {
            id: 33,
            parent: 3,
            text: "Assembly Sensor",
            start_date: "2026-07-15",
            duration: 2,
            progress: 0,
            css: "assembly"
        },
        {
            id: 34,
            parent: 3,
            text: "Assembly Cover",
            start_date: "2026-07-17",
            duration: 2,
            progress: 0,
            css: "assembly"
        },
        {
            id: 35,
            parent: 3,
            text: "Mechanical Complete",
            start_date: "2026-07-19",
            duration: 1,
            progress: 0,
            css: "assembly"
        },


        //==================================================
        // ELECTRIC
        //==================================================
        {
            id: 4,
            text: "⚡ Electric",
            start_date: "2026-07-20",
            duration: 8,
            progress: 0,
            open: true,
            type: gantt.config.types.project,
            css: "electric"
        },
        {
            id: 41,
            parent: 4,
            text: "Cabinet Wiring",
            start_date: "2026-07-20",
            duration: 2,
            css: "electric"
        },
        {
            id: 42,
            parent: 4,
            text: "Sensor Wiring",
            start_date: "2026-07-22",
            duration: 2,
            css: "electric"
        },
        {
            id: 43,
            parent: 4,
            text: "I/O Check",
            start_date: "2026-07-24",
            duration: 2,
            css: "electric"
        },
        {
            id: 44,
            parent: 4,
            text: "Power On Test",
            start_date: "2026-07-26",
            duration: 2,
            css: "electric"
        },

        //==================================================
        // PROGRAM
        //==================================================
        {
            id: 5,
            text: "💻 Write Program",
            start_date: "2026-07-02",
            duration: 20,
            progress: 0.35,
            open: true,
            type: gantt.config.types.project,
            css: "program"
        },
        {
            id: 51,
            parent: 5,
            text: "PLC Program",
            start_date: "2026-07-02",
            duration: 6,
            progress: 0.8,
            css: "program"
        },
        {
            id: 52,
            parent: 5,
            text: "HMI Screen",
            start_date: "2026-07-08",
            duration: 5,
            progress: 0.5,
            css: "program"
        },
        {
            id: 53,
            parent: 5,
            text: "Servo Logic",
            start_date: "2026-07-13",
            duration: 4,
            progress: 0.2,
            css: "program"
        },
        {
            id: 54,
            parent: 5,
            text: "Simulation Test",
            start_date: "2026-07-17",
            duration: 4,
            progress: 0,
            css: "program"
        }
    ],

    links: [
        // Design -> Mechanical
        { id: 1, source: 11, target: 21, type: "0" },
        { id: 2, source: 12, target: 22, type: "0" },
        { id: 3, source: 13, target: 23, type: "0" },
        { id: 4, source: 14, target: 24, type: "0" },

        // Mechanical chain
        { id: 5, source: 21, target: 22, type: "0" },
        { id: 6, source: 22, target: 23, type: "0" },
        { id: 7, source: 23, target: 24, type: "0" },

        // Mechanical -> Assembly
        { id: 8, source: 21, target: 31, type: "0" },
        { id: 9, source: 22, target: 32, type: "0" },
        { id: 10, source: 23, target: 33, type: "0" },
        { id: 11, source: 24, target: 34, type: "0" },

        // Assembly
        { id: 12, source: 31, target: 32, type: "0" },
        { id: 13, source: 32, target: 33, type: "0" },
        { id: 14, source: 33, target: 34, type: "0" },
        { id: 15, source: 34, target: 35, type: "0" },

        // Electric
        { id: 16, source: 35, target: 41, type: "0" },
        { id: 17, source: 41, target: 42, type: "0" },
        { id: 18, source: 42, target: 43, type: "0" },
        { id: 19, source: 43, target: 44, type: "0" },

        // Program
        { id: 20, source: 51, target: 52, type: "0" },
        { id: 21, source: 52, target: 53, type: "0" },
        { id: 22, source: 53, target: 54, type: "0" }
    ]
};
gantt.parse(projectData);
renderTodayLine();


// =========================================================
// Highlight Selected Task
// =========================================================

let currentTask = null;

gantt.attachEvent("onTaskSelected", function (id) {
    currentTask = id;
    //console.log("Selected :", gantt.getTask(id));
    return true;
});


// =========================================================
// Click Task
// =========================================================

gantt.attachEvent("onTaskClick", function (id) {
    const task = gantt.getTask(id);
    //console.table(task);
    return true;
});


// =========================================================
// Double Click
// =========================================================

gantt.attachEvent("onTaskDblClick", function (id) {
    const task = gantt.getTask(id);
    const newName = prompt("Task name", task.text);
    if (newName !== null && newName.trim() !== "") {
        task.text = newName.trim();
        gantt.updateTask(id);
    }
    return false;
});

// =========================================================
// Drag
// =========================================================

gantt.attachEvent("onBeforeTaskDrag", function (id) {
    //console.log("Drag Start");
    return true;
});


gantt.attachEvent("onAfterTaskDrag", function (id) {
    //console.log("Drag Finished");
});


// =========================================================
// Add Task
// =========================================================

gantt.attachEvent("onAfterTaskAdd", function (id, task) {
    //console.log("Task Added");
    //console.log(task);
});


// =========================================================
// Update Task
// =========================================================

gantt.attachEvent("onAfterTaskUpdate", function (id, task) {
    //console.log("Task Updated");
    //console.log(task);
});


// =========================================================
// Delete
// =========================================================

gantt.attachEvent("onAfterTaskDelete", function (id) {
    //console.log("Deleted :", id);
});

// =========================================================
// Link Created
// =========================================================

gantt.attachEvent("onAfterLinkAdd", function (id, link) {
    //console.log("New Dependency");
    //console.log(link);
});

// =========================================================
// Tooltip
// =========================================================
gantt.templates.tooltip_text = function (start, end, task) {
    return `
<div style="padding:12px">
<b style="font-size:15px">
${task.text}
</b>
<hr>
<b>Start :</b>
${gantt.templates.tooltip_date_format(start)}
<br>
<b>Finish :</b>
${gantt.templates.tooltip_date_format(end)}
<br>
<b>Duration :</b>
${task.duration} day(s)
<br>
<b>Progress :</b>
${Math.round(task.progress * 100)} %
</div>
`;
};


// =========================================================
// Zoom
// =========================================================
function setZoom(mode) {
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

// =========================================================
// Toolbar
// =========================================================
document.querySelector("#btnDay")?.addEventListener("click", function () {
    setZoom("day");
});

document.querySelector("#btnWeek")?.addEventListener("click", function () {
    setZoom("week");
});

document.querySelector("#btnMonth")?.addEventListener("click", function () {
    setZoom("month");
});

// =========================================================
// Add Task
// =========================================================
document.querySelector("#btnAddTask")?.addEventListener("click", function () {
    gantt.createTask();
});


// =========================================================
// Delete
// =========================================================
document.querySelector("#btnDeleteTask")?.addEventListener("click", function () {
    if (!currentTask)
        return;
    gantt.deleteTask(currentTask);
});

// =========================================================
// Export JSON
// =========================================================
document.querySelector("#btnExport")?.addEventListener("click", function () {
    //console.log(gantt.serialize());
});

// =========================================================
// Collapse All
// =========================================================

document.querySelector("#btnCollapse")?.addEventListener("click", function () {
    gantt.eachTask(function (task) {
        task.$open = false;
    });
    gantt.render();
});


// =========================================================
// Expand All
// =========================================================
document.querySelector("#btnExpand")?.addEventListener("click", function () {
    gantt.eachTask(function (task) {
        task.$open = true;
    });
    gantt.render();
});




let currentStageId = null;

document.addEventListener("click", function (e) {
    const btn = e.target.closest(".open-create-task-popup-btn");
    if (!btn)
        return;
    e.stopPropagation();
    currentStageId = btn.dataset.id;
    openTaskPopup(btn);
});

// ! Error
function openTaskPopup(button) {
    const popup = document.getElementById("task-create-popup");
    popup.classList.remove("d-none");
    const rect = button.getBoundingClientRect();
    popup.style.left =
        window.scrollX + rect.right + 12 + "px";
    popup.style.top =
        window.scrollY + rect.top + "px";

    resetCreateTaskForm();

    // process task handler
    renderTaskHandlerSelect()
}

function renderTaskHandlerSelect() {
    const $taskHandler = $("#task-handler");
    if (!$taskHandler.length) return;
    $taskHandler.empty();

    Object.values(userMap).forEach(user => {
        const $option = $("<option>", {
            value: user.id,
            text: user.employee_id
        });

        $taskHandler.append($option);
    });

    // Nếu chưa có instance TomSelect thì tạo mới
    if (!tomSelectTaskHandler) {

        tomSelectTaskHandler = new TomSelect(`#task-handler`, {
            plugins: ['remove_button'],
            hideSelected: true,
            create: false,
            placeholder: "Select task handlers",
        });

    } else {

        // Nếu đã có instance thì refresh options
        const instance = tomSelectTaskHandler;

        instance.clearOptions();

        Object.values(userMap).forEach(user => {
            instance.addOption({
                value: user.id,
                text: user.employee_id
            });
        });

        instance.refreshOptions(false);
    }
}

function resetCreateTaskForm() {
    // Name
    $("#task-name").val("");
    // Start Date
    $("#task-start-date").val("");
    // Duration
    $("#task-duration").val(1);

    if (tomSelectTaskHandler) {
        tomSelectTaskHandler.clear();
        tomSelectTaskHandler.setTextboxValue("");
        tomSelectTaskHandler.close();
    }
}

$("#back-project-page-button").on("click", function () {
    window.location.href = "project.html";
})

async function getUserData() {
    try {
        const users = await api.getRecords(COLLECTION_USERS);
        if (users) {
            userMap = Object.fromEntries(users.map(user => [user.id, user]));
        }
    } catch (error) {
        console.log("Failed load user data");
    }
}
//call function 
getUserData();

document.getElementById("btn-close-task-popup").addEventListener("click", function () {
    document.getElementById("task-create-popup").classList.add("d-none");
});

document.getElementById("btn-create-task").addEventListener("click", () => {
    createNewTask();
});

document.addEventListener("click", function (e) {
    const popup = document.getElementById("task-create-popup");
    if (popup.contains(e.target) || e.target.closest(".open-create-task-popup-btn")) {
        return;
    }
    popup.classList.add("d-none");
});

function makePayloadData() {
    const payload = {
        name: document.getElementById("task-name").value,
        start_date: document.getElementById("task-start-date").value,
        duration: Number(document.getElementById("task-duration").value),
        handler: Array.from(
            document.getElementById("task-handler")?.selectedOptions || []
        ).map(o => o.value),
        progress: 0,
        stage: currentStageId
    };
    resetCreateTaskForm();

    return payload;
}

async function createNewTask() {
    try {
        const payload = makePayloadData();
        const response = await api.createRecord(COLLECTION_TASKS, payload);
    } catch (error) {
        console.log(error);
    }
}

