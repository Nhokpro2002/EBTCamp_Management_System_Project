import * as ui from "./ui.js";

// =====================================================
// GANTT SETUP
// Cấu hình DHTMLX Gantt (gọi một lần trước gantt.init)
// =====================================================

export function setupGantt() {
    // Rê chuột vào bất kỳ điểm nào trên thanh → hiện tên task + số ngày trễ (nếu có)
    gantt.plugins({ tooltip: true });

    // Giữ ngôn ngữ mặc định (tiếng Anh) của DHTMLX cho tên tháng và các nút popup:
    // gói "vi" có sẵn trong dhtmlxgantt.js bị sai bảng mã → lỗi font chữ.
    setupZoom();
    setupGeneralConfig();
    setupColumns();
    setupTemplates();
}

// ---------- Zoom levels ----------

/**
 * Số tuần trong năm theo ISO-8601: tuần bắt đầu thứ Hai,
 * tuần 1 là tuần chứa ngày thứ Năm đầu tiên của năm. VD 19/10/2026 → 43.
 */
function weekNumberFormat(date) {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    // Dời về thứ Năm của cùng tuần (thứ Hai = 1 ... Chủ nhật = 7)
    day.setDate(day.getDate() + 4 - (day.getDay() || 7));
    const yearStart = new Date(day.getFullYear(), 0, 1);
    return Math.ceil(((day - yearStart) / 86400000 + 1) / 7);
}

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
                        // Số tuần trong năm theo ISO-8601 (tuần bắt đầu thứ Hai), VD: "Week 41"
                        unit: "week",
                        step: 1,
                        format: date => `Week ${weekNumberFormat(date)}`
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
    // Đọc / ghi với database: yyyy-mm-dd (định dạng PocketBase)
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.xml_date = "%Y-%m-%d";
    // Hiển thị: cột "Bắt đầu" chỉ ngày/tháng (gọn), tiêu đề popup task dd/mm/yyyy
    gantt.config.date_grid = "%d/%m";
    gantt.config.task_date = "%d/%m/%Y";
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
    gantt.locale.labels.section_task_name = "Tên task";
    gantt.locale.labels.section_report_history = "Lịch sử báo cáo";
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
            // Chỉ ngày/tháng (gantt.config.date_grid) → cột hẹp hơn, nhường chỗ cho tên task
            name: "start_date",
            label: "Bắt đầu",
            align: "center",
            width: 64
        },
        {
            name: "duration",
            label: "Số ngày",
            align: "center",
            width: 58
        }
    ];
}

/**
 * Stage: icon (bấm để tạo task) + tên; task: chỉ tên.
 * title = tên đầy đủ (rê chuột xem khi tên quá dài bị cắt).
 */
function renderTaskNameCell(task) {
    if (task.$level !== 0) {
        return `<span class="task-name-cell" title="${ui.escapeHtml(task.text)}">${ui.escapeHtml(task.text)}</span>`;
    }

    const iconClass = STAGE_ICONS[(task.css || "").toLowerCase()];
    const icon = iconClass
        ? `<button type="button" class="stage-icon-button"
             data-id="${task.id}"
             data-name="${task.text}"
             aria-label="Tạo task trong ${task.text}"
             title="Tạo task trong ${task.text}">
             <i class="bi ${iconClass}" aria-hidden="true"
                style="color:${task.stageColor || task.progressColor}"></i>
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

    // Thanh stage — chữ 2 lớp: màu đậm trên phần chưa hoàn thành,
    // màu trắng chỉ trong vùng tiến độ (cắt theo % progress) → luôn đọc rõ.
    gantt.templates.task_text = function (start, end, task) {
        // Thanh task: không hiện chữ (tên task đã có ở cột trái)
        if (task.type !== gantt.config.types.project) {
            return "";
        }

        const progress = Math.max(0, Math.min(1, Number(task.progress) || 0));
        const hiddenRight = (1 - progress) * 100;

        return `${task.text}<span class="task-text-on-progress" aria-hidden="true"
                    style="clip-path: inset(0 ${hiddenRight}% 0 0)">${task.text}</span>`;
    };

    // Khung thông tin khi rê chuột vào thanh (task, stage) và đoạn "Trễ x ngày"
    const formatTooltipDate = gantt.date.date_to_str("%d/%m/%Y");
    gantt.templates.tooltip_text = function (start, end, task) {
        const name = ui.escapeHtml(task.text);
        const percent = Math.round(Math.max(0, Math.min(1, Number(task.progress) || 0)) * 100);

        if (task.type === gantt.config.types.project) {
            return `<div class="gantt-tip-title">${name}</div>
                    <div class="gantt-tip-row">Tiến độ: <b>${percent}%</b></div>`;
        }

        // end_date của Gantt là mốc 00:00 ngày kế tiếp → ngày kết thúc thật = end - 1 ngày
        const lastDay = gantt.date.add(end, -1, "day");
        const delayDays = ui.getDelayDays(task);

        return `<div class="gantt-tip-title">${name}</div>
                <div class="gantt-tip-row">${formatTooltipDate(start)} → ${formatTooltipDate(lastDay)}</div>
                <div class="gantt-tip-row">Tiến độ: <b>${percent}%</b></div>
                ${delayDays ? `<div class="gantt-tip-delay"><i class="bi bi-exclamation-triangle-fill"></i> Trễ ${delayDays} ngày</div>` : ""}`;
    };

    // Tiêu đề popup mặc định dùng task_text → khai báo riêng để chỉ hiện chữ thường
    gantt.templates.lightbox_header = function (start, end, task) {
        return `${gantt.templates.task_time(start, end, task)} ${task.text}`;
    };
}
