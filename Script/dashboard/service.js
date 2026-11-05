import * as api from "../services/generic.api.js";

import { dashboardState as state } from "./state.js";

// =====================================================
// COLLECTIONS
// =====================================================
const COLLECTION_PROJECTS = "Projects";
const COLLECTION_STAGES = "Stages";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_ISSUES = "Issues";
const COLLECTION_MATERIALS = "Inventory_Items";

const PAGE_SIZE = 200;

// Giống trang Workflow / Daily Report
export const STAGES = [
    { key: "design", name: "Design" },
    { key: "mechanical", name: "Mechanical" },
    { key: "assembly", name: "Assembly" },
    { key: "electric", name: "Electric" },
    { key: "program", name: "Program" }
];

export const ISSUE_TYPES = ["Electric", "Mechanical", "Missing Material", "Program", "Robot"];
// Issue không có loại / loại lạ
const OTHER_TYPE = "Khác";

// Mức tồn kho giống trang Inventory
const LOW_STOCK_LIMIT = 10;
const MEDIUM_STOCK_LIMIT = 30;

// =====================================================
// LOAD
// =====================================================

/**
 * Lấy toàn bộ bản ghi của collection (tất cả các trang).
 */
async function getAllRecords(collection) {
    const firstPage = await api.loadInventoryItemEachPage(collection, 1, PAGE_SIZE);
    const remainingPages = await Promise.all(
        Array.from(
            { length: Math.max(0, firstPage.totalPages - 1) },
            (_, index) => api.loadInventoryItemEachPage(collection, index + 2, PAGE_SIZE)
        )
    );
    return [
        ...firstPage.items,
        ...remainingPages.flatMap(page => page.items)
    ];
}

export async function loadDashboardData() {
    const [projects, stages, tasks, issues, materials] = await Promise.all([
        getAllRecords(COLLECTION_PROJECTS),
        getAllRecords(COLLECTION_STAGES),
        getAllRecords(COLLECTION_TASKS),
        getAllRecords(COLLECTION_ISSUES),
        getAllRecords(COLLECTION_MATERIALS)
    ]);

    Object.assign(state, { projects, stages, tasks, issues, materials });
}

// =====================================================
// HELPERS
// =====================================================

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function clampProgress(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

/**
 * "2026-10-01 00:00:00.000Z" / "2026-10-01" → Date lúc 00:00 giờ máy.
 */
function parseDay(value) {
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

function getIssueDate(issue) {
    return new Date(issue.created_date || issue.createdDate || issue.created || 0);
}

export function isIssueSolved(issue) {
    return Boolean(String(issue.solution ?? "").trim());
}

// =====================================================
// TASKS / PROGRESS (cùng cách tính với trang Workflow)
// =====================================================

/**
 * Task quá hạn: chưa xong (progress < 1) và ngày kết thúc (start + duration) đã qua.
 */
export function isTaskOverdue(task, today = new Date()) {
    if (clampProgress(task.progress) >= 1) return false;

    const start = parseDay(task.start_date);
    const duration = Number(task.duration) || 0;
    if (!start) return false;

    const end = new Date(start);
    end.setDate(end.getDate() + duration);

    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return end < tomorrow;
}

/**
 * Tiến độ project = trung bình tiến độ các stage,
 * tiến độ stage = trung bình progress các task trong stage (stage chưa có task = 0%).
 */
function getProjectProgress(projectStages, tasksByStage) {
    if (!projectStages.length) return 0;

    const total = projectStages.reduce((sum, stage) => {
        const stageTasks = tasksByStage.get(stage.id) ?? [];
        const stageProgress = stageTasks.length
            ? stageTasks.reduce((value, task) => value + clampProgress(task.progress), 0) / stageTasks.length
            : 0;
        return sum + stageProgress;
    }, 0);

    return total / projectStages.length * 100;
}

function groupBy(list, getKey) {
    const map = new Map();
    list.forEach(item => {
        const key = getKey(item);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    });
    return map;
}

/**
 * @returns {Array<{id, name, startDate, endDate, progress, overdueTasks, openIssues, totalTasks}>}
 */
export function getProjectSummaries() {
    const stagesByProject = groupBy(state.stages, stage => stage.project);
    const tasksByStage = groupBy(state.tasks, task => task.stage);
    const today = new Date();

    return state.projects
        .map(project => {
            const projectStages = stagesByProject.get(project.id) ?? [];
            const projectTasks = projectStages.flatMap(stage => tasksByStage.get(stage.id) ?? []);
            const projectIssues = state.issues.filter(issue =>
                issue.project === project.id ||
                (!issue.project && normalize(issue.project_name) === normalize(project.name))
            );

            return {
                id: project.id,
                name: project.name || "Dự án chưa đặt tên",
                startDate: project.start_date,
                endDate: project.end_date,
                progress: getProjectProgress(projectStages, tasksByStage),
                totalTasks: projectTasks.length,
                overdueTasks: projectTasks.filter(task => isTaskOverdue(task, today)).length,
                openIssues: projectIssues.filter(issue => !isIssueSolved(issue)).length
            };
        })
        // Gần hạn nhất lên trước, project chưa có ngày kết thúc xuống cuối
        .sort((a, b) =>
            (parseDay(a.endDate)?.getTime() ?? Infinity) - (parseDay(b.endDate)?.getTime() ?? Infinity)
        );
}

// =====================================================
// KPI
// =====================================================

export function getKpis(projectSummaries = getProjectSummaries()) {
    const today = new Date();
    const stocks = state.materials.map(material => Number(material.stock) || 0);

    return {
        projects: state.projects.length,
        projectsInProgress: projectSummaries.filter(project => project.progress > 0 && project.progress < 100).length,

        overdueTasks: state.tasks.filter(task => isTaskOverdue(task, today)).length,
        totalTasks: state.tasks.length,

        openIssues: state.issues.filter(issue => !isIssueSolved(issue)).length,
        totalIssues: state.issues.length,

        lowStock: stocks.filter(stock => stock < LOW_STOCK_LIMIT).length,
        outOfStock: stocks.filter(stock => stock <= 0).length,
        totalMaterials: state.materials.length
    };
}

// =====================================================
// CHART DATA
// =====================================================

/**
 * Số issue (đang mở / đã xử lý) theo loại.
 */
export function getIssuesByType() {
    const labels = [...ISSUE_TYPES, OTHER_TYPE];
    const counts = new Map(labels.map(label => [label, { open: 0, solved: 0 }]));

    state.issues.forEach(issue => {
        const type = ISSUE_TYPES.find(item => normalize(item) === normalize(issue.type)) ?? OTHER_TYPE;
        counts.get(type)[isIssueSolved(issue) ? "solved" : "open"]++;
    });

    // Bỏ "Other" nếu không có issue nào
    const visible = labels.filter(label => label !== OTHER_TYPE || counts.get(label).open + counts.get(label).solved > 0);
    return {
        labels: visible,
        open: visible.map(label => counts.get(label).open),
        solved: visible.map(label => counts.get(label).solved)
    };
}

/**
 * Số issue đang mở theo stage.
 */
export function getOpenIssuesByStage() {
    return STAGES.map(stage => ({
        ...stage,
        count: state.issues.filter(issue =>
            !isIssueSolved(issue) && normalize(issue.related_stage) === stage.key
        ).length
    }));
}

/**
 * Số vật tư theo mức tồn kho (giống huy hiệu Stock ở trang Inventory).
 */
export function getStockLevels() {
    const levels = { inStock: 0, medium: 0, low: 0, out: 0 };

    state.materials.forEach(material => {
        const stock = Number(material.stock) || 0;
        if (stock <= 0) levels.out++;
        else if (stock < LOW_STOCK_LIMIT) levels.low++;
        else if (stock < MEDIUM_STOCK_LIMIT) levels.medium++;
        else levels.inStock++;
    });

    return levels;
}

// =====================================================
// LISTS
// =====================================================

export function getRecentIssues(limit = 6) {
    return [...state.issues]
        .sort((a, b) => getIssueDate(b) - getIssueDate(a))
        .slice(0, limit)
        .map(issue => ({
            ...issue,
            date: getIssueDate(issue),
            solved: isIssueSolved(issue)
        }));
}

export function getLowStockMaterials(limit = 6) {
    return state.materials
        .filter(material => (Number(material.stock) || 0) < LOW_STOCK_LIMIT)
        .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0))
        .slice(0, limit);
}

export { LOW_STOCK_LIMIT };
