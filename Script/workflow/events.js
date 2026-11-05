import * as service from "./service.js";
import * as ui from "./ui.js";
import * as utils from "../utils/utils.js";

import { setZoom } from "./gantt.js";
import { workflowData, projectData } from "./state.js";
import { workflowPageMessage } from "./messages.js";

// =========================================================
// GANTT EVENTS
// =========================================================
export function bindGanttEvents() {

    // ---------- Select Task ----------
    gantt.attachEvent("onTaskSelected", function (id) {
        workflowData.currentTaskID = id;
        return true;
    });

    // ---------- Drag (drag đang tắt trong config) ----------
    gantt.attachEvent("onAfterTaskDrag", async function (id) {
        const success = await saveTask(id);
        if (success) {
            renderIssues();
        }
        gantt.batchUpdate(() => {
            gantt.clearAll();
            gantt.parse(projectData);
        });
    });

    // ---------- Lightbox Save ----------
    gantt.attachEvent("onLightboxSave", async function (id, task) {
        const success = await saveTask(id, task);
        if (!success) {
            return false;
        }

        renderIssues();
        return true;
    });

    // ---------- Lightbox opened → load lịch sử báo cáo ----------
    gantt.attachEvent("onLightbox", function (id) {
        loadReportHistory(id);
        return true;
    });

    // ---------- Delete Task ----------
    gantt.attachEvent("onAfterTaskDelete", async function (id) {
        try {
            await service.deleteTask(id);
            // Bỏ task khỏi state → không còn tính là task trễ hạn / tiến độ stage
            workflowData.tasks = workflowData.tasks.filter(task => String(task.id) !== String(id));
            renderIssues();
        } catch (error) {
            console.log(error);
            utils.showError(workflowPageMessage.deleteFailed);
        }

        if (workflowData.currentTaskID === id) {
            workflowData.currentTaskID = null;
        }
        return true;
    });

    // ---------- Task styling ----------
    gantt.attachEvent("onTaskLoading", function (task) {
        ui.setTaskColor(task);
        return true;
    });

    // ---------- Today line ----------
    gantt.attachEvent("onScroll", ui.renderTodayLine);
    gantt.attachEvent("onTaskDrag", ui.renderTodayLine);
    gantt.attachEvent("onGanttRender", ui.renderTodayLine);

    // ---------- Overdue segment ----------
    gantt.attachEvent("onBeforeGanttRender", ui.fitScaleToDelays);
    gantt.attachEvent("onGanttRender", ui.renderDelaySegments);
    gantt.attachEvent("onDataRender", ui.renderDelaySegments);
}

// =========================================================
// UI EVENTS (Toolbar + Buttons)
// =========================================================
export function bindUIEvents() {

    // ---------- Zoom ----------
    Object.entries({ day: "btnDay", week: "btnWeek", month: "btnMonth" })
        .forEach(([level, buttonID]) => {
            document.getElementById(buttonID).addEventListener("click", () => {
                ui.setActiveZoomButton(level);
                setZoom(level);
            });
        });

    // ---------- Stage icon → mở modal tạo task ----------
    document.addEventListener("click", function (e) {
        const icon = e.target.closest(".stage-icon-button");
        if (!icon) return;

        e.preventDefault();
        e.stopPropagation();
        openCreateTaskModal(icon.dataset.id, icon.dataset.name);
    });

    // ---------- Modal buttons ----------
    document.addEventListener("click", function (e) {
        const id = e.target.id;
        if (id === "btnCancel") {
            ui.closeTaskModal();
        }
        if (id === "btnCreate") {
            handleCreateTask();
        }
    });

    document.querySelector(".task-modal-overlay")
        ?.addEventListener("click", ui.closeTaskModal);

    // ---------- Report history flag → xem ảnh evidence ----------
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".report-history-flag")) return;

        e.preventDefault();
        ui.openEvidenceViewer(
            service.getLatestEvidenceUrls(workflowData.reportHistory)
        );
    });

    const evidenceViewer = ui.getEvidenceViewer();
    evidenceViewer.addEventListener("click", e => {
        // click nút đóng hoặc vùng nền ngoài khung ảnh
        if (e.target === evidenceViewer || e.target.closest("[data-close-evidence]")) {
            ui.closeEvidenceViewer();
        }
    });

    // ---------- Issues table ----------
    ui.getSelectAllCheckbox().addEventListener("change", event => {
        ui.setAllIssueRowsChecked(event.target.checked);
        ui.updateIssueSelection();
    });

    ui.getIssueTableBody().addEventListener("change", e => {
        if (e.target.matches(".row-check")) {
            ui.updateIssueSelection();
        }
    });

    ui.getDeleteIssuesButton().addEventListener("click", handleDeleteIssues);

    ui.getIssueFilterInputs()
        .forEach(el => el.addEventListener("input", renderIssues));

    // ---------- Thẻ tiến độ stage: bấm số issue → lọc bảng Issues theo stage ----------
    document.getElementById("stage-progress-grid")?.addEventListener("click", event => {
        const link = event.target.closest("[data-stage-issues]");
        if (!link) return;

        // Chọn đúng option của ô lọc stage (không phân biệt hoa / thường)
        const stageName = link.dataset.stageIssues.trim().toLowerCase();
        const option = [...document.getElementById("stageFilter").options]
            .find(item => item.value.toLowerCase() === stageName);
        ui.setStageFilter(option?.value ?? "all");
        renderIssues();
        document.querySelector(".issues-panel")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // ---------- Cột trái: bấm stage để lọc, bấm lại để bỏ lọc ----------
    ui.getStageStatButtons().forEach(button => {
        button.addEventListener("click", () => {
            const { stage } = ui.getIssueFilters();
            ui.setStageFilter(stage === button.dataset.stage ? "all" : button.dataset.stage);
            renderIssues();
        });
    });

    // ---------- Người xử lý + thời hạn: giao 1 lần, sau đó khóa ----------
    ui.getIssueTableBody().addEventListener("click", event => {
        const button = event.target.closest("[data-assign-issue]");
        if (button) assignIssue(button.dataset.assignIssue);
    });

    // ---------- Solution: sửa trực tiếp trong bảng ----------
    const issueTableBody = ui.getIssueTableBody();

    issueTableBody.addEventListener("click", e => {
        const cell = e.target.closest("td.solution");
        if (!cell) return;

        if (e.target.closest("[data-edit-solution]")) {
            ui.showSolutionEditor(cell, getIssueSolution(cell));
        } else if (e.target.closest("[data-save-solution]")) {
            saveIssueSolution(cell);
        } else if (e.target.closest("[data-cancel-solution]")) {
            ui.showSolutionView(cell, getIssueSolution(cell));
        }
    });

    issueTableBody.addEventListener("keydown", e => {
        if (!e.target.matches(".solution-input")) return;
        const cell = e.target.closest("td.solution");

        if (e.key === "Escape") {
            ui.showSolutionView(cell, getIssueSolution(cell));
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveIssueSolution(cell);
        }
    });
}

// =========================================================
// DELETE ISSUES
// =========================================================
async function handleDeleteIssues() {
    const ids = ui.getSelectedIssueIDs();
    if (!ids.length) return;

    const confirmed = await utils.showConfirm(
        `Xóa ${ids.length} issue?`,
        workflowPageMessage.deleteIssueConfirm,
        "Delete"
    );
    if (!confirmed) return;

    ui.setDeleteIssuesSaving(true);
    try {
        const { failedIDs } = await service.deleteIssues(ids);

        renderIssues();

        if (failedIDs.length) {
            utils.showError(workflowPageMessage.deleteIssueFailed);
        } else {
            utils.showSuccess(workflowPageMessage.deleteIssueSuccess);
        }
    } finally {
        ui.setDeleteIssuesSaving(false);
    }
}

// =========================================================
// GIAO NGƯỜI XỬ LÝ + THỜI HẠN
// =========================================================
async function assignIssue(issueID) {
    const issue = service.findIssue(issueID);
    if (!issue) return;

    const { handlerID, deadline } = ui.getAssignmentValues(issueID);
    if (!handlerID || !deadline) {
        utils.showError("Vui lòng chọn cả người xử lý và thời hạn.");
        return;
    }

    const handler = service.getHandlerCandidates(issue).find(user => user.id === handlerID);
    const [year, month, day] = deadline.split("-");
    const confirmed = await utils.showConfirm(
        "Giao người xử lý?",
        `Giao "${issue.title}" cho ${service.getUserName(handler)}, hạn ${day}/${month}/${year}. ` +
        "Sau khi giao sẽ không thể thay đổi người xử lý và thời hạn."
    );
    if (!confirmed) return;

    ui.setAssignSaving(issueID, true);
    try {
        await service.assignIssueHandler(issueID, handlerID, deadline);
        utils.showSuccess("Đã giao người xử lý cho issue.");
    } catch (error) {
        console.error(error);
        utils.showError(error.message || "Không thể giao người xử lý.");
    } finally {
        // Vẽ lại bảng: dòng vừa giao chuyển sang trạng thái khóa
        renderIssues();
    }
}

// =========================================================
// ISSUE SOLUTION HANDLERS
// =========================================================
function getIssueSolution(cell) {
    return service.findIssue(cell.dataset.issueId)?.solution || "";
}

async function saveIssueSolution(cell) {
    const issueID = cell.dataset.issueId;
    const solution = ui.getSolutionInputValue(cell);

    // Không thay đổi thì chỉ đóng editor
    if (solution === getIssueSolution(cell)) {
        ui.showSolutionView(cell, solution);
        return;
    }

    ui.setSolutionSaving(cell, true);
    try {
        await service.updateIssueSolution(issueID, solution);
        ui.showSolutionView(cell, getIssueSolution(cell));
        // Có / bỏ solution → đổi số issue "chưa xử lý" trong thẻ stage
        renderStageProgress();
        utils.showSuccess(workflowPageMessage.solutionUpdateSuccess);
    } catch (error) {
        console.error(error);
        ui.setSolutionSaving(cell, false);
        utils.showError(workflowPageMessage.solutionUpdateFailed);
    }
}

// =========================================================
// RENDER HELPERS
// =========================================================
export function renderIssues() {
    const filters = ui.getIssueFilters();
    // Số issue ở tiêu đề: issue trong database + task trễ hạn
    ui.renderIssueCount(service.getAllIssues().length);
    ui.renderIssueTable(service.filterIssues(filters));
    ui.renderStageIssueCounts(service.countIssuesByStage());
    ui.highlightStageStat(filters.stage);
    // Số issue trong thẻ tiến độ của từng stage
    renderStageProgress();
}

/**
 * Vẽ tiến độ từng stage (kèm số issue của stage) và tổng tiến độ project (trung bình các stage).
 */
export function renderStageProgress() {
    const stageProgressList = service.getStageProgressList();
    ui.renderStageProgressCards(stageProgressList, service.getIssueSummaryByStage());
    ui.updateProgress(service.getOverallProgress(stageProgressList));
}

// =========================================================
// TASK HANDLERS
// =========================================================

/**
 * Lưu task đang sửa trên gantt về database.
 * @returns {Promise<boolean>}
 */
async function saveTask(id, task = gantt.getTask(id)) {
    if (!service.findTask(id)) {
        utils.showError("Không tìm thấy task.");
        return false;
    }

    const formatDate = gantt.date.date_to_str("%Y-%m-%d");
    const taskData = {
        name: task.text,
        start_date: formatDate(task.start_date),
        duration: task.duration,
        progress: task.progress,
        updatedBy:
            JSON.parse(localStorage.getItem("user"))
                ?.employee_name ?? ""
    };

    try {
        return await service.updateTask(id, taskData, workflowData.projectID);
    } catch (error) {
        console.error(error);
        utils.showError(workflowPageMessage.updateFailed);
        return false;
    }
}

/**
 * Load và render lịch sử báo cáo vào popup của task.
 * Bỏ qua kết quả nếu người dùng đã đóng/chuyển sang popup khác.
 */
async function loadReportHistory(taskID) {
    const node = ui.getReportHistoryNode();
    if (!node) return;

    workflowData.reportHistory = [];
    ui.renderReportHistoryMessage(node, "Đang tải báo cáo...");

    const isCurrentLightbox = () => gantt.getState().lightbox == taskID;

    try {
        const history = await service.loadTaskReportHistory(taskID);
        if (!isCurrentLightbox()) return;

        workflowData.reportHistory = history;
        ui.renderReportHistory(
            node,
            history,
            service.isTaskDone(service.findTask(taskID))
        );
    } catch (error) {
        console.error(error);
        if (isCurrentLightbox()) {
            ui.renderReportHistoryMessage(node, "Không tải được lịch sử báo cáo.");
        }
    }
}

function openCreateTaskModal(stageID, stageName) {
    workflowData.currentStageID = stageID;
    ui.openTaskModal(stageName, service.getMinStartDate(stageID));
}

async function handleCreateTask() {
    const formData = ui.getTaskFormData();

    if (!service.isValidTaskInput(formData)) {
        utils.showError("Dữ liệu task không hợp lệ.");
        ui.closeTaskModal();
        return;
    }

    try {
        const task = await service.createTask(formData);

        if (task) {
            utils.showSuccess(workflowPageMessage.createSuccess);

            service.addTaskToState(task);

            gantt.clearAll();
            gantt.parse(projectData);
            // Tiến độ stage + danh sách issue (task mới có thể đã trễ hạn)
            renderIssues();
        }
    } catch (error) {
        console.error(error);
        utils.showError(workflowPageMessage.createFailed);
    }

    ui.closeTaskModal();
}
