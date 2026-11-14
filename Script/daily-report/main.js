import * as service from "./service.js";
import * as ui from "./ui.js";
import * as notification from "../services/notification.api.js";
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
// Sau lần bấm Lưu đầu tiên mới tô đỏ ô bắt buộc còn thiếu (không làm phiền khi mới thêm task)
let showRequiredErrors = false;
state.reporter = user;
// Mỗi dự án, mỗi ngày chỉ có MỘT báo cáo chung cho tất cả mọi người.
// Đã nộp rồi thì khóa; chỉ Part Leader được sửa báo cáo cũ.
state.canEditSubmitted = service.canEditSubmittedReport(user);
// Tên người nộp báo cáo đang xem (field `reporter`) — chưa nộp thì là chính mình
state.reportOwnerName = getReporterName(user);
state.workDate = getLocalDate(new Date());
dateInput.value = state.workDate;
ui.setReporter(user);

if (!user) {
    ui.setMessage("Không đọc được tài khoản đăng nhập. Vui lòng đăng nhập lại.", "error");
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
        ui.setMessage("Chọn dự án để tải task và báo cáo.");
    }
} catch (error) {
    console.error("Failed to initialize daily report:", error);
    ui.setMessage(`Không khởi tạo được báo cáo ngày: ${error.message}`, "error");
}

projectSelect.addEventListener("change", async () => {
    if (hasUnsavedChanges && !window.confirm("Bỏ các thay đổi chưa lưu của báo cáo?")) {
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
    if (hasUnsavedChanges && !window.confirm("Bỏ các thay đổi chưa lưu của báo cáo?")) {
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
        // Lấy dòng TRƯỚC khi chọn/bỏ: ô người làm được vẽ lại nên nút vừa bấm
        // bị gỡ khỏi trang, closest() sau đó sẽ trả về null
        const row = event.target.closest("tr[data-task-id]");
        if (workerOption) {
            ui.selectWorker(workerOption);
        } else {
            ui.removeWorker(workerRemove);
        }
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
    if (!removeButton || isReportLocked()) {
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
    state.isSubmitted = false;
    showRequiredErrors = false;
    state.workDate = dateInput.value || getLocalDate(new Date());
    localStorage.setItem("currentProjectID", state.projectID);
    const project = state.projects.find(
        item => String(item.id) === state.projectID
    );
    if (project) {
        localStorage.setItem("projectName", project.name);
    }

    ui.setMessage("Đang tải task của dự án...");
    try {
        [state.tasks, state.issues] = await Promise.all([
            service.loadProjectTasks(state.projectID),
            service.loadProjectIssues(state.projectID)
        ]);
        await loadReports();
        updateTaskPickerButton();
    } catch (error) {
        console.error("Failed to load project tasks:", error);
        ui.setMessage(`Không tải được task của dự án: ${error.message}`, "error");
        renderReport();
    }
}

async function loadReports() {
    if (!state.projectID || !state.workDate) {
        return;
    }
    ui.setMessage("Đang tải báo cáo của ngày này...");
    try {
        const {
            reportRecordID,
            reportTaskDailyReportIDs,
            projectTaskReports,
            ownerNames
        } = await fetchProjectReport(state.workDate);
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
        state.reportTaskDailyReportIDs = reportTaskDailyReportIDs;
        state.reports = projectTaskReports;
        state.taskReports = taskReportEntries;
        // Đã có báo cáo của dự án + ngày này (bất kể ai nộp) → đã báo cáo
        state.isSubmitted = projectTaskReports.length > 0;
        showRequiredErrors = false;
        // Part Leader sửa báo cáo cũ vẫn giữ tên người nộp gốc
        state.reportOwnerName = ownerNames[0] || getReporterName(state.reporter);
        ui.setReporterName(state.isSubmitted ? ownerNames.join(", ") : state.reportOwnerName);
        renderReport();
        ui.setMessage(
            state.isSubmitted
                ? `Đã tải báo cáo của ngày này (${projectTaskReports.length} task).`
                : "Ngày này dự án chưa có báo cáo."
        );
        return true;
    } catch (error) {
        console.error("Failed to load daily reports:", error);
        ui.setMessage(`Không tải được báo cáo của ngày này: ${error.message}`, "error");
        return false;
    }
}

/**
 * Báo cáo chung của dự án đang chọn trong một ngày (của bất kỳ ai nộp).
 * Một bản ghi Reports có thể chứa task của nhiều dự án → chỉ lấy phần thuộc dự án này.
 */
async function fetchProjectReport(workDate) {
    const { reportRecords, taskReports } = await service.loadReportsForDate(workDate);

    const taskIDs = new Set(state.tasks.map(task => String(task.id)));
    const projectTaskReports = taskReports
        .map(report => ({
            report,
            task: findTaskForReport(report, taskIDs)
        }))
        .filter(item => item.task)
        .map(({ report, task }) => ({ ...report, task: task.id }));

    // Bản ghi Reports chứa báo cáo của dự án này (bình thường chỉ có 1)
    const projectReportIDs = new Set(projectTaskReports.map(report => String(report.reportID)));
    const projectReportRecords = reportRecords.filter(report =>
        projectReportIDs.has(String(report.id))
    );
    const mainRecord = projectReportRecords[0];

    return {
        reportRecordID: mainRecord?.id || "",
        // Giữ toàn bộ task report của bản ghi (kể cả của dự án khác nếu có) khi cập nhật
        reportTaskDailyReportIDs: mainRecord
            ? service.getRelationIDs(mainRecord.task_daily_reports)
            : [],
        projectTaskReports,
        ownerNames: [...new Set(projectReportRecords.map(report => report.reporter).filter(Boolean))]
    };
}

function addTaskToReport(taskID) {
    const task = state.tasks.find(item => String(item.id) === String(taskID));
    if (!task) {
        ui.setMessage("Không tìm thấy task đã chọn.", "error");
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
    if (!row) {
        return;
    }
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

    // Đã bấm Lưu mà còn thiếu → nhập bổ sung tới đâu thì bỏ tô đỏ tới đó
    if (showRequiredErrors) {
        ui.setRowRequiredErrors(row, service.getMissingRequiredFields(entry));
    }
}

async function saveReports() {
    if (!state.reporter) {
        ui.setMessage("Vui lòng đăng nhập lại trước khi lưu báo cáo.", "error");
        return;
    }
    if (isReportLocked()) {
        ui.setMessage("Dự án đã có báo cáo của ngày này. Chỉ Part Leader mới được chỉnh sửa.", "error");
        return;
    }
    const entries = Object.values(state.taskReports);
    if (!entries.length) {
        ui.setMessage("Thêm ít nhất một task trước khi lưu báo cáo.", "error");
        return;
    }

    entries.forEach(entry => {
        const values = ui.getFormValues(entry.task.id);
        entry.status = values.status;
        entry.workerIDs = values.workerIDs;
        entry.detail = values.detail;
        entry.files = values.files;
    });

    // Người làm và Chi tiết bắt buộc → báo lỗi, tô đỏ ô thiếu, không ghi gì vào database
    showRequiredErrors = true;
    const incompleteEntries = entries.filter(entry => {
        const missing = service.getMissingRequiredFields(entry);
        const row = ui.getTaskRow(entry.task.id);
        if (row) ui.setRowRequiredErrors(row, missing);
        return missing.worker || missing.detail;
    });
    if (incompleteEntries.length) {
        const names = incompleteEntries.map(entry => `"${entry.task.name}"`).join(", ");
        ui.setMessage(`Vui lòng nhập đủ Người làm và Chi tiết cho: ${names}.`, "error");
        ui.getTaskRow(incompleteEntries[0].task.id)
            ?.querySelector(".task-required-cell.is-invalid")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
    }

    try {
        entries.forEach(service.validateTaskReport);
    } catch (error) {
        ui.setMessage(error.message, "error");
        return;
    }

    // Mỗi dự án mỗi ngày chỉ nộp 1 lần → người không phải Part Leader xác nhận trước
    if (!state.isSubmitted && !state.canEditSubmitted && !window.confirm(
        "Mỗi ngày dự án chỉ có một báo cáo. Sau khi lưu, báo cáo sẽ bị khóa và " +
        "không ai chỉnh sửa được nữa (trừ Part Leader). Bạn chắc chắn muốn lưu?"
    )) {
        return;
    }

    state.isSaving = true;
    ui.setSaving(true);
    ui.setMessage("Đang lưu báo cáo...");
    try {
        // Lần nộp đầu: kiểm tra lại, phòng trường hợp người khác vừa nộp trong lúc đang soạn
        if (!state.isSubmitted) {
            const latest = await fetchProjectReport(state.workDate);
            if (latest.projectTaskReports.length > 0) {
                hasUnsavedChanges = false;
                await loadReports();
                ui.setMessage(
                    `${latest.ownerNames.join(", ") || "Một người khác"} vừa nộp báo cáo của ngày này. ` +
                    "Báo cáo của bạn chưa được lưu.",
                    "error"
                );
                return;
            }
        }

        for (const entry of entries) {
            entry.users = state.users;
            entry.workDate = state.workDate;
            entry.reporter = state.reportOwnerName;
            const result = await service.saveTaskReport(entry);
            entry.report = result;
            entry.recordID = result.id;
            state.reportTaskDailyReportIDs.push(result.id);
            entry.task.progress = service.getProgressForStatus(entry.status);
            entry.files = [];
        }
        const reportRecord = await service.saveDailyReport({
            reportRecordID: state.reportRecordID,
            taskDailyReportIDs: state.reportTaskDailyReportIDs,
            workDate: state.workDate,
            // Lần đầu: người đang nộp; Part Leader sửa: giữ tên người nộp gốc
            reporter: state.reportOwnerName
        });
        state.reportRecordID = reportRecord.id;
        hasUnsavedChanges = false;
        ui.clearEvidenceFiles();
        const reportsLoaded = await loadReports();
        if (reportsLoaded) {
            ui.setMessage("Đã lưu báo cáo ngày.", "success");
        }
    } catch (error) {
        console.error("Failed to save daily report:", error);
        ui.setMessage(`Không lưu được báo cáo: ${error.message}`, "error");
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
        ui.setMessage("Hãy đăng nhập, chọn dự án, task và nhập tiêu đề issue.", "error");
        return;
    }
    if (!service.ISSUE_TYPES.includes(type)) {
        ui.setMessage("Vui lòng chọn loại issue.", "error");
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
        // Báo cho người có chức vụ phụ trách loại issue (không chờ)
        notification.notifyIssueCreated({ ...issue, type: issue.type || type, related_task: issue.related_task || task.name });
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
        ui.setMessage(`Không tạo được issue: ${error.message}`, "error");
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

    // Bảng vừa vẽ lại → tô đỏ lại các ô bắt buộc còn thiếu (nếu đã bấm Lưu)
    if (showRequiredErrors) {
        Object.values(state.taskReports).forEach(entry => {
            const row = ui.getTaskRow(entry.task.id);
            if (row) ui.setRowRequiredErrors(row, service.getMissingRequiredFields(entry));
        });
    }

    ui.applyReportLock({
        isSubmitted: state.isSubmitted,
        isLocked: isReportLocked(),
        workDate: state.workDate,
        ownerName: state.reportOwnerName
    });
    updateTaskPickerButton();
    updateSaveButton();
}

/**
 * Đã báo cáo dự án + ngày này và không phải Part Leader → không được sửa.
 */
function isReportLocked() {
    return state.isSubmitted && !state.canEditSubmitted;
}

function updateTaskPickerButton() {
    taskPickerButton.disabled = state.tasks.length === 0 || isReportLocked();
}

function resetReportView() {
    state.tasks = [];
    state.issues = [];
    state.reports = [];
    state.taskReports = {};
    state.reportRecordID = "";
    state.reportTaskDailyReportIDs = [];
    state.isSubmitted = false;
    showRequiredErrors = false;
    state.reportOwnerName = getReporterName(state.reporter);
    ui.setReporterName(state.reportOwnerName);
    renderReport();
}

function updateSaveButton() {
    if (isReportLocked()) {
        ui.setSaveEnabled(false);
        return;
    }

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

        // Mọi task trong báo cáo ngày đều bắt buộc có ảnh (ảnh mới chọn hoặc ảnh đã lưu trước đó)
        const hasSavedEvidence = service.getEvidenceFiles(entry.report).length > 0;
        return files.length > 0 || hasSavedEvidence;
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
        const storedUser = sessionStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Could not read signed-in user:", error);
        return null;
    }
}

function getReporterName(currentUser) {
    return service.getReporterName(currentUser);
}

function getLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
