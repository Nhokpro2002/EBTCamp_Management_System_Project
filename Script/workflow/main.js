import * as utils from "../utils/utils.js";
import * as handleEvent from "./events.js";
import * as ui from "./ui.js";
import * as service from "./service.js";

import { workflowData, projectData, issueData } from "./states.js";

// =====================================================
// 1. Page Initialization
// =====================================================



// =====================================================
// 2. Gantt Configuration
// =====================================================

// ---------- General ----------
gantt.config.date_format = "%Y-%m-%d";
gantt.config.xml_date = "%Y-%m-%d";
gantt.config.readonly = false;
gantt.config.row_height = 38;
gantt.config.bar_height = 22;
gantt.config.grid_width = 340;
gantt.config.min_column_width = 50;
gantt.config.scale_height = 60;
gantt.config.autosize = false;
gantt.config.fit_tasks = true;
gantt.config.open_tree_initially = true;
gantt.config.order_branch = true;
gantt.config.order_branch_free = true;

// ---------- Drag & Drop ----------
gantt.config.drag_progress = true;
gantt.config.drag_move = false;
gantt.config.drag_resize = false;

// ---------- Display ----------
gantt.config.show_progress = true;
gantt.config.show_links = true;

gantt.config.highlight_critical_path = false;

// ====================================================
// 3. Auto Scheduling
// =====================================================
gantt.config.auto_scheduling = false;
gantt.config.auto_scheduling_strict = false;
//gantt.config.auto_scheduling = true;
//gantt.config.auto_scheduling_strict = true;
gantt.config.schedule_from_end = false;

// =====================================================
// 4. Timeline / Scale
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
// 5. Grid Configuration
// =====================================================

const iconMap = {
    design: "bi-bounding-box",
    mechanical: "bi-nut",
    assembly: "bi-gear",
    electric: "bi-lightning",
    program: "bi-motherboard"
};


gantt.config.columns = [
    // ---------- Task Name ----------
    {
        name: "name",
        label: "Task",
        tree: true,
        width: "*",

        template: (task) => {

            const key = (task.css || "").toLowerCase();
            const iconClass = iconMap[key];

            const icon =
                task.$level === 0 && iconClass
                    ? `<i class="bi ${iconClass} me-2"
                         style="color:${task.progressColor}"></i>`
                    : "";

            const addBtn =
                task.$level === 0
                    ? `<i class="bi bi-plus-circle add-task-icon"
                         data-id="${task.id}"
                         data-name="${task.text}"></i>`
                    : "";

            return task.$level === 0
                ? `<span class="stage-name">
                       ${icon}${task.text} ${addBtn}
                   </span>`
                : task.text;
        }
    },


    // ---------- Start Date ----------
    {
        name: "start_date",
        label: "Start",
        align: "center",
        width: 80
    },


    // ---------- Duration ----------
    {
        name: "duration",
        label: "Duration",
        align: "center",
        width: 60
    },


    // ---------- Progress ----------
    {
        name: "progress",
        label: "%",
        align: "center",
        width: 60,

        template: (task) => {
            return `${Math.round(task.progress * 100)}%`;
        }
    }
];

gantt.config.editable_columns = true;


// =====================================================
// 6. Gantt Plugins
// =====================================================

/*gantt.plugins({
    tooltip: true,
    auto_scheduling: true
});*/
gantt.plugins({
    tooltip: true
});

handleEvent.bindGanttEvents();
handleEvent.bindUIEvents();


// =====================================================
// 7. Task Styling
// =====================================================

gantt.templates.task_class = function (start, end, task) {

    const classes = [];

    // ---------- Custom Task Class ----------
    if (task.css) {
        classes.push(task.css);
    }


    // ---------- Locked Task ----------
    /*if (
        task.type !== gantt.config.types.project &&
        ui.isTaskLocked(task.id)
    ) {
        classes.push("task-disabled");
    }*/
    return classes.join(" ");
};


// =====================================================
// 8. Task Text
// =====================================================

gantt.templates.task_text = function (start, end, task) {
    return task.text;
};


// =====================================================
// 9. Tooltip
// =====================================================

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
// 11. Page Data Initialization
// =====================================================

async function initPage() {
    // ---------- Get Project ID ----------
    const projectID =
        new URLSearchParams(location.search).get("projectID");

    if (!projectID) {
        utils.showError("Project ID is missing from the workflow URL.");
        return;
    }

    workflowData.projectID = projectID;

    try {
        // ---------- Init Gantt ----------
        gantt.init("gantt_here");

        // ---------- Load Project ----------
        await service.loadProjectData(projectID);

        document.querySelector(".project-info-name").textContent =
            projectData.projectName || localStorage.getItem("projectName") || "";

        // ---------- Project Date ----------
        document.getElementById("project-start-date").textContent =
            utils.formatDateDisplay(projectData.startDate);

        document.getElementById("project-end-date").textContent =
            utils.formatDateDisplay(projectData.endDate);

        // ---------- Load Stages ----------
        await service.loadStageData(projectID);

        service.mappingData();

        gantt.parse(projectData);

        updateProjectStatistics();

        await service.loadIssueData(projectID);

        document.querySelector(".issue-count").textContent = `(${issueData.issue.length})`;

        renderIssues();

        service.setZoom();
    } catch (error) {
        console.error(error);
        utils.showError("Failed to load workflow data.");
    }
}


// =====================================================
// 12. Start Application
// =====================================================

initPage();


const body = document.getElementById("issueTableBody");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const stageFilter = document.getElementById("stageFilter");

document.querySelectorAll(".summary-item").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".summary-item")
            .forEach(item => item.classList.remove("active"));

        button.classList.add("active");
        renderIssues();
    });
});

document.getElementById("issueForm").addEventListener("submit", async event => {
    event.preventDefault();

    await service.makeIssue();

    // await loadIssues(); // nếu muốn load lại data từ PocketBase
    renderIssues();
});

function renderIssues() {
    const keyword = searchInput.value.trim().toLowerCase();

    const filtered = issueData.issue.filter(issue => {
        const matchesStage =
            stageFilter.value === "all" ||
            issue.related_stage === stageFilter.value;
        const haystack = [
            issue.id,
            issue.title,
            issue.description,
            issue.related_stage,
            issue.related_task,
            issue.reporter,
            issue.created_date
        ].join(" ").toLowerCase();

        return matchesStage &&
            (!keyword || haystack.includes(keyword));
    });

    body.innerHTML = filtered.map(issue => `
        <tr>
            <td class="check">
                <input type="checkbox" class="row-check">
            </td>
            <td>
                <span class="issue-id">${issue.id}</span>
            </td>
            <td>
                <span class="issue-title">
                    ${service.escapeHtml(issue.title)}
                </span>
            </td>
            <td class="description"
                title="${service.escapeHtml(issue.description || "")}">
                ${service.escapeHtml(issue.description || "")}
            </td>
            <td>
                <span class="stage-badge ${service.getStageClass(issue.related_stage)}">
                ● ${service.escapeHtml(issue.related_stage || "")}
                </span>
            </td>
            <td>
                ${service.escapeHtml(issue.related_task || "")}
            </td>
            <td>
                <div class="assignee">
                    <!--<span class="avatar">
                        ${(issue.reporter)} 
                    </span>-->
                    <!--Sau sẽ là avatar-->
                    ${service.escapeHtml(issue.reporter || "")}
                </div>
            </td>
            <td>
                ${utils.formatDateDisplay(issue.created_date) || ""}
            </td>
        </tr>
    `).join("");

    emptyState.classList.toggle(
        "hidden",
        filtered.length !== 0
    );
}


[searchInput, stageFilter]
    .forEach(el => el.addEventListener("input", renderIssues));

const modal = document.getElementById("issueModal");


window.viewIssue = id => {
    const issue = issueData.issue.find(item => item.id === id);
    if (issue) {
        alert(`${issue.id} - ${issue.title}\n\n${issue.description}`);
    }
};

renderIssues();



// =====================================================
// 10. Project Statistics
// =====================================================
function getProjectTasks() {
    return projectData.data.filter(task => task.parent);
}

function getTotalTaskCount() {
    return getProjectTasks().length;
}

function getOverallProgress() {
    const tasks = getProjectTasks();
    if (tasks.length === 0) {
        return 0;
    }

    const totalProgress = tasks.reduce(
        (sum, task) => sum + (task.progress || 0),
        0
    );

    return totalProgress / tasks.length;
}

function updateProjectStatistics() {
    const totalTaskCount =
        getTotalTaskCount();
    const overallProgress =
        getOverallProgress();
    document.getElementById(
        "total-task-count"
    ).textContent =
        totalTaskCount;
    ui.updateProgress(
        overallProgress * 100
    );
}
