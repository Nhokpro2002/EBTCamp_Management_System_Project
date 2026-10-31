import * as ui from "./ui.js";

// =====================================================
// GANTT SETUP
// Cấu hình DHTMLX Gantt (gọi một lần trước gantt.init)
// =====================================================

export function setupGantt() {
    setupZoom();
    setupGeneralConfig();
    setupColumns();
    setupTemplates();
}

// ---------- Zoom levels ----------
function setupZoom() {
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
}

export function setZoom(level) {
    gantt.ext.zoom.setLevel(level);
}

// ---------- General ----------
function setupGeneralConfig() {
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.xml_date = "%Y-%m-%d";
    gantt.config.readonly = false;
    gantt.config.row_height = 38;
    gantt.config.bar_height = 28; // Gantt tự căn giữa thanh trong dòng 38px
    gantt.config.grid_width = 340;
    gantt.config.min_column_width = 50;
    gantt.config.scale_height = 60;
    gantt.config.autosize = false;
    gantt.config.fit_tasks = true;
    gantt.config.open_tree_initially = true;
    gantt.config.order_branch = true;
    gantt.config.order_branch_free = true;
    gantt.config.details_on_dblclick = true;
    gantt.config.editable_columns = true;

    // Popup (lightbox) khi double click task: đổi nhãn "Description" thành "Task name"
    // và thêm lịch sử báo cáo (nội dung được events.js load khi mở popup)
    gantt.locale.labels.section_task_name = "Task name";
    gantt.locale.labels.section_report_history = "Report history";
    gantt.config.lightbox.sections = [
        { name: "task_name", height: 70, map_to: "text", type: "textarea", focus: true },
        { name: "time", type: "duration", map_to: "auto" },
        // map_to là field tạm, không được lưu về database (xem saveTask)
        { name: "report_history", type: "template", map_to: "report_history_html" }
    ];

    // Drag & Drop
    gantt.config.drag_progress = false;
    gantt.config.drag_move = false;
    gantt.config.drag_resize = false;

    // Display
    gantt.config.show_progress = true;
    gantt.config.show_links = false;
    gantt.config.highlight_critical_path = false;

    // Auto scheduling
    gantt.config.auto_scheduling = false;
    gantt.config.auto_scheduling_strict = false;
    gantt.config.schedule_from_end = false;

    // Timeline scale mặc định (giống zoom "day")
    gantt.config.scales = [
        { unit: "month", step: 1, format: "%F %Y" },
        { unit: "day", step: 1, format: "%d" }
    ];
}

// ---------- Grid columns ----------
const STAGE_ICONS = {
    design: "bi-bounding-box",
    mechanical: "bi-nut",
    assembly: "bi-gear",
    electric: "bi-lightning",
    program: "bi-motherboard"
};

function setupColumns() {
    gantt.config.columns = [
        {
            name: "name",
            label: "Task",
            tree: true,
            width: "*",
            template: renderTaskNameCell
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
        }
    ];
}

/**
 * Stage: icon (bấm để tạo task) + tên; task: chỉ tên.
 */
function renderTaskNameCell(task) {
    if (task.$level !== 0) {
        return task.text;
    }

    const iconClass = STAGE_ICONS[(task.css || "").toLowerCase()];
    const icon = iconClass
        ? `<button type="button" class="stage-icon-button"
             data-id="${task.id}"
             data-name="${task.text}"
             aria-label="Create task in ${task.text}"
             title="Create task in ${task.text}">
             <i class="bi ${iconClass}" aria-hidden="true"
                style="color:${task.progressColor}"></i>
           </button>`
        : "";

    return `<span class="stage-name">
               ${icon}<span>${task.text}</span>
           </span>`;
}

// ---------- Templates ----------
function setupTemplates() {
    gantt.templates.task_class = function (start, end, task) {
        const classes = [];

        if (task.css) {
            classes.push(task.css);
        }

        // Task quá hạn mà chưa Done
        if (ui.getDelayDays(task)) {
            classes.push("task-delayed");
        }

        return classes.join(" ");
    };

    // Chữ 2 lớp: màu đậm của stage trên phần chưa hoàn thành,
    // màu trắng chỉ trong vùng tiến độ (cắt theo % progress) → luôn đọc rõ.
    gantt.templates.task_text = function (start, end, task) {
        const progress = Math.max(0, Math.min(1, Number(task.progress) || 0));
        const hiddenRight = (1 - progress) * 100;

        return `${task.text}<span class="task-text-on-progress" aria-hidden="true"
                    style="clip-path: inset(0 ${hiddenRight}% 0 0)">${task.text}</span>`;
    };

    // Tiêu đề popup mặc định dùng task_text → khai báo riêng để chỉ hiện chữ thường
    gantt.templates.lightbox_header = function (start, end, task) {
        return `${gantt.templates.task_time(start, end, task)} ${task.text}`;
    };
}
