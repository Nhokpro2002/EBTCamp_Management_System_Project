
import * as api from "../services/generic.api.js";
import * as handleEvent from "./events.js";

import { workflowData, projectData } from "./states.js";
import * as service from "./service.js";

handleEvent.bindGanttEvents();
handleEvent.bindUIEvents();


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
        template: (task) => {

            const iconMap = {
                design: "bi-bounding-box",
                mechanical: "bi-nut",
                assembly: "bi-gear",
                electric: "bi-lightning",
                program: "bi-motherboard"
            };

            const icon = task.$level === 0
                ? `<i class="bi ${iconMap[task.css]} me-1"></i>`
                : "";

            return task.$level === 0
                ? `<span class="stage-name">${icon}${task.text}</span>`
                : task.text;
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
// Init
// =====================================================
gantt.init("gantt_here");

gantt.parse(projectData);

async function initPage() {
    gantt.init("gantt_here");

    const projectID = new URLSearchParams(location.search).get("projectID");

    await service.loadStageData(projectID);

    service.mappingData();

    gantt.parse(projectData);

    service.setZoom();

}

initPage();
