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

export async function loadUsers() {
    return api.getRecords(COLLECTION_USERS);
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
    const tasks = taskPages.flat();

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

export async function loadReportsForDate(workDate, reporter) {
    const reportRecords = await getAllFilteredRecords(
        COLLECTION_REPORTS,
        "reporter",
        reporter
    );
    const matchingReports = reportRecords.filter(report =>
        report.reporter === reporter &&
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
                throw new Error(`Task daily report "${taskDailyReportID}" was not found.`);
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

    let taskDailyReport = taskReport.recordID
        ? await api.updateRecord(COLLECTION_DAILY_REPORTS, taskReport.recordID, data)
        : await api.createRecord(COLLECTION_DAILY_REPORTS, data);

    taskReport.recordID = taskDailyReport.id;

    // Ảnh đã lưu vẫn nằm trên bản ghi; chỉ upload thêm các ảnh mới chọn.
    let hasEvidence = getEvidenceFiles(taskDailyReport).length > 0;
    for (const file of taskReport.files) {
        const formData = new FormData();
        formData.append(hasEvidence ? "evidence_image+" : "evidence_image", file);
        taskDailyReport = await api.updateRecord(
            COLLECTION_DAILY_REPORTS,
            taskDailyReport.id,
            formData
        );
        hasEvidence = true;
    }

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

export async function saveDailyReport({
    reportRecordID,
    duplicateReportRecordIDs,
    taskDailyReportIDs,
    workDate,
    reporter
}) {
    const reportData = {
        task_daily_reports: [...new Set(taskDailyReportIDs.map(String))],
        report_date: workDate,
        reporter
    };
    const reportRecord = reportRecordID
        ? await api.updateRecord(COLLECTION_REPORTS, reportRecordID, reportData)
        : await api.createRecord(COLLECTION_REPORTS, reportData);

    for (const duplicateID of duplicateReportRecordIDs) {
        if (String(duplicateID) !== String(reportRecord.id)) {
            await api.deleteRecord(COLLECTION_REPORTS, duplicateID);
        }
    }

    return reportRecord;
}

export function validateTaskReport(taskReport) {
    const taskName = taskReport.task.name || taskReport.task.title || "this task";
    if (!["Not started", "Processing", "Done"].includes(taskReport.status)) {
        throw new Error(`Choose a valid status for "${taskName}".`);
    }

    const files = taskReport.files || [];
    const oversizedFile = files.find(
        file => file.size > MAX_EVIDENCE_SIZE
    );
    if (oversizedFile) {
        throw new Error(`${oversizedFile.name} exceeds the 5 MiB upload limit.`);
    }

    const nonImage = files.find(
        file => !file.type.startsWith("image/")
    );
    if (nonImage) {
        throw new Error(`${nonImage.name} is not an image file.`);
    }

    if (taskReport.status === "Done") {
        const hasEvidence = getEvidenceFiles(taskReport.report).length > 0 ||
            files.length > 0;
        if (!hasEvidence) {
            throw new Error(
                `Upload at least one image as evidence before marking "${taskName}" as Done.`
            );
        }
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
