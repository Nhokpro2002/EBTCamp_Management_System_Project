import * as utils from "../utils/utils.js";
import * as service from "./service.js";

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
        // Task Plan (chưa duyệt) chưa hoạt động → chưa tính trễ
        service.isPlanTask(task) ||
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

// Khoảng cách giữa cuối thanh task và chữ "Trễ x ngày"
const DELAY_LABEL_GAP_PX = 6;
// Số ngày chừa thêm cuối timeline để chữ không bị cắt
const DELAY_LABEL_SPACE_DAYS = 4;

function createDelaySegment(task, barMetrics) {
    const delayDays = getDelayDays(task);
    if (!delayDays) {
        return null;
    }

    // Chỉ ghi số ngày trễ ngay sau cuối thanh task (không vẽ đoạn kéo dài tới hôm nay)
    const pos = gantt.getTaskPosition(task, task.start_date, task.end_date);
    const label = `Trễ ${delayDays} ngày`;

    const top = pos.top + (barMetrics?.offsetTop ?? 0);
    const height = barMetrics?.height ?? pos.height;

    const el = document.createElement("div");
    el.className = "gantt_task_delay";
    el.style.left = (pos.left + pos.width + DELAY_LABEL_GAP_PX) + "px";
    el.style.top = top + "px";
    el.style.height = height + "px";
    el.style.lineHeight = height + "px";
    // Gắn id task → rê chuột vào đoạn trễ cũng hiện khung thông tin của task (tooltip Gantt)
    el.setAttribute(gantt.config.task_attribute, task.id);
    el.textContent = label;
    return el;
}

/**
 * Có task bị chậm → chừa thêm vài ngày cuối timeline
 * để chữ "Trễ x ngày" sau thanh task cuối cùng không bị cắt mất.
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
    gantt.config.start_date = gantt.date.add(range.start_date, -1, "day");
    gantt.config.end_date = gantt.date.add(range.end_date, DELAY_LABEL_SPACE_DAYS, "day");
}

// =====================================================
// Task Color
// =====================================================
// Thanh stage và thanh task: CÙNG một bộ màu theo biến --task-* (workflow.css):
// nhạt = phần chưa hoàn thành, đậm = phần đã hoàn thành (khớp ô chú thích màu).
// Màu riêng từng stage (--stage-<stage>-bg / -fg) chỉ còn dùng cho icon ở cột trái,
// vòng tiến độ stage và bảng Issues → lưu ở task.stageColor.
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

    // Thanh stage cùng màu với thanh task
    Object.assign(task, getTaskColors());

    // Màu riêng của stage: icon cột trái, vòng tiến độ stage
    const colors = getStageColors()[String(task.css || "").trim().toLowerCase()];
    task.stageColor = colors?.progressColor || task.progressColor;
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
        renderReportHistoryMessage(node, "Task này chưa có báo cáo nào.");
        return;
    }

    const lastIndex = history.length - 1;

    node.innerHTML = `
        <ol class="report-history-list">
            ${history.map((entry, index) => `
                <li class="report-history-item">
                    <div class="report-history-meta">
                        <span class="report-history-date">${escapeHtml(utils.formatDateDisplay(entry.date) || entry.date)}</span>
                        <span class="report-history-status ${getWorkStatusClass(entry.status)}">
                            ${escapeHtml(entry.status)}
                        </span>
                        ${entry.reporter ? `<span class="report-history-reporter">bởi ${escapeHtml(entry.reporter)}</span>` : ""}
                        ${isDone && index === lastIndex ? `
                            <button type="button" class="report-history-flag"
                                    title="Xem ảnh" aria-label="Xem ảnh">
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
                        ${entry.detail ? escapeHtml(entry.detail) : '<span class="report-history-no-detail">Không có chi tiết.</span>'}
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
                <img src="${escapeHtml(url)}" alt="Ảnh minh chứng" loading="lazy">
            </a>
        `).join("")
        : '<p class="report-history-empty">Không có ảnh minh chứng.</p>';

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
 * Số task Plan đang chờ Part Leader duyệt (ẩn khi = 0).
 */
export function renderPlanTaskCount(count) {
    const wrapper = document.getElementById("plan-task-count");
    if (!wrapper) return;
    document.getElementById("plan-task-count-value").textContent = count;
    wrapper.hidden = count === 0;
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
 * @param {Object<string, { total: number, open: number }>} issueSummary số issue theo stage (key viết thường)
 */
export function renderStageProgressCards(stageProgressList, issueSummary = {}) {
    const container = document.getElementById("stage-progress-grid");
    if (!container) return;

    container.innerHTML = stageProgressList.map(item => {
        const colorTask = { css: item.key };
        setTaskColor(colorTask);

        // Vòng tiến độ vẫn giữ màu riêng của từng stage
        const color = colorTask.stageColor || "#2563eb";
        const percent = Math.round(item.progress);
        const offset = PROGRESS_CIRCUMFERENCE - (percent / 100) * PROGRESS_CIRCUMFERENCE;
        const safeName = escapeHtml(item.name);

        const issues = issueSummary[String(item.name || "").trim().toLowerCase()]
            || issueSummary[item.key]
            || { total: 0, open: 0 };

        return `
            <article class="stage-progress-card">
                <div class="stage-progress-info">
                    <span class="stage-progress-name">${safeName}</span>
                    <button type="button" class="stage-issue-link ${issues.open ? "has-open" : ""}"
                        data-stage-issues="${safeName}"
                        title="Xem issue của ${safeName}"
                        aria-label="${issues.total} issue, ${issues.open} chưa xử lý — xem issue của ${safeName}">
                        <i class="bi ${issues.open ? "bi-exclamation-triangle-fill" : "bi-check2-circle"}" aria-hidden="true"></i>
                        <span><b>${issues.total}</b> issue</span>
                        ${issues.open ? `<span class="stage-issue-open">${issues.open} chưa xử lý</span>` : ""}
                    </button>
                </div>
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

/**
 * Dòng "Trễ hạn": tính từ task đang trễ, không phải bản ghi trong database
 * → không xóa, không sửa giải pháp, không giao người xử lý; tự mất khi task xong / được dời hạn.
 */
function renderOverdueTaskRow(issue) {
    return `
        <tr class="is-overdue-task" data-issue-id="${escapeHtml(issue.id)}"
            data-stage="${escapeHtml(issue.related_stage || "")}" data-task-id="${escapeHtml(issue.taskID)}">
            <td class="check">
                <i class="bi bi-hourglass-split overdue-row-icon" title="Task trễ hạn (tự động)" aria-hidden="true"></i>
            </td>
            <td>
                <span class="issue-title">${escapeHtml(issue.title)}</span>
            </td>
            <td>
                <span class="issue-type-chip is-overdue">${escapeHtml(issue.type)}</span>
            </td>
            <td class="solution">
                <span class="overdue-note">
                    Trễ <b>${issue.delayDays}</b> ngày — tự hết khi task hoàn thành hoặc được dời hạn
                </span>
            </td>
            <td class="issue-handler"><span class="issue-muted">—</span></td>
            <td class="issue-deadline">
                <span class="deadline-value is-overdue" title="Ngày kết thúc theo kế hoạch">
                    <i class="bi bi-alarm-fill" aria-hidden="true"></i>
                    ${escapeHtml(formatDeadline(issue.deadline))}
                </span>
            </td>
            <td><div class="assignee">${escapeHtml(issue.reporter)}</div></td>
            <td>${escapeHtml(utils.formatDateDisplay(issue.created_date))}</td>
        </tr>`;
}

export function renderIssueTable(issues) {
    // ID và Stage không hiện trên bảng nhưng vẫn giữ ở data-* của dòng (lọc theo stage, xóa, sửa...)
    issueTableBody.innerHTML = issues.map(issue => issue.isOverdueTask ? renderOverdueTaskRow(issue) : `
        <tr data-issue-id="${escapeHtml(issue.id)}" data-stage="${escapeHtml(issue.related_stage || "")}">
            <td class="check">
                <input type="checkbox" class="row-check" data-issue-id="${escapeHtml(issue.id)}"
                       aria-label="Chọn issue ${escapeHtml(issue.title || issue.id)}">
            </td>
            <td>
                <span class="issue-title">
                    ${escapeHtml(issue.title)}
                </span>
            </td>
            <td>
                ${issue.type
                    ? `<span class="issue-type-chip">${escapeHtml(issue.type)}</span>`
                    : '<span class="issue-muted">—</span>'}
            </td>
            <td class="solution" data-issue-id="${escapeHtml(issue.id)}">
                ${renderSolutionView(issue.solution)}
            </td>
            ${renderAssignmentCells(issue)}
            <td>
                <div class="assignee">
                    ${escapeHtml(issue.reporter || "")}
                </div>
            </td>
            <td>
                ${utils.formatDateTimeToDisplay(new Date(issue.created_date || issue.createdDate || issue.created || NaN))}
            </td>
        </tr>
    `).join("");

    issueEmptyState.classList.toggle("hidden", issues.length !== 0);

    // Render lại bảng thì các row đều bỏ chọn → đồng bộ thanh Delete
    updateIssueSelection();
}

// ---------- Người xử lý + Thời hạn (chọn 1 lần, sau đó khóa) ----------

function getTodayValue() {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");
}

function formatDeadline(value) {
    const [year, month, day] = String(value || "").slice(0, 10).split("-");
    return year && month && day ? `${day}/${month}/${year}` : "";
}

/**
 * Đã giao: hiện tên + ngày (khóa, quá hạn mà chưa có giải pháp thì tô đỏ).
 * Chưa giao: ô chọn người (lọc theo position ứng với loại vấn đề) + ô ngày + nút Giao.
 */
function renderAssignmentCells(issue) {
    const id = escapeHtml(issue.id);

    if (service.isIssueAssigned(issue)) {
        const deadlineDay = String(issue.deadline).slice(0, 10);
        const isOverdue = deadlineDay < getTodayValue() && !String(issue.solution ?? "").trim();

        return `
            <td class="issue-handler">
                <span class="handler-name" title="Đã giao — không thể thay đổi">
                    <i class="bi bi-person-check-fill" aria-hidden="true"></i>
                    ${escapeHtml(service.getHandlerName(issue))}
                </span>
            </td>
            <td class="issue-deadline">
                <span class="deadline-value ${isOverdue ? "is-overdue" : ""}"
                      title="${isOverdue ? "Đã quá hạn" : "Đã giao — không thể thay đổi"}">
                    <i class="bi ${isOverdue ? "bi-alarm-fill" : "bi-lock-fill"}" aria-hidden="true"></i>
                    ${escapeHtml(formatDeadline(issue.deadline))}
                </span>
            </td>`;
    }

    const candidates = service.getHandlerCandidates(issue);
    const currentHandler = Array.isArray(issue.handler) ? issue.handler[0] : issue.handler;
    const options = candidates.length
        ? `<option value="">Chọn người xử lý</option>` + candidates.map(user => `
            <option value="${escapeHtml(user.id)}" ${user.id === currentHandler ? "selected" : ""}>
                ${escapeHtml(service.getUserName(user))}
            </option>`).join("")
        : `<option value="">${issue.type ? "Không có người phù hợp" : "Issue chưa có loại vấn đề"}</option>`;

    return `
        <td class="issue-handler">
            <select class="form-select form-select-sm handler-select" data-issue-id="${id}"
                    ${candidates.length ? "" : "disabled"}
                    aria-label="Người xử lý cho issue ${escapeHtml(issue.title || "")}">
                ${options}
            </select>
        </td>
        <td class="issue-deadline">
            <div class="assign-controls">
                <input type="date" class="form-control form-control-sm deadline-input" data-issue-id="${id}"
                       min="${getTodayValue()}" value="${escapeHtml(String(issue.deadline || "").slice(0, 10))}"
                       ${candidates.length ? "" : "disabled"}
                       aria-label="Thời hạn cho issue ${escapeHtml(issue.title || "")}">
                <button type="button" class="assign-button" data-assign-issue="${id}"
                        ${candidates.length ? "" : "disabled"}
                        title="Giao người xử lý và thời hạn (không thể thay đổi sau khi giao)">
                    Giao
                </button>
            </div>
        </td>`;
}

/**
 * Người xử lý + thời hạn đang chọn trên một dòng chưa giao.
 */
export function getAssignmentValues(issueID) {
    const row = issueTableBody.querySelector(`tr[data-issue-id="${CSS.escape(issueID)}"]`);
    return {
        handlerID: row?.querySelector(".handler-select")?.value || "",
        deadline: row?.querySelector(".deadline-input")?.value || ""
    };
}

export function setAssignSaving(issueID, isSaving) {
    const button = issueTableBody.querySelector(`[data-assign-issue="${CSS.escape(issueID)}"]`);
    if (!button) return;
    button.disabled = isSaving;
    button.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>'
        : "Giao";
}

// ---------- Solution cell (inline edit) ----------
function renderSolutionView(solution) {
    return `
        <div class="solution-view">
            ${solution
            ? `<span class="solution-text" title="${escapeHtml(solution)}">${escapeHtml(solution)}</span>`
            : '<span class="solution-empty">Chưa có giải pháp</span>'}
            <button type="button" class="solution-action" data-edit-solution
                    title="Sửa giải pháp" aria-label="Sửa giải pháp">
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
                      placeholder="Mô tả cách đã xử lý issue">${escapeHtml(solution || "")}</textarea>
            <div class="solution-editor-actions">
                <button type="button" class="solution-save" data-save-solution>
                    <i class="bi bi-check-lg" aria-hidden="true"></i> Lưu
                </button>
                <button type="button" class="solution-cancel" data-cancel-solution>Hủy</button>
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
            ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang lưu...'
            : '<i class="bi bi-check-lg" aria-hidden="true"></i> Lưu';
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

    issueBulkCount.textContent = `Đã chọn ${selected}`;
    issueBulkBar.classList.toggle("show", selected > 0);
    issueBulkBar.inert = selected === 0;
}

export function setDeleteIssuesSaving(isSaving) {
    deleteIssuesButton.disabled = isSaving;
    deleteIssuesButton.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang xóa...'
        : '<i class="bi bi-trash" aria-hidden="true"></i> Xóa';
}

// =====================================================
// Helpers
// =====================================================
function getStageClass(stage) {
    const key = stage?.toLowerCase();
    return STAGE_KEYS.includes(key) ? key : "default";
}

export function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}
