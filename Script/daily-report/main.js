import * as service from "./service.js";
import * as ui from "./ui.js";
import { dailyReportState as state } from "./state.js";

const projectSelect = ui.getProjectSelect();
const taskReportList = ui.getTaskReportList();
const saveButton = ui.getSaveButton();
const dateInput = ui.getDateInput();
const taskPickerButton = ui.getTaskPickerButton();
const taskPickerList = ui.getTaskPickerList();
const addSelectedTasksButton = ui.getAddSelectedTasksButton();

const user = readCurrentUser();
let hasUnsavedChanges = false;
state.reporter = user;
state.workDate = getLocalDate(new Date());
dateInput.value = state.workDate;
ui.setReporter(user);

if (!user) {
    ui.setMessage("Your signed-in account could not be read. Please sign in again.", "error");
    saveButton.disabled = true;
}

try {
    [state.projects, state.users] = await Promise.all([
        service.loadProjects(),
        service.loadUsers()
    ]);
    const queryProjectID = new URLSearchParams(location.search).get("projectID");
    const savedProjectID = queryProjectID ||
        localStorage.getItem("currentProjectID") ||
        localStorage.getItem("projectID") ||
        "";
    ui.renderProjects(state.projects, savedProjectID);

    if (savedProjectID && state.projects.some(
        project => String(project.id) === String(savedProjectID)
    )) {
        await loadProject(savedProjectID);
    } else {
        resetReportView();
        ui.setMessage("Choose a project to load its tasks and reports.");
    }
} catch (error) {
    console.error("Failed to initialize daily report:", error);
    ui.setMessage(`Could not initialize the daily report: ${error.message}`, "error");
}

projectSelect.addEventListener("change", async () => {
    if (hasUnsavedChanges && !window.confirm("Discard unsaved report changes?")) {
        projectSelect.value = state.projectID;
        return;
    }
    hasUnsavedChanges = false;
    if (!projectSelect.value) {
        state.projectID = "";
        state.tasks = [];
        state.issues = [];
        state.reports = [];
        state.taskReports = {};
        resetReportView();
        return;
    }
    await loadProject(projectSelect.value);
});

dateInput.addEventListener("change", async () => {
    if (!dateInput.value || !state.projectID) {
        return;
    }
    if (hasUnsavedChanges && !window.confirm("Discard unsaved report changes?")) {
        dateInput.value = state.workDate;
        return;
    }
    hasUnsavedChanges = false;
    state.workDate = dateInput.value;
    await loadReports();
});

taskPickerButton.addEventListener("click", () => {
    ui.renderTaskPicker(state.tasks, Object.keys(state.taskReports));
    ui.openTaskPicker();
});

taskPickerList.addEventListener("change", () => {
    ui.updateTaskPickerSelectionCount();
});

addSelectedTasksButton.addEventListener("click", () => {
    ui.getSelectedTaskIDs().forEach(addTaskToReport);
    ui.closeTaskPicker();
    ui.setMessage("");
    renderReport();
});

taskReportList.addEventListener("click", event => {
    const workerPicker = event.target.closest(".task-worker-picker");
    ui.closeWorkerMenus(workerPicker);

    const workerToggle = event.target.closest("[data-worker-toggle]");
    if (workerToggle) {
        ui.toggleWorkerMenu(workerToggle);
        return;
    }

    const workerOption = event.target.closest("[data-worker-option]");
    const workerRemove = event.target.closest("[data-worker-remove]");
    if (workerOption || workerRemove) {
        if (workerOption) {
            ui.selectWorker(workerOption);
        } else {
            ui.removeWorker(workerRemove);
        }
        const row = event.target.closest("tr[data-task-id]");
        updateEntryFromRow(row);
        hasUnsavedChanges = true;
        updateSaveButton();
        return;
    }

    const createIssueButton = event.target.closest("[data-create-issue]");
    if (createIssueButton) {
        const task = state.tasks.find(
            item => String(item.id) === createIssueButton.dataset.createIssue
        );
        if (task) {
            ui.openIssueCreateDialog(task);
        }
        return;
    }

    const removeButton = event.target.closest("[data-remove-task]");
    if (!removeButton) {
        return;
    }
    hasUnsavedChanges = true;
    delete state.taskReports[removeButton.dataset.removeTask];
    renderReport();
});

document.addEventListener("click", event => {
    if (!event.target.closest(".task-worker-picker")) {
        ui.closeWorkerMenus();
    }
});

ui.getIssueCreateForm().addEventListener("submit", createIssue);
document.querySelector("#close-issue-dialog").addEventListener(
    "click",
    ui.closeIssueCreateDialog
);
document.querySelector("#cancel-issue-dialog").addEventListener(
    "click",
    ui.closeIssueCreateDialog
);

taskReportList.addEventListener("change", event => {
    const row = event.target.closest("tr[data-task-id]");
    if (!row) {
        return;
    }
    updateEntryFromRow(row);
    hasUnsavedChanges = true;
    if (event.target.matches(".task-status-select")) {
        ui.updateStatusStyle(event.target);
        if (event.target.value !== "Done") {
            const upload = row.querySelector(".task-evidence-upload");
            if (upload) {
                upload.value = "";
            }
            state.taskReports[row.dataset.taskId].files = [];
        }
    }
    ui.updateEvidenceRequirement(row, state.taskReports[row.dataset.taskId]);
    updateSaveButton();
});

taskReportList.addEventListener("input", event => {
    if (!event.target.matches(".task-evidence-upload, .task-detail-input")) {
        return;
    }
    const row = event.target.closest("tr[data-task-id]");
    if (!row) {
        return;
    }
    updateEntryFromRow(row);
    hasUnsavedChanges = true;
    if (event.target.matches(".task-detail-input")) {
        return;
    }
    ui.updateEvidenceRequirement(row, state.taskReports[row.dataset.taskId]);
    updateSaveButton();
});

saveButton.addEventListener("click", saveReports);

async function loadProject(projectID) {
    state.projectID = String(projectID);
    state.tasks = [];
    state.reports = [];
    state.taskReports = {};
    state.workDate = dateInput.value || getLocalDate(new Date());
    localStorage.setItem("currentProjectID", state.projectID);
    const project = state.projects.find(
        item => String(item.id) === state.projectID
    );
    if (project) {
        localStorage.setItem("projectName", project.name);
    }

    ui.setMessage("Loading project tasks...");
    try {
        [state.tasks, state.issues] = await Promise.all([
            service.loadProjectTasks(state.projectID),
            service.loadProjectIssues(state.projectID)
        ]);
        await loadReports();
        taskPickerButton.disabled = state.tasks.length === 0;
    } catch (error) {
        console.error("Failed to load project tasks:", error);
        ui.setMessage(`Could not load project tasks: ${error.message}`, "error");
        renderReport();
    }
}

async function loadReports() {
    if (!state.projectID || !state.workDate) {
        return;
    }
    ui.setMessage("Loading reports for this date...");
    try {
        const { reportRecords, taskReports } =
            await service.loadReportsForDate(
                state.workDate,
                getReporterName(state.reporter)
            );
        const reportRecordID = reportRecords[0]?.id || "";
        const duplicateReportRecordIDs = reportRecords
            .slice(1)
            .map(report => report.id);
        const reportTaskDailyReportIDs = [
            ...new Set(reportRecords.flatMap(report =>
                service.getRelationIDs(report.task_daily_reports)
            ))
        ];
        const taskIDs = new Set(state.tasks.map(task => String(task.id)));
        const projectTaskReports = taskReports
            .map(report => ({
                report,
                task: findTaskForReport(report, taskIDs)
            }))
            .filter(item => item.task)
            .map(({ report, task }) => ({ ...report, task: task.id }));
        const taskReportEntries = {};
        projectTaskReports.forEach(report => {
            const task = state.tasks.find(
                item => String(item.id) === String(report.task)
            );
            if (!task) {
                return;
            }
            taskReportEntries[String(task.id)] = {
                task,
                report,
                recordID: report.id,
                reportRecordID,
                status: service.normalizeWorkStatus(report.work_status) ||
                    service.getTaskReportStatus(task),
                workerIDs: service.getWorkerIDs(report.worker, state.users),
                detail: report.detail || "",
                files: []
            };
        });
        state.reportRecordID = reportRecordID;
        state.duplicateReportRecordIDs = duplicateReportRecordIDs;
        state.reportTaskDailyReportIDs = reportTaskDailyReportIDs;
        state.reports = projectTaskReports;
        state.taskReports = taskReportEntries;
        renderReport();
        taskPickerButton.disabled = state.tasks.length === 0;
        ui.setMessage(
            projectTaskReports.length
                ? `Loaded ${projectTaskReports.length} saved report${projectTaskReports.length === 1 ? "" : "s"} for this date.`
                : "No saved reports for this date yet."
        );
        return true;
    } catch (error) {
        console.error("Failed to load daily reports:", error);
        ui.setMessage(`Could not load reports for this date: ${error.message}`, "error");
        return false;
    }
}

function addTaskToReport(taskID) {
    const task = state.tasks.find(item => String(item.id) === String(taskID));
    if (!task) {
        ui.setMessage("The selected task could not be found.", "error");
        return;
    }
    const key = String(task.id);
    if (!state.taskReports[key]) {
        state.taskReports[key] = {
            task,
            report: null,
            recordID: "",
            reportRecordID: "",
            status: service.getTaskReportStatus(task),
            workerIDs: [],
            detail: "",
            files: []
        };
        hasUnsavedChanges = true;
    }
}

function updateEntryFromRow(row) {
    const entry = state.taskReports[row.dataset.taskId];
    if (!entry) {
        return;
    }
    entry.status = row.querySelector(".task-status-select").value;
    entry.workerIDs = Array.from(
        row.querySelector(".task-worker-select").selectedOptions,
        option => option.value
    );
    entry.detail = row.querySelector(".task-detail-input").value;
    entry.files = Array.from(row.querySelector(".task-evidence-upload").files);
}

async function saveReports() {
    if (!state.reporter) {
        ui.setMessage("Please sign in again before saving a report.", "error");
        return;
    }
    const entries = Object.values(state.taskReports);
    if (!entries.length) {
        ui.setMessage("Add at least one task before saving the report.", "error");
        return;
    }

    entries.forEach(entry => {
        const values = ui.getFormValues(entry.task.id);
        entry.status = values.status;
        entry.workerIDs = values.workerIDs;
        entry.detail = values.detail;
        entry.files = values.files;
    });

    try {
        entries.forEach(service.validateTaskReport);
    } catch (error) {
        ui.setMessage(error.message, "error");
        return;
    }

    state.isSaving = true;
    ui.setSaving(true);
    ui.setMessage("Saving daily reports...");
    try {
        for (const entry of entries) {
            entry.users = state.users;
            entry.workDate = state.workDate;
            entry.reporter = getReporterName(state.reporter);
            const result = await service.saveTaskReport(entry);
            entry.report = result;
            entry.recordID = result.id;
            state.reportTaskDailyReportIDs.push(result.id);
            entry.task.progress = service.getProgressForStatus(entry.status);
            entry.files = [];
        }
        const reportRecord = await service.saveDailyReport({
            reportRecordID: state.reportRecordID,
            duplicateReportRecordIDs: state.duplicateReportRecordIDs,
            taskDailyReportIDs: state.reportTaskDailyReportIDs,
            workDate: state.workDate,
            reporter: getReporterName(state.reporter)
        });
        state.reportRecordID = reportRecord.id;
        state.duplicateReportRecordIDs = [];
        hasUnsavedChanges = false;
        ui.clearEvidenceFiles();
        const reportsLoaded = await loadReports();
        if (reportsLoaded) {
            ui.setMessage("Daily reports saved successfully.", "success");
        }
    } catch (error) {
        console.error("Failed to save daily report:", error);
        ui.setMessage(`Could not save daily report: ${error.message}`, "error");
    } finally {
        state.isSaving = false;
        ui.setSaving(false);
        renderReport();
    }
}

async function createIssue(event) {
    event.preventDefault();
    const task = state.tasks.find(
        item => String(item.id) === ui.getIssueTaskID()
    );
    const project = state.projects.find(
        item => String(item.id) === state.projectID
    );
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") || "").trim();
    const type = String(formData.get("type") || "");
    const reporter = getReporterName(state.reporter);

    if (!task || !project || !title || !reporter) {
        ui.setMessage("Sign in, select a project and task, and enter an issue title.", "error");
        return;
    }
    if (!service.ISSUE_TYPES.includes(type)) {
        ui.setMessage("Choose an issue type.", "error");
        return;
    }

    ui.setIssueCreateSaving(true);
    try {
        const issue = await service.createProjectIssue({
            title,
            type,
            project: project.id,
            project_name: project.name,
            related_stage: task.stage_name || "",
            related_task: task.name,
            reporter,
            createdDate: new Date().toISOString()
        });
        // Giữ thông tin task để issue luôn hiện ở cột Issues của đúng task
        state.issues.unshift({
            ...issue,
            type: issue.type || type,
            related_task: issue.related_task || task.name,
            related_stage: issue.related_stage || task.stage_name || ""
        });
        ui.closeIssueCreateDialog();
        ui.setMessage("");
        renderReport();
    } catch (error) {
        console.error("Failed to create issue from daily report:", error);
        ui.setMessage(`Could not create issue: ${error.message}`, "error");
    } finally {
        ui.setIssueCreateSaving(false);
    }
}

function renderReport() {
    ui.renderTaskReports(
        state.taskReports,
        state.users,
        state.issues,
        state.projectID
    );
    ui.renderTaskPicker(state.tasks, Object.keys(state.taskReports));
    updateSaveButton();
}

function resetReportView() {
    state.tasks = [];
    state.issues = [];
    state.reports = [];
    state.taskReports = {};
    state.reportRecordID = "";
    state.duplicateReportRecordIDs = [];
    state.reportTaskDailyReportIDs = [];
    renderReport();
    taskPickerButton.disabled = true;
}

function updateSaveButton() {
    const entries = Object.values(state.taskReports);

    // Report rỗng (không có task) thì không cho lưu
    const valid = Boolean(state.reporter) && entries.length > 0 && entries.every(entry => {
        const files = entry.files || [];

        // Chỉ nhận file ảnh, tối đa 5 MiB
        if (files.some(file =>
            !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024
        )) {
            return false;
        }

        // Chỉ task Done mới bắt buộc có ảnh (ảnh mới chọn hoặc ảnh đã lưu trước đó)
        if (entry.status === "Done") {
            const hasSavedEvidence = service.getEvidenceFiles(entry.report).length > 0;
            return files.length > 0 || hasSavedEvidence;
        }

        return true;
    });

    ui.setSaveEnabled(valid && !state.isSaving);
}

function findTaskForReport(report, projectTaskIDs) {
    if (report.task && projectTaskIDs.has(String(report.task))) {
        return state.tasks.find(
            task => String(task.id) === String(report.task)
        );
    }

    const reportTitle = normalizeText(report.taskTitle);
    if (!reportTitle) {
        return null;
    }
    const matchingTasks = state.tasks.filter(task =>
        normalizeText(task.name) === reportTitle
    );
    const reportStage = normalizeText(report.taskStage);
    return matchingTasks.find(task =>
        normalizeText(task.stage_name) === reportStage
    ) || (matchingTasks.length === 1 ? matchingTasks[0] : null);
}

function normalizeText(value) {
    return String(value || "").trim().toLocaleLowerCase();
}

function readCurrentUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Could not read signed-in user:", error);
        return null;
    }
}

function getReporterName(currentUser) {
    return currentUser?.employee_name ||
        currentUser?.name ||
        currentUser?.email ||
        "";
}

function getLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
