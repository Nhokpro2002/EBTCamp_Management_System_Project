import * as api from "../services/generic.api.js";
import { URL_LOCAL } from "../config.js";

const COLLECTION_PROJECTS = "Projects";
const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_USERS = "Users";
const COLLECTION_ISSUES = "Issues";
const COLLECTION_DAILY_REPORTS = "TaskDailyReports";
const COLLECTION_REPORTS = "Reports";
const PAGE_SIZE = 100;
const MAX_EVIDENCE_SIZE = 5 * 1024 * 1024;
export const ISSUE_TYPES = ["Electric", "Mechanical", "Missing Material", "Program", "Robot"];

// Role được phép sửa báo cáo đã lưu (tên đúng như trong field position của Users)
const REPORT_EDITOR_ROLE = "Part Leader";

/**
 * User có quyền sửa báo cáo ngày đã lưu không (role Part Leader).
 * position có thể là mảng (multi select) hoặc chuỗi "A, B".
 */
export function canEditSubmittedReport(user) {
    const position = user?.position;
    const roles = Array.isArray(position) ? position : String(position || "").split(",");
    return roles.some(role =>
        String(role).trim().toLowerCase() === REPORT_EDITOR_ROLE.toLowerCase()
    );
}


export async function saveProjectIssue(issue) {
    const { tempID, taskID, ...data } = issue;
    return api.createRecord(COLLECTION_ISSUES, data);
}

export async function loadProjects() {
    const firstPage = await api.loadInventoryItemEachPage(
        COLLECTION_PROJECTS,
        1,
        200
    );
    const rest = await Promise.all(
        Array.from(
            { length: Math.max(0, firstPage.totalPages - 1) },
            (_, index) => api.loadInventoryItemEachPage(
                COLLECTION_PROJECTS,
                index + 2,
                200
            )
        )
    );

    return [
        ...firstPage.items,
        ...rest.flatMap(page => page.items)
    ];
}

/**
 * Toàn bộ user (tất cả các trang) — dùng cho ô người làm và ô chọn người báo cáo của Part Leader.
 */
export async function loadUsers() {
    const users = [];
    let page = 1;
    let totalPages = 1;

    do {
        const result = await api.loadInventoryItemEachPage(COLLECTION_USERS, page, 200);
        users.push(...result.items);
        totalPages = result.totalPages || 1;
        page++;
    } while (page <= totalPages);

    return users;
}

/**
 * Tên người báo cáo — giá trị lưu ở field `reporter` của Reports / TaskDailyReports.
 */
export function getReporterName(user) {
    return user?.employee_name || user?.name || user?.email || "";
}

export async function loadProjectTasks(projectID) {
    const stages = await getAllFilteredRecords(
        COLLECTION_STAGES,
        "project",
        projectID
    );
    const taskPages = await Promise.all(
        stages.map(stage => getAllFilteredRecords(
            COLLECTION_TASKS,
            "stage",
            stage.id
        ))
    );
    // Task Plan (chưa được Part Leader duyệt) chưa hoạt động → không báo cáo được.
    // Task cũ chưa có status coi như đã duyệt.
    const tasks = taskPages.flat().filter(task =>
        String(task.status || "").trim().toLowerCase() !== "plan"
    );

    return tasks.map(task => ({
        ...task,
        stage_name: stages.find(stage => String(stage.id) === String(task.stage))?.name || ""
    }));
}

export async function loadProjectIssues(projectID) {
    return getAllFilteredRecords(
        COLLECTION_ISSUES,
        "project",
        projectID
    );
}

export async function createProjectIssue(issue) {
    return api.createRecord(COLLECTION_ISSUES, issue);
}

export function getWorkerName(workerID, users) {
    const user = users.find(item => String(item.id) === String(workerID));
    return user?.employee_name ||
        user?.employee_id ||
        user?.name ||
        user?.email ||
        "";
}

export function getWorkerIDs(workerValue, users) {
    let workerNames = [];
    try {
        const parsed = JSON.parse(workerValue);
        workerNames = Array.isArray(parsed) ? parsed : [workerValue];
    } catch {
        workerNames = workerValue ? [workerValue] : [];
    }

    return workerNames
        .map(name => users.find(user =>
            [user.employee_name, user.employee_id, user.name, user.email]
                .some(value => value && value === name)
        )?.id)
        .filter(Boolean)
        .map(String);
}

export function getWorkerNames(workerIDs, users) {
    return workerIDs
        .map(workerID => getWorkerName(workerID, users))
        .filter(Boolean);
}

/**
 * Mọi báo cáo (Reports) của một ngày, của bất kỳ người báo cáo nào,
 * kèm các báo cáo task (TaskDailyReports) bên trong.
 * Mỗi dự án mỗi ngày chỉ có một báo cáo chung → phải xét báo cáo của tất cả mọi người.
 */
export async function loadReportsForDate(workDate) {
    // [ngày D, ngày D+1) — đúng cho cả field kiểu text ("2026-11-02") lẫn kiểu date ("2026-11-02 00:00:00.000Z")
    const reportRecords = await getAllRecordsByFilter(
        COLLECTION_REPORTS,
        `report_date >= ${api.quoteFilterValue(workDate)} && ` +
        `report_date < ${api.quoteFilterValue(getNextDate(workDate))}`
    );
    const matchingReports = reportRecords.filter(report =>
        getDateOnly(report.report_date) === workDate
    );
    const reportGroups = await Promise.all(matchingReports.map(async reportRecord => {
        const taskDailyReportIDs = getRelationIDs(reportRecord.task_daily_reports);
        const taskReports = await Promise.all(taskDailyReportIDs.map(async taskDailyReportID => {
            const linkedRecords = await api.getRecordsFilter(
                COLLECTION_DAILY_REPORTS,
                "id",
                taskDailyReportID,
                1,
                1
            );
            const taskDailyReport = linkedRecords[0];
            if (!taskDailyReport) {
                throw new Error(`Không tìm thấy báo cáo task "${taskDailyReportID}".`);
            }

            return {
                ...taskDailyReport,
                task: getRelationID(taskDailyReport.task) || "",
                taskTitle: taskDailyReport.title || taskDailyReport.name || "",
                taskStage: taskDailyReport.stage || "",
                reportID: reportRecord.id,
                reportDate: reportRecord.report_date,
                reporter: reportRecord.reporter,
                reportTaskDailyReportIDs: taskDailyReportIDs
            };
        }));

        return { reportRecord, taskReports };
    }));

    return {
        reportRecords: reportGroups.map(group => group.reportRecord),
        taskReports: reportGroups.flatMap(group => group.taskReports)
    };
}

/**
 * "2026-11-02" → "2026-11-03"
 */
function getNextDate(workDate) {
    const [year, month, day] = workDate.split("-").map(Number);
    const next = new Date(year, month - 1, day + 1);
    return [
        next.getFullYear(),
        String(next.getMonth() + 1).padStart(2, "0"),
        String(next.getDate()).padStart(2, "0")
    ].join("-");
}

function getDateOnly(value) {
    return String(value || "").slice(0, 10);
}

export async function saveTaskReport(taskReport) {
    validateTaskReport(taskReport);

    const data = {
        title: taskReport.task.name,
        stage: taskReport.task.stage_name || "",
        work_status: taskReport.status,
        worker: JSON.stringify(getWorkerNames(taskReport.workerIDs, taskReport.users)),
        detail: taskReport.detail || ""
    };

    // Dữ liệu + ảnh gửi trong MỘT request:
    //   - Lần nộp đầu: chỉ 1 lệnh tạo (không tạo xong rồi sửa để up ảnh → không cần quyền Update,
    //     và không còn bản ghi "mồ côi" khi bước up ảnh lỗi).
    //   - Part Leader sửa báo cáo đã lưu: 1 lệnh sửa; "evidence_image+" = thêm ảnh, giữ ảnh cũ.
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));

    const isUpdate = Boolean(taskReport.recordID);
    taskReport.files.forEach(file => {
        formData.append(isUpdate ? "evidence_image+" : "evidence_image", file);
    });

    const taskDailyReport = isUpdate
        ? await api.updateRecord(COLLECTION_DAILY_REPORTS, taskReport.recordID, formData)
        : await api.createRecord(COLLECTION_DAILY_REPORTS, formData);

    taskReport.recordID = taskDailyReport.id;

    taskReport.report = taskDailyReport;
    taskReport.files = [];

    const taskProgress = getProgressForStatus(taskReport.status);
    if (Number(taskReport.task.progress || 0) !== taskProgress) {
        taskReport.task = await api.updateRecord(
            COLLECTION_TASKS,
            taskReport.task.id,
            { progress: taskProgress }
        );
    }

    return taskDailyReport;
}

/**
 * Tạo (lần nộp đầu) hoặc cập nhật (Part Leader sửa) bản ghi Reports của dự án + ngày.
 * Không xóa bản ghi Reports nào khác: chúng có thể là báo cáo của dự án khác cùng ngày.
 */
export async function saveDailyReport({
    reportRecordID,
    taskDailyReportIDs,
    workDate,
    reporter
}) {
    const reportData = {
        task_daily_reports: [...new Set(taskDailyReportIDs.map(String))],
        report_date: workDate,
        reporter
    };
    return reportRecordID
        ? api.updateRecord(COLLECTION_REPORTS, reportRecordID, reportData)
        : api.createRecord(COLLECTION_REPORTS, reportData);
}

/**
 * Các cột bắt buộc còn thiếu của một task trong báo cáo.
 * @returns {{ worker: boolean, detail: boolean }} true = đang thiếu
 */
export function getMissingRequiredFields(taskReport) {
    return {
        worker: !(taskReport.workerIDs || []).length,
        detail: !String(taskReport.detail || "").trim()
    };
}

export function validateTaskReport(taskReport) {
    const taskName = taskReport.task.name || taskReport.task.title || "task này";
    if (!["Not started", "Processing", "Done"].includes(taskReport.status)) {
        throw new Error(`Vui lòng chọn trạng thái hợp lệ cho "${taskName}".`);
    }

    // Người làm và Chi tiết là bắt buộc
    const missing = getMissingRequiredFields(taskReport);
    if (missing.worker || missing.detail) {
        const fields = [missing.worker && "Người làm", missing.detail && "Chi tiết"].filter(Boolean);
        throw new Error(`Vui lòng nhập ${fields.join(" và ")} cho "${taskName}".`);
    }

    const files = taskReport.files || [];
    const oversizedFile = files.find(
        file => file.size > MAX_EVIDENCE_SIZE
    );
    if (oversizedFile) {
        throw new Error(`${oversizedFile.name} vượt quá giới hạn 5 MiB.`);
    }

    const nonImage = files.find(
        file => !file.type.startsWith("image/")
    );
    if (nonImage) {
        throw new Error(`${nonImage.name} không phải là file ảnh.`);
    }

    const hasEvidence = getEvidenceFiles(taskReport.report).length > 0 ||
        files.length > 0;
    if (!hasEvidence) {
        throw new Error(
            `Hãy tải lên ít nhất một ảnh minh chứng cho "${taskName}".`
        );
    }
}

export function getEvidenceFiles(report) {
    if (Array.isArray(report?.evidence_image)) {
        return report.evidence_image;
    }
    return report?.evidence_image ? [report.evidence_image] : [];
}

export function getEvidenceUrl(recordID, fileName) {
    return `${URL_LOCAL}/api/files/${COLLECTION_DAILY_REPORTS}/${recordID}/${encodeURIComponent(fileName)}`;
}

export function getTaskReportStatus(task) {
    const progress = Number(task.progress) || 0;
    if (progress >= 1) {
        return "Done";
    }
    return progress > 0 ? "Processing" : "Not started";
}

export function normalizeWorkStatus(status) {
    if (status === "Pending") {
        return "Not started";
    }
    if (status === "In progress") {
        return "Processing";
    }
    return status;
}

export function getProgressForStatus(status) {
    switch (status) {
        case "Done":
            return 1;
        case "Processing":
            return 0.5;
        default:
            return 0;
    }
}

function getRelationID(value) {
    return typeof value === "object" && value !== null
        ? value.id
        : value;
}

export function getRelationIDs(value) {
    const relations = Array.isArray(value) ? value : value ? [value] : [];
    return relations
        .map(getRelationID)
        .filter(Boolean)
        .map(String);
}

async function getAllRecordsByFilter(collection, filter) {
    const records = [];
    let page = 1;

    while (true) {
        const result = await api.getRecordsByFilter(collection, filter, page, PAGE_SIZE);
        records.push(...result);
        if (result.length < PAGE_SIZE) {
            return records;
        }
        page += 1;
    }
}

export async function getAllFilteredRecords(collection, field, value) {
    const records = [];
    let page = 1;

    while (true) {
        const result = await api.getRecordsFilter(
            collection,
            field,
            value,
            page,
            PAGE_SIZE
        );
        records.push(...result);
        if (result.length < PAGE_SIZE) {
            return records;
        }
        page += 1;
    }
}
