import * as service from "./service.js";
import * as ui from "./ui.js";
import * as utils from "../utils/utils.js";

import { setZoom } from "./gantt.js";
import { workflowData, projectData, issueData } from "./state.js";
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
            renderStageProgress();
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

        renderStageProgress();
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

    // ---------- Cột trái: bấm stage để lọc, bấm lại để bỏ lọc ----------
    ui.getStageStatButtons().forEach(button => {
        button.addEventListener("click", () => {
            const { stage } = ui.getIssueFilters();
            ui.setStageFilter(stage === button.dataset.stage ? "all" : button.dataset.stage);
            renderIssues();
        });
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
        `Delete ${ids.length} issue${ids.length === 1 ? "" : "s"}?`,
        workflowPageMessage.deleteIssueConfirm,
        "Delete"
    );
    if (!confirmed) return;

    ui.setDeleteIssuesSaving(true);
    try {
        const { failedIDs } = await service.deleteIssues(ids);

        ui.renderIssueCount(issueData.issue.length);
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
    ui.renderIssueTable(service.filterIssues(filters));
    ui.renderStageIssueCounts(service.countIssuesByStage());
    ui.highlightStageStat(filters.stage);
}

/**
 * Vẽ tiến độ từng stage và tổng tiến độ project (trung bình các stage).
 */
export function renderStageProgress() {
    const stageProgressList = service.getStageProgressList();
    ui.renderStageProgressCards(stageProgressList);
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
        utils.showError("Task not found.");
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
    ui.renderReportHistoryMessage(node, "Loading reports...");

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
            ui.renderReportHistoryMessage(node, "Could not load report history.");
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
        utils.showError("Invalid task data.");
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
            renderStageProgress();
        }
    } catch (error) {
        console.error(error);
        utils.showError(workflowPageMessage.createFailed);
    }

    ui.closeTaskModal();
}
