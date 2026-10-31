import * as utils from "../utils/utils.js";

// =====================================================
// DOM ELEMENTS
// =====================================================
const taskModal = document.getElementById("taskModal");
const issueTableBody = document.getElementById("issueTableBody");
const issueEmptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const stageFilter = document.getElementById("stageFilter");

const zoomButtons = {
    day: document.getElementById("btnDay"),
    week: document.getElementById("btnWeek"),
    month: document.getElementById("btnMonth")
};

const PROGRESS_RADIUS = 18;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

// =====================================================
// Today Line
// =====================================================
export function renderTodayLine() {
    const today = new Date();
    const pos = gantt.posFromDate(today);

    const container = gantt.$task;
    if (!container) return;

    // remove cũ
    document.getElementById("today_line")?.remove();
    document.getElementById("today_label")?.remove();

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
// Overdue (Delay) Segment
// =====================================================

/**
 * Số ngày task bị chậm: task chưa Done mà đã qua ngày kết thúc.
 * end_date của gantt là mốc đầu ngày sau ngày cuối cùng của task,
 * nên ngay trong ngày đó task đã chậm 1 ngày.
 */
export function getDelayDays(task) {
    if (
        task.type === gantt.config.types.project ||
        Number(task.progress || 0) >= 1 ||
        !task.end_date
    ) {
        return 0;
    }

    const delayEnd = getDelayEndDate();
    if (delayEnd <= task.end_date) {
        return 0;
    }
    return Math.round((delayEnd - task.end_date) / 86400000);
}

function getDelayEndDate() {
    return gantt.date.add(gantt.date.day_start(new Date()), 1, "day");
}

/**
 * Bản MIT không có gantt.addTaskLayer, nên tự vẽ lớp phủ
 * lên vùng timeline sau mỗi lần gantt render.
 */
export function renderDelaySegments() {
    const container = gantt.$task_data;
    if (!container) return;

    container.querySelector(".gantt_delay_layer")?.remove();

    const layer = document.createElement("div");
    layer.className = "gantt_delay_layer";

    const barMetrics = measureBarMetrics(container);

    gantt.eachTask(task => {
        if (!gantt.isTaskVisible(task.id)) return;
        const segment = createDelaySegment(task, barMetrics);
        if (segment) layer.appendChild(segment);
    });

    container.appendChild(layer);
}

/**
 * Độ lệch giữa vị trí gantt tính (getTaskPosition) và thanh task thật trên màn hình
 * (CSS ép height: 32px + margin-top). Đo trên một thanh đang được vẽ rồi áp dụng
 * cho mọi task, vì smart rendering chưa vẽ các thanh nằm ngoài vùng nhìn thấy
 * (vd. stage phía dưới như Electric) nên không đo trực tiếp được.
 */
function measureBarMetrics(container) {
    const containerTop = container.getBoundingClientRect().top;
    let metrics = null;

    gantt.eachTask(task => {
        if (metrics || task.type === gantt.config.types.project) return;

        const bar = gantt.getTaskNode(task.id);
        if (!bar) return;

        const barRect = bar.getBoundingClientRect();
        metrics = {
            offsetTop: barRect.top - containerTop - gantt.getTaskPosition(task).top,
            height: barRect.height
        };
    });

    return metrics;
}

function createDelaySegment(task, barMetrics) {
    const delayDays = getDelayDays(task);
    if (!delayDays) {
        return null;
    }

    const pos = gantt.getTaskPosition(task, task.end_date, getDelayEndDate());
    const label = `${delayDays} day${delayDays === 1 ? "" : "s"} late`;

    const top = pos.top + (barMetrics?.offsetTop ?? 0);
    const height = barMetrics?.height ?? pos.height;

    const el = document.createElement("div");
    el.className = "gantt_task_delay";
    el.style.left = pos.left + "px";
    el.style.top = top + "px";
    el.style.width = pos.width + "px";
    el.style.height = height + "px";
    el.style.lineHeight = height + "px";
    el.title = `${task.text}: ${label}`;
    el.textContent = label;
    return el;
}

/**
 * Mở rộng timeline tới hết hôm nay khi có task bị chậm,
 * để phần dôi ra không bị cắt mất.
 */
export function fitScaleToDelays() {
    gantt.config.start_date = undefined;
    gantt.config.end_date = undefined;

    let hasDelay = false;
    gantt.eachTask(task => {
        if (getDelayDays(task)) {
            hasDelay = true;
        }
    });
    if (!hasDelay) {
        return;
    }

    const range = gantt.getSubtaskDates();
    if (!range.start_date || !range.end_date) {
        return;
    }
    const delayEnd = getDelayEndDate();
    gantt.config.start_date = gantt.date.add(range.start_date, -1, "day");
    gantt.config.end_date = gantt.date.add(
        delayEnd > range.end_date ? delayEnd : range.end_date,
        1,
        "day"
    );
}

// =====================================================
// Task Color
// =====================================================
// Stage: màu riêng theo biến CSS --stage-<stage>-bg / -fg (dùng chung với bảng Issues).
// Task: một màu chung cho cả dự án theo biến --task-* (workflow.css).
const STAGE_KEYS = ["design", "mechanical", "assembly", "electric", "program"];
let stageColors = null;
let taskColors = null;

function getStageColors() {
    if (!stageColors) {
        const styles = getComputedStyle(document.documentElement);
        stageColors = Object.fromEntries(STAGE_KEYS.map(key => [key, {
            color: styles.getPropertyValue(`--stage-${key}-bg`).trim(),
            progressColor: styles.getPropertyValue(`--stage-${key}-fg`).trim()
        }]));
    }
    return stageColors;
}

function getTaskColors() {
    if (!taskColors) {
        const styles = getComputedStyle(document.documentElement);
        taskColors = {
            color: styles.getPropertyValue("--task-bg").trim(),
            progressColor: styles.getPropertyValue("--task-progress").trim(),
            textColor: styles.getPropertyValue("--task-text").trim()
        };
    }
    return taskColors;
}

export function setTaskColor(task) {
    // Stage là dòng gốc (không có parent), task con nằm trong stage
    const isStage = task.type === gantt.config.types.project || !task.parent;

    if (!isStage) {
        Object.assign(task, getTaskColors());
        return;
    }

    const colors = getStageColors()[String(task.css || "").trim().toLowerCase()];
    if (colors) {
        task.color = colors.color;
        task.progressColor = colors.progressColor;
        // Chữ màu đậm của stage để đọc rõ trên nền thanh nhạt
        task.textColor = colors.progressColor;
    }
}

// =====================================================
// Zoom Buttons
// =====================================================
// Class "active" là class được style viền xanh trong workflow.css (.view-button.active)
export function setActiveZoomButton(level) {
    Object.entries(zoomButtons).forEach(([key, btn]) => {
        const isActive = key === level;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", String(isActive));
    });
}

// =====================================================
// Create Task Modal
// =====================================================
export function openTaskModal(stageName, minStartDate) {
    document.getElementById("stage-name").value = stageName;
    document.getElementById("task-name").value = "";
    document.getElementById("start-date").value = "";
    document.getElementById("start-date").min = minStartDate;
    document.getElementById("duration").value = "";

    taskModal.classList.add("open");
}

export function closeTaskModal() {
    taskModal.classList.remove("open");
}

export function getTaskFormData() {
    return {
        name: document.getElementById("task-name")?.value?.trim(),
        startDate: document.getElementById("start-date")?.value,
        duration: parseInt(document.getElementById("duration")?.value, 10),
        stageName: document.getElementById("stage-name")?.value
    };
}

// =====================================================
// Task Popup: Report History
// =====================================================
export function getReportHistoryNode() {
    return gantt.getLightboxSection("report_history")?.node ?? null;
}

export function renderReportHistoryMessage(node, message) {
    node.innerHTML = `<p class="report-history-empty">${escapeHtml(message)}</p>`;
}

/**
 * @param {HTMLElement} node - Section report_history trong lightbox
 * @param {Array} history - Các lần báo cáo, cũ → mới
 * @param {boolean} isDone - Task đã Done: lần cuối có cờ xem ảnh evidence
 */
export function renderReportHistory(node, history, isDone) {
    if (!history.length) {
        renderReportHistoryMessage(node, "This task has not been reported yet.");
        return;
    }

    const lastIndex = history.length - 1;

    node.innerHTML = `
        <ol class="report-history-list">
            ${history.map((entry, index) => `
                <li class="report-history-item">
                    <div class="report-history-meta">
                        <span class="report-history-date">${escapeHtml(entry.date)}</span>
                        <span class="report-history-status ${getWorkStatusClass(entry.status)}">
                            ${escapeHtml(entry.status)}
                        </span>
                        ${entry.reporter ? `<span class="report-history-reporter">by ${escapeHtml(entry.reporter)}</span>` : ""}
                        ${isDone && index === lastIndex ? `
                            <button type="button" class="report-history-flag"
                                    title="View Image" aria-label="View Image">
                                <i class="bi bi-flag-fill" aria-hidden="true"></i>
                            </button>
                        ` : ""}
                    </div>
                    ${entry.workers.length ? `
                        <div class="report-history-workers">
                            <i class="bi bi-people" aria-hidden="true"></i>
                            ${escapeHtml(entry.workers.join(", "))}
                        </div>
                    ` : ""}
                    <p class="report-history-detail">
                        ${entry.detail ? escapeHtml(entry.detail) : '<span class="report-history-no-detail">No detail.</span>'}
                    </p>
                </li>
            `).join("")}
        </ol>
    `;
}

function getWorkStatusClass(status) {
    switch (status) {
        case "Done":
            return "is-done";
        case "Processing":
            return "is-processing";
        default:
            return "is-not-started";
    }
}

// =====================================================
// Evidence Image Viewer
// =====================================================
const evidenceViewer = document.getElementById("evidence-viewer");
const evidenceViewerBody = document.getElementById("evidence-viewer-body");

export function openEvidenceViewer(imageUrls) {
    evidenceViewerBody.innerHTML = imageUrls.length
        ? imageUrls.map(url => `
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                <img src="${escapeHtml(url)}" alt="Evidence image" loading="lazy">
            </a>
        `).join("")
        : '<p class="report-history-empty">No evidence images.</p>';

    // <dialog> nằm ở top layer nên hiện đè lên lightbox của gantt
    evidenceViewer.showModal();
}

export function closeEvidenceViewer() {
    evidenceViewer.close();
}

export function getEvidenceViewer() {
    return evidenceViewer;
}

// =====================================================
// Project Summary
// =====================================================
export function renderProjectDates(startDate, endDate) {
    document.getElementById("project-start-date").textContent =
        utils.formatDateDisplay(startDate);
    document.getElementById("project-end-date").textContent =
        utils.formatDateDisplay(endDate);
}

export function renderTotalTaskCount(count) {
    document.getElementById("total-task-count").textContent = count;
}

/**
 * Vẽ vòng tiến độ tổng của project
 * @param {number} progress - 0 -> 100
 */
export function updateProgress(progress) {
    // Đảm bảo nằm trong khoảng 0 -> 100
    progress = Math.max(0, Math.min(100, progress));

    const circle = document.getElementById("progress-circle");
    const text = document.getElementById("project-progress");

    circle.style.strokeDashoffset =
        PROGRESS_CIRCUMFERENCE - (progress / 100) * PROGRESS_CIRCUMFERENCE;
    text.textContent = `${Math.round(progress)}%`;
}

/**
 * @param {Array<{name: string, key: string, progress: number}>} stageProgressList
 */
export function renderStageProgressCards(stageProgressList) {
    const container = document.getElementById("stage-progress-grid");
    if (!container) return;

    container.innerHTML = stageProgressList.map(item => {
        const colorTask = { css: item.key };
        setTaskColor(colorTask);

        const color = colorTask.progressColor || "#2563eb";
        const percent = Math.round(item.progress);
        const offset = PROGRESS_CIRCUMFERENCE - (percent / 100) * PROGRESS_CIRCUMFERENCE;
        const safeName = escapeHtml(item.name);

        return `
            <article class="stage-progress-card">
                <span class="stage-progress-name">${safeName}</span>
                <div class="circular-progress stage-circular-progress"
                    style="--stage-progress-color:${color}"
                    role="img" aria-label="${safeName}: ${percent}%">
                    <svg viewBox="0 0 44 44" aria-hidden="true">
                        <circle class="progress-bg" cx="22" cy="22" r="18"></circle>
                        <circle class="progress-value stage-progress-value" cx="22" cy="22" r="18"
                            style="stroke-dasharray:${PROGRESS_CIRCUMFERENCE};stroke-dashoffset:${offset}"></circle>
                    </svg>
                    <strong>${percent}%</strong>
                </div>
            </article>
        `;
    }).join("");
}

// =====================================================
// Issues Table
// =====================================================
export function getIssueFilters() {
    return {
        keyword: searchInput.value.trim().toLowerCase(),
        stage: stageFilter.value
    };
}

export function getIssueFilterInputs() {
    return [searchInput, stageFilter];
}

export function renderIssueCount(count) {
    document.querySelector(".issue-count").textContent = `(${count})`;
}

// ---------- Cột trái: số issue theo stage ----------
const stageStatButtons = document.querySelectorAll(".stage-stat[data-stage]");

/**
 * @param {Object<string, number>} counts - key là tên stage viết thường
 */
export function renderStageIssueCounts(counts) {
    stageStatButtons.forEach(button => {
        button.querySelector("b").textContent =
            counts[button.dataset.stage.toLowerCase()] || 0;
    });
}

export function getStageStatButtons() {
    return stageStatButtons;
}

export function setStageFilter(stage) {
    stageFilter.value = stage;
}

export function highlightStageStat(stage) {
    stageStatButtons.forEach(button => {
        const isActive = button.dataset.stage === stage;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

export function renderIssueTable(issues) {
    issueTableBody.innerHTML = issues.map(issue => `
        <tr>
            <td class="check">
                <input type="checkbox" class="row-check" data-issue-id="${escapeHtml(issue.id)}"
                       aria-label="Select issue ${escapeHtml(issue.title || issue.id)}">
            </td>
            <td>
                <span class="issue-id">${issue.id}</span>
            </td>
            <td>
                <span class="issue-title">
                    ${escapeHtml(issue.title)}
                </span>
            </td>
            <td>
                <span class="stage-badge ${getStageClass(issue.related_stage)}">
                ● ${escapeHtml(issue.related_stage || "")}
                </span>
            </td>
            <td class="solution" data-issue-id="${escapeHtml(issue.id)}">
                ${renderSolutionView(issue.solution)}
            </td>
            <td>
                <div class="assignee">
                    ${escapeHtml(issue.reporter || "")}
                </div>
            </td>
            <td>
                ${utils.formatDateDisplay(issue.created_date) || ""}
            </td>
        </tr>
    `).join("");

    issueEmptyState.classList.toggle("hidden", issues.length !== 0);

    // Render lại bảng thì các row đều bỏ chọn → đồng bộ thanh Delete
    updateIssueSelection();
}

// ---------- Solution cell (inline edit) ----------
function renderSolutionView(solution) {
    return `
        <div class="solution-view">
            ${solution
            ? `<span class="solution-text" title="${escapeHtml(solution)}">${escapeHtml(solution)}</span>`
            : '<span class="solution-empty">No solution yet</span>'}
            <button type="button" class="solution-action" data-edit-solution
                    title="Edit solution" aria-label="Edit solution">
                <i class="bi bi-pencil" aria-hidden="true"></i>
            </button>
        </div>
    `;
}

export function getIssueTableBody() {
    return issueTableBody;
}

export function showSolutionView(cell, solution) {
    cell.innerHTML = renderSolutionView(solution);
}

export function showSolutionEditor(cell, solution) {
    cell.innerHTML = `
        <div class="solution-editor">
            <textarea class="solution-input" rows="3"
                      placeholder="Describe how the issue was solved">${escapeHtml(solution || "")}</textarea>
            <div class="solution-editor-actions">
                <button type="button" class="solution-save" data-save-solution>
                    <i class="bi bi-check-lg" aria-hidden="true"></i> Save
                </button>
                <button type="button" class="solution-cancel" data-cancel-solution>Cancel</button>
            </div>
        </div>
    `;

    const input = cell.querySelector(".solution-input");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

export function getSolutionInputValue(cell) {
    return cell.querySelector(".solution-input")?.value.trim() ?? "";
}

export function setSolutionSaving(cell, isSaving) {
    cell.querySelectorAll("textarea, button").forEach(el => {
        el.disabled = isSaving;
    });
    const saveButton = cell.querySelector("[data-save-solution]");
    if (saveButton) {
        saveButton.innerHTML = isSaving
            ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Saving...'
            : '<i class="bi bi-check-lg" aria-hidden="true"></i> Save';
    }
}

export function setAllIssueRowsChecked(checked) {
    issueTableBody.querySelectorAll(".row-check")
        .forEach(check => check.checked = checked);
}

// ---------- Chọn nhiều issue + thanh Delete ----------
const selectAllCheckbox = document.getElementById("selectAll");
const issueBulkBar = document.getElementById("issueBulkBar");
const issueBulkCount = document.getElementById("issueBulkCount");
const deleteIssuesButton = document.getElementById("btnDeleteIssues");

export function getSelectAllCheckbox() {
    return selectAllCheckbox;
}

export function getDeleteIssuesButton() {
    return deleteIssuesButton;
}

export function getSelectedIssueIDs() {
    return Array.from(
        issueTableBody.querySelectorAll(".row-check:checked"),
        check => check.dataset.issueId
    );
}

/**
 * Cập nhật ô "chọn tất cả" và trượt thanh Delete lên/xuống theo số row đang chọn.
 */
export function updateIssueSelection() {
    const total = issueTableBody.querySelectorAll(".row-check").length;
    const selected = getSelectedIssueIDs().length;

    selectAllCheckbox.checked = total > 0 && selected === total;
    selectAllCheckbox.indeterminate = selected > 0 && selected < total;

    issueBulkCount.textContent = `${selected} selected`;
    issueBulkBar.classList.toggle("show", selected > 0);
    issueBulkBar.inert = selected === 0;
}

export function setDeleteIssuesSaving(isSaving) {
    deleteIssuesButton.disabled = isSaving;
    deleteIssuesButton.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Deleting...'
        : '<i class="bi bi-trash" aria-hidden="true"></i> Delete';
}

// =====================================================
// Helpers
// =====================================================
function getStageClass(stage) {
    const key = stage?.toLowerCase();
    return STAGE_KEYS.includes(key) ? key : "default";
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}
