import * as api from "../services/generic.api.js";
import { URL_LOCAL } from "../config.js";

import { workflowData, projectData, issueData } from "./state.js";


// =====================================================
// COLLECTIONS
// =====================================================

const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_PROJECTS = "Projects";
const COLLECTION_ISSUES = "Issues";
const COLLECTION_TASK_DAILY_REPORTS = "TaskDailyReports";
const COLLECTION_REPORTS = "Reports";

// Thứ tự hiển thị stage
const STAGE_ORDER = {
    design: 1,
    mechanical: 2,
    assembly: 3,
    electric: 4,
    program: 5
};

// =====================================================
// LOAD DATA
// =====================================================

export async function loadProjectData(projectID) {
    const result = await api.getRecordsFilter(
        COLLECTION_PROJECTS,
        "id",
        projectID
    );
    const project = result[0];

    if (!project) {
        throw new Error(`Project not found: ${projectID}`);
    }

    projectData.startDate = project.start_date;
    projectData.endDate = project.end_date;
    projectData.projectName = project.name;
}

/**
 * Load stage của project (đã sắp xếp) và toàn bộ task theo stage.
 */
export async function loadStageData(projectID) {
    const stages = await api.getRecordsFilter(
        COLLECTION_STAGES,
        "project",
        projectID
    );

    stages.sort((a, b) =>
        (STAGE_ORDER[a.css?.toLowerCase()] ?? 999) -
        (STAGE_ORDER[b.css?.toLowerCase()] ?? 999)
    );

    workflowData.stages = stages ?? [];
    workflowData.tasks = [];

    if (!workflowData.stages.length)
        return;

    const taskResults = await Promise.all(
        workflowData.stages.map(stage =>
            api.getRecordsFilter(
                COLLECTION_TASKS,
                "stage",
                stage.id
            )
        )
    );

    workflowData.tasks = taskResults.flat();
}

export async function loadIssueData(projectID) {
    issueData.issue = await api.getRecordsFilter(
        COLLECTION_ISSUES,
        "project",
        projectID
    );
}

// =====================================================
// TASK CRUD
// =====================================================

export function findTask(id) {
    return workflowData.tasks.find(task => task.id === id);
}

export function isValidTaskInput({ name, startDate, duration }) {
    return Boolean(name && startDate) &&
        !Number.isNaN(duration) &&
        duration > 0;
}

/**
 * Tạo task mới trong stage đang chọn.
 * @returns {Promise<Object>} Task vừa tạo.
 */
export function createTask({ name, startDate, duration, stageName }) {
    const user = JSON.parse(localStorage.getItem("user"));

    return api.createRecord(COLLECTION_TASKS, {
        name,
        start_date: startDate,
        duration,
        stage: workflowData.currentStageID,
        css: stageName?.toLowerCase(),
        progress: 0,
        createdBy: user?.employee_name ?? "",
        project_name: projectData.projectName
    });
}

/**
 * Update task rồi reload state local + mapping lại gantt.
 */
export async function updateTask(id, data, projectID) {
    const response = await api.updateRecord(
        COLLECTION_TASKS,
        id,
        data
    );

    if (!response)
        return false;

    await loadStageData(projectID);
    mappingData();

    return true;
}

export function deleteTask(id) {
    return api.deleteRecord(COLLECTION_TASKS, id);
}

// =====================================================
// MAP DATA TO GANTT
// =====================================================

/**
 * Convert data từ PocketBase sang format DHTMLX Gantt
 */
export function mappingData() {
    projectData.data = [];
    projectData.links = [];

    // ---------- Stage ----------
    workflowData.stages.forEach(stage => {
        projectData.data.push({
            id: stage.id,
            text: stage.name,
            start_date: stage.start_date,
            duration: stage.duration ?? 0,
            progress: stage.progress ?? 0,
            open: true,
            type: gantt.config.types.project,
            css: stage.css
        });
    });

    // ---------- Tasks ----------
    workflowData.tasks.forEach(task => {
        projectData.data.push(toGanttTask(task));
    });

    // ---------- Links (task nối tiếp nhau trong cùng stage) ----------
    workflowData.taskGroups = {};

    workflowData.tasks.forEach(task => {
        if (!workflowData.taskGroups[task.stage]) {
            workflowData.taskGroups[task.stage] = [];
        }
        workflowData.taskGroups[task.stage].push(task);
    });

    let linkId = 1;

    Object.values(workflowData.taskGroups).forEach(tasks => {
        tasks.sort(
            (a, b) => new Date(a.start_date) - new Date(b.start_date)
        );

        for (let i = 0; i < tasks.length - 1; i++) {
            projectData.links.push({
                id: linkId++,
                source: tasks[i].id,
                target: tasks[i + 1].id,
                type: "0"
            });
        }
    });
}

export function toGanttTask(task) {
    return {
        id: task.id,
        parent: task.stage,
        text: task.name,
        start_date: task.start_date,
        duration: task.duration ?? 0,
        progress: task.progress ?? 0,
        css: task.css
    };
}

/**
 * Thêm task vừa tạo vào state + dữ liệu gantt,
 * nối link từ task cuối cùng trong cùng stage.
 */
export function addTaskToState(task) {
    workflowData.tasks.push(task);
    projectData.data.push(toGanttTask(task));

    if (!workflowData.taskGroups[task.stage]) {
        workflowData.taskGroups[task.stage] = [];
    }

    const stageTasks = workflowData.taskGroups[task.stage];

    // lấy task cuối cùng trong stage (trước khi push)
    const lastTaskInStage = stageTasks.length
        ? stageTasks[stageTasks.length - 1]
        : null;

    stageTasks.push(task);

    if (lastTaskInStage) {
        projectData.links.push({
            id: projectData.links.length
                ? Math.max(...projectData.links.map(l => l.id)) + 1
                : 1,
            source: lastTaskInStage.id,
            target: task.id,
            type: "0"
        });
    }
}

// =====================================================
// DATE HELPER
// =====================================================

/**
 * Lấy ngày bắt đầu nhỏ nhất cho task mới
 * (ngày sau task kết thúc muộn nhất trong stage)
 */
export function getMinStartDate(stageID) {
    const stageTasks = workflowData.tasks.filter(
        task => task.stage == stageID
    );

    if (!stageTasks.length)
        return "";

    let latestEndDate = null;

    stageTasks.forEach(task => {
        const endDate = new Date(task.start_date);
        endDate.setDate(endDate.getDate() + task.duration - 1);

        if (!latestEndDate || endDate > latestEndDate) {
            latestEndDate = endDate;
        }
    });

    latestEndDate.setDate(latestEndDate.getDate() + 1);

    const yyyy = latestEndDate.getFullYear();
    const mm = String(latestEndDate.getMonth() + 1).padStart(2, "0");
    const dd = String(latestEndDate.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
}

// =====================================================
// STATISTICS
// =====================================================

function getProjectTasks() {
    return projectData.data.filter(task => task.parent);
}

export function getTotalTaskCount() {
    return getProjectTasks().length;
}

/**
 * Tổng tiến độ project (%) = trung bình tiến độ của các stage.
 * Stage chưa có task tính là 0%.
 * @param {Array<{progress: number}>} stageProgressList - kết quả getStageProgressList()
 */
export function getOverallProgress(stageProgressList = getStageProgressList()) {
    if (!stageProgressList.length) {
        return 0;
    }

    const totalProgress = stageProgressList.reduce(
        (sum, stage) => sum + stage.progress,
        0
    );

    return totalProgress / stageProgressList.length;
}

/**
 * Tiến độ (%) của từng stage
 * @returns {Array<{name: string, key: string, progress: number}>}
 */
export function getStageProgressList() {
    return workflowData.stages.map(stage => {
        const key = String(stage.css || stage.name || "").trim().toLowerCase();

        const stageTasks = workflowData.tasks.filter(task =>
            (stage.id != null && String(task.stage) === String(stage.id)) ||
            (key && String(task.css || "").trim().toLowerCase() === key)
        );

        const progress = stageTasks.length
            ? stageTasks.reduce((sum, task) => {
                const value = Number(task.progress) || 0;
                return sum + Math.max(0, Math.min(1, value));
            }, 0) / stageTasks.length * 100
            : 0;

        return {
            name: stage.name || key,
            key,
            progress
        };
    });
}

// =====================================================
// TASK REPORT HISTORY (from Daily Report)
// =====================================================

export function isTaskDone(task) {
    return Number(task?.progress || 0) >= 1;
}

/**
 * Các lần task được báo cáo ở trang Daily Report, cũ → mới.
 * TaskDailyReports khớp task theo relation `task` (nếu có), hoặc theo title + stage.
 * Ngày báo cáo và người báo cáo lấy từ bản ghi Reports chứa nó.
 *
 * @returns {Promise<Array<{id, date, reporter, status, workers, detail, evidenceUrls}>>}
 */
export async function loadTaskReportHistory(taskID) {
    const task = findTask(taskID);
    if (!task) return [];

    const stageName = workflowData.stages.find(
        stage => stage.id === task.stage
    )?.name ?? "";

    const dailyReports = (await api.getRecordsByFilter(
        COLLECTION_TASK_DAILY_REPORTS,
        `title = ${api.quoteFilterValue(task.name)}`
    )).filter(report => report.task
        ? String(report.task) === String(task.id)
        : normalizeText(report.stage) === normalizeText(stageName)
    );

    if (!dailyReports.length) return [];

    const reports = await api.getRecordsByFilter(
        COLLECTION_REPORTS,
        dailyReports
            .map(report => `task_daily_reports ~ ${api.quoteFilterValue(report.id)}`)
            .join(" || ")
    );

    return dailyReports
        .map(dailyReport => {
            const report = reports.find(item =>
                toArray(item.task_daily_reports).map(String).includes(dailyReport.id)
            );

            return {
                id: dailyReport.id,
                date: String(report?.report_date || dailyReport.created || "").slice(0, 10),
                reporter: report?.reporter || "",
                status: normalizeWorkStatus(dailyReport.work_status),
                workers: parseWorkers(dailyReport.worker),
                detail: dailyReport.detail || "",
                evidenceUrls: toArray(dailyReport.evidence_image).map(fileName =>
                    `${URL_LOCAL}/api/files/${COLLECTION_TASK_DAILY_REPORTS}/${dailyReport.id}/${encodeURIComponent(fileName)}`
                )
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Ảnh evidence cho lần báo cáo cuối; nếu lần cuối không có ảnh
 * thì lấy ở lần gần nhất có ảnh.
 */
export function getLatestEvidenceUrls(history) {
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].evidenceUrls.length) {
            return history[i].evidenceUrls;
        }
    }
    return [];
}

function normalizeWorkStatus(status) {
    if (status === "Pending") return "Not started";
    if (status === "In progress") return "Processing";
    return status || "";
}

function parseWorkers(value) {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
        return value ? [value] : [];
    }
}

function toArray(value) {
    return Array.isArray(value) ? value : value ? [value] : [];
}

function normalizeText(value) {
    return String(value || "").trim().toLocaleLowerCase();
}

// =====================================================
// ISSUES
// =====================================================

export function findIssue(id) {
    return issueData.issue.find(issue => String(issue.id) === String(id));
}

/**
 * Lưu solution của issue và cập nhật lại state.
 * @returns {Promise<Object>} Issue sau khi update.
 */
export async function updateIssueSolution(id, solution) {
    const updated = await api.updateRecord(COLLECTION_ISSUES, id, { solution });

    const issue = findIssue(id);
    if (issue) {
        Object.assign(issue, updated);
    }
    return updated;
}

/**
 * Xóa nhiều issue; issue nào xóa được thì bỏ khỏi state.
 * @returns {Promise<{deletedIDs: string[], failedIDs: string[]}>}
 */
export async function deleteIssues(ids) {
    const results = await Promise.allSettled(
        ids.map(id => api.deleteRecord(COLLECTION_ISSUES, id))
    );

    const deletedIDs = ids.filter((_, index) => results[index].status === "fulfilled");
    const failedIDs = ids.filter((_, index) => results[index].status === "rejected");

    results
        .filter(result => result.status === "rejected")
        .forEach(result => console.error(result.reason));

    const deleted = new Set(deletedIDs.map(String));
    issueData.issue = issueData.issue.filter(issue => !deleted.has(String(issue.id)));

    return { deletedIDs, failedIDs };
}

/**
 * Đếm số issue theo stage (so khớp related_stage, không phân biệt hoa thường).
 * @returns {Object<string, number>} key là tên stage viết thường
 */
export function countIssuesByStage() {
    return issueData.issue.reduce((counts, issue) => {
        const key = normalizeText(issue.related_stage);
        if (key) {
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    }, {});
}

export function filterIssues({ keyword, stage }) {
    return issueData.issue.filter(issue => {
        const matchesStage =
            stage === "all" ||
            normalizeText(issue.related_stage) === normalizeText(stage);

        const haystack = [
            issue.id,
            issue.title,
            issue.related_stage,
            issue.solution,
            issue.reporter,
            issue.created_date
        ].join(" ").toLowerCase();

        return matchesStage &&
            (!keyword || haystack.includes(keyword));
    });
}
