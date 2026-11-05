import * as service from "./service.js";

const projectSelect = document.querySelector("#report-project");
const taskReportList = document.querySelector("#task-report-list");
const taskCount = document.querySelector("#task-count");
const reporterName = document.querySelector("#reporter-name");
const reportMessage = document.querySelector("#report-message");
const saveButton = document.querySelector("#save-reports");
const openTaskPickerButton = document.querySelector("#open-task-picker");
const taskPickerDialog = document.querySelector("#task-picker-dialog");
const taskPickerList = document.querySelector("#task-picker-list");
const taskPickerSelectionCount = document.querySelector("#task-picker-selection-count");
const addSelectedTasksButton = document.querySelector("#add-selected-tasks");
const issueCreateDialog = document.querySelector("#issue-create-dialog");
const issueCreateForm = document.querySelector("#issue-create-form");
const issueTaskIDInput = document.querySelector("#issue-related-task-id");
const issueTitleInput = document.querySelector("#issue-title");
const submitIssueButton = document.querySelector("#submit-issue");
const issueTypeSelect = document.querySelector("#issue-type");

service.ISSUE_TYPES.forEach(type => issueTypeSelect.add(new Option(type, type)));

export function setReporter(user) {
    reporterName.textContent =
        user?.employee_name || user?.name || user?.email || "Không rõ";
}

/**
 * Ô "Người báo cáo": người đã nộp báo cáo của ngày (hoặc người đang đăng nhập nếu chưa nộp).
 */
export function setReporterName(name) {
    reporterName.textContent = name || "Không rõ";
}

export function renderProjects(projects, selectedProjectID) {
    projectSelect.replaceChildren(new Option("Chọn dự án", ""));
    projects.forEach(project => {
        projectSelect.add(
            new Option(project.name, project.id, false, String(project.id) === String(selectedProjectID))
        );
    });
}

export function renderTaskPicker(tasks, selectedTaskIDs = []) {
    const selectedIDs = new Set(selectedTaskIDs.map(String));
    const stages = new Map();
    tasks.forEach(task => {
        const stageName = task.stage_name || "Task khác";
        if (!stages.has(stageName)) {
            stages.set(stageName, []);
        }
        stages.get(stageName).push(task);
    });

    taskPickerList.innerHTML = stages.size
        ? Array.from(stages.entries()).map(([stageName, stageTasks]) => `
            <section class="task-picker-stage">
                <h3>${escapeHtml(stageName)}</h3>
                <div class="task-picker-stage-tasks">
                    ${stageTasks.map(task => {
            const alreadyAdded = selectedIDs.has(String(task.id));
            return `
                            <label class="task-picker-option${alreadyAdded ? " is-added" : ""}">
                                <input type="checkbox" value="${escapeHtml(task.id)}"
                                       ${alreadyAdded ? "checked disabled" : ""}>
                                <span>${escapeHtml(task.name)}</span>
                                ${alreadyAdded ? '<small>Đã thêm</small>' : ""}
                            </label>
                        `;
        }).join("")}
                </div>
            </section>
        `).join("")
        : '<div class="report-empty-state"><i class="bi bi-inbox"></i>Dự án này chưa có task nào.</div>';

    updateTaskPickerSelectionCount();
    openTaskPickerButton.disabled = tasks.length === 0;
}

export function getSelectedTaskIDs() {
    return Array.from(
        taskPickerList.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')
    ).map(input => input.value);
}

export function updateTaskPickerSelectionCount() {
    const count = getSelectedTaskIDs().length;
    taskPickerSelectionCount.textContent =
        `Đã chọn ${count} task`;
    addSelectedTasksButton.disabled = count === 0;
}

export function openTaskPicker() {
    taskPickerDialog.showModal();
}

export function closeTaskPicker() {
    taskPickerDialog.close();
}

export function renderTaskReports(taskReports, users, issues, projectID) {
    const reports = Object.values(taskReports);
    const existingUploads = new Map(
        Array.from(taskReportList.querySelectorAll(".task-evidence-upload"))
            .map(input => [
                input.closest("tr").dataset.taskId,
                input
            ])
    );
    taskCount.textContent = `${reports.length} task`;

    taskReportList.innerHTML = reports.length
        ? `
            <div class="report-table-wrap">
                <table class="report-task-table">
                    <thead>
                        <tr>
                            <th>Task</th>
                            <th>Stage</th>
                            <th>Trạng thái</th>
                            <th>Người làm <span class="required-mark" aria-hidden="true">*</span></th>
                            <th>Chi tiết <span class="required-mark" aria-hidden="true">*</span></th>
                            <th>Issues</th>
                            <th>Ảnh minh chứng</th>
                            <th aria-label="Thao tác"></th>
                        </tr>
                    </thead>
                    <tbody>${reports.map(entry =>
            renderTaskReportRow(entry, users, issues, projectID)
        ).join("")}</tbody>
                </table>
            </div>
        `
        : '<div class="report-empty-state"><i class="bi bi-clipboard2-plus"></i>Chọn dự án và các task để bắt đầu báo cáo.</div>';

    taskReportList.querySelectorAll("tbody tr").forEach(row => {
        const existingInput = existingUploads.get(row.dataset.taskId);
        if (existingInput) {
            row.querySelector(".task-evidence-upload").replaceWith(existingInput);
        }
        updateWorkerPicker(row);
    });
}

export function clearEvidenceFiles() {
    taskReportList.querySelectorAll(".task-evidence-upload").forEach(input => {
        input.value = "";
    });
}

function renderTaskReportRow(entry, users, issues, projectID) {
    const task = entry.task;
    const linkedIssues = getIssuesForTask(task, issues);
    const savedEvidence = service.getEvidenceFiles(entry.report);
    const hasEvidence = savedEvidence.length > 0 || entry.files?.length > 0;
    const evidenceLinks = savedEvidence.length && entry.recordID
        ? savedEvidence.map(fileName => `
            <a href="${service.getEvidenceUrl(entry.recordID, fileName)}"
               target="_blank" rel="noopener noreferrer">
                <i class="bi bi-image"></i>${escapeHtml(fileName)}
            </a>
        `).join("")
        : '<span class="task-evidence-empty">Chưa có ảnh minh chứng.</span>';

    return `
        <tr data-task-id="${escapeHtml(task.id)}">
            <td class="report-task-name">${escapeHtml(task.name)}</td>
            <td>${escapeHtml(task.stage_name || "Task dự án")}</td>
            <td>
                <select class="task-status-select ${getStatusClass(entry.status)}" aria-label="Trạng thái của ${escapeHtml(task.name)}">
                    ${renderStatusOptions(entry.status)}
                </select>
                <span class="task-evidence-required"${entry.status === "Done" && !hasEvidence ? "" : " hidden"}>Cần ảnh minh chứng</span>
            </td>
            <td class="task-required-cell" data-required="worker">
                ${renderWorker(entry, users)}
                <small class="task-required-error" hidden>Vui lòng chọn người làm</small>
            </td>
            <td class="task-required-cell" data-required="detail">
                <textarea class="task-detail-input" rows="3" required
                          placeholder="Hôm nay đã xử lý những gì?"
                          aria-label="Chi tiết công việc của ${escapeHtml(task.name)}">${escapeHtml(entry.detail || "")}</textarea>
                <small class="task-required-error" hidden>Vui lòng nhập chi tiết</small>
            </td>
            <td>${renderIssues(linkedIssues, projectID, task.id)}</td>
            <td>
                <div class="task-evidence-controls"${entry.status === "Done" ? "" : " hidden"}>
                    <div class="task-evidence-list">${evidenceLinks}</div>
                    <input class="task-evidence-upload" type="file" accept="image/*" multiple
                           aria-label="Tải ảnh minh chứng cho ${escapeHtml(task.name)}">
                    <small class="task-evidence-help">Chỉ nhận ảnh, tối đa 5 MiB mỗi ảnh.</small>
                </div>
            </td>
            <td>
                ${entry.recordID ? "" : `
                    <button type="button" class="task-report-remove" data-remove-task="${escapeHtml(task.id)}"
                            aria-label="Bỏ ${escapeHtml(task.name)} khỏi báo cáo">
                        <i class="bi bi-x-lg"></i>
                    </button>
                `}
            </td>
        </tr>
    `;
}

function getIssuesForTask(task, issues) {
    const taskName = normalizeText(task.name);
    const stageName = normalizeText(task.stage_name);
    return issues.filter(issue =>
        normalizeText(issue.related_task) === taskName &&
        (!issue.related_stage ||
            normalizeText(issue.related_stage) === stageName)
    );
}

function renderIssues(issues, projectID, taskID) {
    return `
        <div class="task-issue-list">
            ${issues.length ? issues.map(issue => issue.tempID ? `
                <span class="task-issue-link is-pending"
                      title="Chưa lưu. Issue sẽ được lưu khi bạn lưu báo cáo.">
                    <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
                    <span>${escapeHtml(issue.title)}</span>
                    <small>${escapeHtml(issue.type || "")}</small>
                    <small class="task-issue-pending-badge">Chờ lưu</small>
                    <button type="button" data-remove-pending-issue="${escapeHtml(issue.tempID)}"
                            aria-label="Bỏ issue ${escapeHtml(issue.title)}">
                        <i class="bi bi-x" aria-hidden="true"></i>
                    </button>
                </span>
            ` : `
                <a class="task-issue-link"
                   href="workflow.html?projectID=${encodeURIComponent(projectID)}#issues-panel"
                   title="${escapeHtml(issue.description || issue.title || "Xem issue trong trang tiến độ")}">
                    <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                    <span>${escapeHtml(issue.title || "Issue chưa đặt tên")}</span>
                    ${issue.type ? `<small>${escapeHtml(issue.type)}</small>` : ""}
                </a>
            `).join("") : '<span class="task-issue-empty">Chưa có issue</span>'}
            <button type="button" class="task-issue-create" data-create-issue="${escapeHtml(taskID)}">
                <i class="bi bi-plus-lg" aria-hidden="true"></i> Tạo issue
            </button>
        </div>
    `;
}

export function openIssueCreateDialog(task) {
    issueCreateForm.reset();
    issueTaskIDInput.value = String(task.id);
    issueCreateDialog.showModal();
    issueTitleInput.focus();
}

export function closeIssueCreateDialog() {
    issueCreateDialog.close();
}

export function getIssueCreateForm() {
    return issueCreateForm;
}

export function getIssueTaskID() {
    return issueTaskIDInput.value;
}

export function setIssueCreateSaving(isSaving) {
    submitIssueButton.disabled = isSaving;
    submitIssueButton.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang tạo...'
        : '<i class="bi bi-exclamation-triangle"></i> Tạo issue';
}

function normalizeText(value) {
    return String(value || "").trim().toLocaleLowerCase();
}

function renderStatusOptions(selectedStatus) {
    return ["Not started", "Processing", "Done"].map(status => `
        <option value="${status}" ${status === selectedStatus ? "selected" : ""}>${status}</option>
    `).join("");
}

export function updateStatusStyle(select) {
    select.classList.remove("status-not-started", "status-processing", "status-done");
    select.classList.add(getStatusClass(select.value));
}

/**
 * Tô đỏ ô Người làm / Chi tiết còn thiếu của một dòng task.
 * @param {{ worker: boolean, detail: boolean }} missing true = đang thiếu
 */
export function setRowRequiredErrors(row, missing) {
    row.querySelectorAll(".task-required-cell").forEach(cell => {
        const isMissing = Boolean(missing[cell.dataset.required]);
        cell.classList.toggle("is-invalid", isMissing);
        cell.querySelector(".task-required-error").hidden = !isMissing;
    });
    row.querySelector(".task-detail-input")
        ?.setAttribute("aria-invalid", String(Boolean(missing.detail)));
}

export function getTaskRow(taskID) {
    return taskReportList.querySelector(`tr[data-task-id="${CSS.escape(String(taskID))}"]`);
}

export function updateEvidenceRequirement(row, entry) {
    const hasEvidence = service.getEvidenceFiles(entry.report).length > 0 ||
        (entry.files && entry.files.length > 0);

    const evidenceControls = row.querySelector(".task-evidence-controls");
    const statusSelect = row.querySelector(".task-status-select");
    const evidenceRequired = row.querySelector(".task-evidence-required");

    if (!evidenceControls) return;

    // Chỉ hiển thị ô upload/thông báo khi task ở trạng thái Done,
    // tránh ảnh hưởng logic enable/disable cho report không ở Done.
    evidenceControls.hidden = statusSelect.value !== "Done";

    if (evidenceRequired) {
        evidenceRequired.hidden = statusSelect.value !== "Done" || hasEvidence;
    }
}

function getStatusClass(status) {
    switch (status) {
        case "Done":
            return "status-done";
        case "Processing":
            return "status-processing";
        default:
            return "status-not-started";
    }
}

function renderWorker(entry, users) {
    const selectedIDs = new Set((entry.workerIDs || []).map(String));
    return `
        <div class="task-worker-picker">
            <select class="task-worker-select" multiple hidden
                    aria-label="Người làm của ${escapeHtml(entry.task.name)}">
                ${users.map(user => {
        const workerID = String(user.id);
        return `<option value="${escapeHtml(workerID)}" ${selectedIDs.has(workerID) ? "selected" : ""}>${escapeHtml(getWorkerLabel(user))}</option>`;
    }).join("")}
            </select>
            <div class="task-worker-selected" aria-live="polite"></div>
            <button type="button" class="task-worker-toggle" data-worker-toggle
                    aria-expanded="false">
                <span>Chọn người làm</span>
                <i class="bi bi-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="task-worker-options" role="listbox" hidden></div>
        </div>
    `;
}

function getWorkerLabel(user) {
    return user.employee_name ||
        user.employee_id ||
        user.name ||
        user.email ||
        String(user.id);
}

function updateWorkerPicker(row) {
    const picker = row.querySelector(".task-worker-picker");
    const select = picker.querySelector(".task-worker-select");
    const selected = new Set(
        Array.from(select.selectedOptions, option => option.value)
    );
    const selectedContainer = picker.querySelector(".task-worker-selected");
    const optionsContainer = picker.querySelector(".task-worker-options");
    const toggleButton = picker.querySelector(".task-worker-toggle");

    selectedContainer.innerHTML = Array.from(select.selectedOptions, option => `
        <span class="task-worker-chip">
            ${escapeHtml(option.textContent)}
            <button type="button" data-worker-remove="${escapeHtml(option.value)}"
                    aria-label="Bỏ ${escapeHtml(option.textContent)}">
                <i class="bi bi-x" aria-hidden="true"></i>
            </button>
        </span>
    `).join("");

    const availableOptions = Array.from(select.options)
        .filter(option => !selected.has(option.value));
    optionsContainer.innerHTML = availableOptions.length
        ? availableOptions.map(option => `
            <button type="button" class="task-worker-option"
                    data-worker-option="${escapeHtml(option.value)}"
                    role="option">
                ${escapeHtml(option.textContent)}
            </button>
        `).join("")
        : '<span class="task-worker-empty">Đã chọn tất cả thành viên.</span>';
    toggleButton.disabled = select.options.length === 0;
}

export function toggleWorkerMenu(button) {
    const row = button.closest("tr[data-task-id]");
    const menu = row.querySelector(".task-worker-options");
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    button.querySelector(".bi").className = willOpen
        ? "bi bi-chevron-up"
        : "bi bi-chevron-down";
}

export function closeWorkerMenus(exceptPicker = null) {
    taskReportList.querySelectorAll(".task-worker-picker").forEach(picker => {
        if (picker === exceptPicker) {
            return;
        }
        picker.querySelector(".task-worker-options").hidden = true;
        const button = picker.querySelector(".task-worker-toggle");
        button.setAttribute("aria-expanded", "false");
        button.querySelector(".bi").className = "bi bi-chevron-down";
    });
}

export function selectWorker(button) {
    const row = button.closest("tr[data-task-id]");
    const select = row.querySelector(".task-worker-select");
    const option = Array.from(select.options).find(
        item => item.value === button.dataset.workerOption
    );
    if (!option) {
        return;
    }
    option.selected = true;
    updateWorkerPicker(row);
}

export function removeWorker(button) {
    const row = button.closest("tr[data-task-id]");
    const select = row.querySelector(".task-worker-select");
    const option = Array.from(select.options).find(
        item => item.value === button.dataset.workerRemove
    );
    if (!option) {
        return;
    }
    option.selected = false;
    updateWorkerPicker(row);
}

export function setMessage(message, type = "") {
    reportMessage.textContent = message;
    reportMessage.className = `report-message ${type}`.trim();
    reportMessage.hidden = !message;
}

export function setSaving(isSaving) {
    saveButton.disabled = isSaving || saveButton.dataset.valid !== "true";
    saveButton.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang lưu...'
        : '<i class="bi bi-floppy"></i> Lưu báo cáo';
}

export function getFormValues(taskID) {
    const card = taskReportList.querySelector(
        `tr[data-task-id="${CSS.escape(String(taskID))}"]`
    );
    if (!card) {
        return null;
    }
    return {
        status: card.querySelector(".task-status-select").value,
        workerIDs: Array.from(
            card.querySelector(".task-worker-select").selectedOptions,
            option => option.value
        ),
        detail: card.querySelector(".task-detail-input").value.trim(),
        files: Array.from(card.querySelector(".task-evidence-upload").files)
    };
}

// =====================================================
// KHÓA BÁO CÁO ĐÃ LƯU
// =====================================================
const lockBanner = document.querySelector("#report-lock-banner");

/**
 * Hiện trạng thái báo cáo đã lưu và khóa các ô nhập khi không có quyền sửa.
 * Nút "Tạo issue" vẫn dùng được (issue lưu riêng, không thuộc báo cáo).
 * @param {{ isSubmitted: boolean, isLocked: boolean, workDate: string,
 *            ownerName: string }} options
 */
export function applyReportLock({ isSubmitted, isLocked, workDate, ownerName = "" }) {
    const dateText = escapeHtml(formatDisplayDate(workDate));
    const submittedBy = ownerName ? ` bởi <b>${escapeHtml(ownerName)}</b>` : "";

    if (!isSubmitted) {
        lockBanner.hidden = true;
        lockBanner.innerHTML = "";
    } else if (isLocked) {
        lockBanner.className = "report-lock-banner is-locked";
        lockBanner.innerHTML = `
            <i class="bi bi-lock-fill" aria-hidden="true"></i>
            <div>
                <strong>Dự án đã được báo cáo ngày ${dateText}${submittedBy}</strong>
                <span>Mỗi ngày chỉ có một báo cáo và báo cáo đã bị khóa. Chỉ Part Leader mới được chỉnh sửa.</span>
            </div>`;
        lockBanner.hidden = false;
    } else {
        lockBanner.className = "report-lock-banner is-editable";
        lockBanner.innerHTML = `
            <i class="bi bi-unlock-fill" aria-hidden="true"></i>
            <div>
                <strong>Dự án đã được báo cáo ngày ${dateText}${submittedBy}</strong>
                <span>Bạn là Part Leader nên có thể chỉnh sửa báo cáo này. Báo cáo vẫn giữ tên người nộp.</span>
            </div>`;
        lockBanner.hidden = false;
    }

    taskReportList.classList.toggle("is-locked", isLocked);
    taskReportList
        .querySelectorAll("input, select, textarea, button")
        .forEach(control => {
            if (control.matches("[data-create-issue]")) return;
            control.disabled = isLocked;
        });
}

function formatDisplayDate(value) {
    const [year, month, day] = String(value || "").split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
}

export function setSaveEnabled(isEnabled) {
    saveButton.dataset.valid = String(isEnabled);
    saveButton.disabled = !isEnabled;
}

export function getTaskPickerButton() {
    return openTaskPickerButton;
}

export function getTaskPickerList() {
    return taskPickerList;
}

export function getAddSelectedTasksButton() {
    return addSelectedTasksButton;
}

export function getProjectSelect() {
    return projectSelect;
}

export function getTaskReportList() {
    return taskReportList;
}

export function getSaveButton() {
    return saveButton;
}

export function getDateInput() {
    return document.querySelector("#report-date");
}

export function getIssueType() {
    return issueTypeSelect.value;
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
