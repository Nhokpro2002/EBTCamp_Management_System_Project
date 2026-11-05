import * as api from "../services/generic.api.js";
import { URL_LOCAL } from "../config.js";
import { getUsersForIssueType } from "../services/issue-roles.js";

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
const COLLECTION_USERS = "Users";

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
        throw new Error(`Không tìm thấy dự án: ${projectID}`);
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

/**
 * Toàn bộ issue của project (tất cả các trang, không chỉ 30 bản ghi đầu).
 */
export async function loadIssueData(projectID) {
    const PAGE_SIZE = 200;
    const filter = `project = ${api.quoteFilterValue(projectID)}`;
    const issues = [];

    for (let page = 1; ; page++) {
        const items = await api.getRecordsByFilter(COLLECTION_ISSUES, filter, page, PAGE_SIZE);
        issues.push(...items);
        if (items.length < PAGE_SIZE) break;
    }

    issueData.issue = issues;
}

/**
 * Toàn bộ user — để chọn người xử lý issue theo position.
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

    issueData.users = users;
}

// =====================================================
// NGƯỜI XỬ LÝ + THỜI HẠN CỦA ISSUE
// Chọn 1 lần duy nhất: đã có cả handler và deadline thì không đổi được nữa.
// =====================================================

export function getUserName(user) {
    return user?.employee_name || user?.name || user?.email || "";
}

/**
 * Người có position phù hợp với type của issue (quy tắc ở services/issue-roles.js).
 */
export function getHandlerCandidates(issue) {
    return getUsersForIssueType(issueData.users, issue?.type)
        .sort((a, b) => getUserName(a).localeCompare(getUserName(b), "vi"));
}

/**
 * Tên người xử lý để hiển thị (field handler lưu id user; dữ liệu cũ có thể lưu tên).
 */
export function getHandlerName(issue) {
    const handler = Array.isArray(issue?.handler) ? issue.handler[0] : issue?.handler;
    if (!handler) return "";
    const user = issueData.users.find(item => item.id === handler);
    return user ? getUserName(user) : String(handler);
}

export function isIssueAssigned(issue) {
    return Boolean(issue?.handler && (Array.isArray(issue.handler) ? issue.handler.length : true)) &&
        Boolean(String(issue?.deadline ?? "").trim());
}

/**
 * Giao người xử lý + thời hạn cho issue (chỉ một lần).
 * Đọc lại bản ghi mới nhất trước khi ghi: nếu người khác vừa giao thì không ghi đè.
 */
export async function assignIssueHandler(issueID, handlerID, deadline) {
    const [latest] = await api.getRecordsByFilter(
        COLLECTION_ISSUES,
        `id = ${api.quoteFilterValue(issueID)}`,
        1,
        1
    );
    if (!latest) {
        throw new Error("Không tìm thấy issue.");
    }

    const issue = findIssue(issueID);
    if (isIssueAssigned(latest)) {
        if (issue) Object.assign(issue, latest);
        throw new Error("Issue này đã được giao người xử lý và thời hạn, không thể thay đổi.");
    }

    const candidate = getHandlerCandidates(latest).find(user => user.id === handlerID);
    if (!candidate) {
        throw new Error("Người xử lý không phù hợp với loại vấn đề của issue.");
    }

    const updated = await api.updateRecord(COLLECTION_ISSUES, issueID, {
        handler: handlerID,
        deadline
    });
    if (issue) Object.assign(issue, updated);
    return updated;
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

// =====================================================
// TASK TRỄ HẠN = MỘT LOẠI ISSUE
// Tính ra từ task (chưa xong mà đã quá ngày kết thúc), KHÔNG lưu vào database:
// task hoàn thành hoặc được dời hạn → tự biến mất khỏi danh sách issue.
// Cùng cách tính số ngày trễ với chữ "Trễ x ngày" trên Gantt.
// =====================================================
export const OVERDUE_ISSUE_TYPE = "Trễ hạn";

function parseDay(value) {
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function toIsoDay(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

/**
 * @returns {Array<Object>} issue ảo cho từng task đang trễ hạn
 */
export function getOverdueTaskIssues() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    return workflowData.tasks.flatMap(task => {
        if ((Number(task.progress) || 0) >= 1) return [];

        const start = parseDay(task.start_date);
        if (!start) return [];

        // Ngày kết thúc theo Gantt = start + duration (mốc 00:00 ngày kế tiếp)
        const end = new Date(start);
        end.setDate(end.getDate() + (Number(task.duration) || 0));
        if (end >= tomorrow) return [];

        const delayDays = Math.round((tomorrow - end) / 86400000);
        const lastDay = new Date(end);
        lastDay.setDate(lastDay.getDate() - 1);
        const stage = workflowData.stages.find(item => String(item.id) === String(task.stage));

        return [{
            id: `overdue-${task.id}`,
            isOverdueTask: true,
            taskID: task.id,
            delayDays,
            title: task.name,
            type: OVERDUE_ISSUE_TYPE,
            related_stage: stage?.name || task.css || "",
            related_task: task.name,
            solution: "",
            reporter: "Hệ thống",
            // Thời hạn = ngày kết thúc kế hoạch; ngày tạo = ngày bắt đầu bị trễ
            deadline: toIsoDay(lastDay),
            created_date: toIsoDay(end)
        }];
    });
}

/**
 * Issue trong database + task trễ hạn.
 */
export function getAllIssues() {
    return [...issueData.issue, ...getOverdueTaskIssues()];
}

/**
 * Đếm số issue theo stage (so khớp related_stage, không phân biệt hoa thường).
 * Gồm cả task trễ hạn.
 * @returns {Object<string, number>} key là tên stage viết thường
 */
export function countIssuesByStage() {
    return getAllIssues().reduce((counts, issue) => {
        const key = normalizeText(issue.related_stage);
        if (key) {
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    }, {});
}

/**
 * Số issue theo stage: tổng và số chưa xử lý (chưa có solution).
 * Task trễ hạn luôn tính là chưa xử lý.
 * @returns {Object<string, { total: number, open: number }>} key = tên stage viết thường
 */
export function getIssueSummaryByStage() {
    return getAllIssues().reduce((summary, issue) => {
        const key = normalizeText(issue.related_stage);
        if (!key) return summary;

        summary[key] ??= { total: 0, open: 0 };
        summary[key].total++;
        if (!String(issue.solution ?? "").trim()) {
            summary[key].open++;
        }
        return summary;
    }, {});
}

export function filterIssues({ keyword, stage }) {
    return getAllIssues().filter(issue => {
        const matchesStage =
            stage === "all" ||
            normalizeText(issue.related_stage) === normalizeText(stage);

        const haystack = [
            issue.id,
            issue.title,
            issue.related_stage,
            issue.type,
            issue.solution,
            issue.reporter,
            getHandlerName(issue),
            issue.created_date
        ].join(" ").toLowerCase();

        return matchesStage &&
            (!keyword || haystack.includes(keyword));
    });
}
