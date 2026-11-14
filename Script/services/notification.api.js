// =====================================================
// GỬI THÔNG BÁO (collection Notifications)
//
// Mỗi người nhận = 1 bản ghi riêng → trạng thái đã đọc (is_read) tách theo từng người.
// Thông báo do trình duyệt tạo ngay sau thao tác chính (tạo issue, giao issue, duyệt task...).
// Gửi lỗi KHÔNG làm hỏng thao tác chính: lỗi chỉ ghi ra console.
//
// Field của Notifications:
//   recipient (→ Users), category, type, title, message,
//   actor (→ Users), project (→ Projects), link, is_read
// =====================================================
import * as api from "./generic.api.js";
import { getUsersForIssueType, getUserRoles } from "./issue-roles.js";

export const COLLECTION_NOTIFICATIONS = "Notifications";
const COLLECTION_USERS = "Users";

// Tab phân loại trên trang Thông báo
export const NOTIFICATION_CATEGORY = {
    ISSUE: "issue",
    TASK: "task"
};

// Sự kiện cụ thể (giá trị đúng như option của field type)
export const NOTIFICATION_TYPE = {
    ISSUE_CREATED: "issue_created",       // → người có chức vụ phụ trách loại issue
    ISSUE_ASSIGNED: "issue_assigned",     // → người được giao xử lý
    ISSUE_RESOLVED: "issue_resolved",     // → người báo issue
    TASK_PLAN_SUBMITTED: "task_plan_submitted", // → tất cả Part Leader
    TASK_ACCEPTED: "task_accepted"        // → người tạo task
};

const TASK_APPROVER_ROLE = "part leader";

// =====================================================
// HELPERS
// =====================================================

let usersPromise = null;

/**
 * Danh sách user (tải 1 lần mỗi trang).
 */
function loadUsers() {
    usersPromise ??= api.getAllRecords(COLLECTION_USERS).catch(error => {
        usersPromise = null;
        throw error;
    });
    return usersPromise;
}

function getCurrentUser() {
    try {
        return JSON.parse(sessionStorage.getItem("user"));
    } catch {
        return null;
    }
}

function getActorName(user = getCurrentUser()) {
    return user?.employee_name || user?.email || "Ai đó";
}

function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase();
}

export function getWorkflowLink(projectID) {
    return projectID ? `workflow.html?projectID=${encodeURIComponent(projectID)}` : "";
}

/**
 * Tạo thông báo cho từng người nhận (bỏ trùng, bỏ chính người thao tác).
 * @returns {Promise<number>} số thông báo tạo thành công
 */
async function send({ recipients, category, type, title, message, project = "", link = "" }) {
    const actorID = getCurrentUser()?.id || "";
    const recipientIDs = [...new Set(recipients.filter(Boolean).map(String))]
        .filter(id => id !== actorID);
    if (!recipientIDs.length) return 0;

    const results = await Promise.allSettled(recipientIDs.map(recipient =>
        api.createRecord(COLLECTION_NOTIFICATIONS, {
            recipient,
            category,
            type,
            title,
            message,
            actor: actorID,
            project: project || "",
            link,
            is_read: false
        })
    ));

    const failed = results.filter(result => result.status === "rejected");
    failed.forEach(result => console.warn("Không tạo được thông báo.", result.reason));
    return recipientIDs.length - failed.length;
}

/**
 * Bọc lại để lỗi gửi thông báo không bao giờ làm hỏng thao tác chính.
 */
async function safely(task) {
    try {
        return await task();
    } catch (error) {
        console.warn("Không gửi được thông báo.", error);
        return 0;
    }
}

// =====================================================
// ISSUE
// =====================================================

/**
 * Issue mới → người có chức vụ phụ trách loại issue (quy tắc trong issue-roles.js).
 */
export function notifyIssueCreated(issue) {
    return safely(async () => {
        const users = await loadUsers();
        return send({
            recipients: getUsersForIssueType(users, issue.type).map(user => user.id),
            category: NOTIFICATION_CATEGORY.ISSUE,
            type: NOTIFICATION_TYPE.ISSUE_CREATED,
            title: "Issue mới",
            message: `${getActorName()} báo issue "${issue.title || "-"}" (${issue.type || "không rõ loại"})` +
                (issue.related_task ? ` ở task ${issue.related_task}` : "") + ".",
            project: issue.project,
            link: getWorkflowLink(issue.project)
        });
    });
}

/**
 * Issue được giao → người xử lý.
 */
export function notifyIssueAssigned(issue, handlerID) {
    return safely(() => send({
        recipients: [handlerID],
        category: NOTIFICATION_CATEGORY.ISSUE,
        type: NOTIFICATION_TYPE.ISSUE_ASSIGNED,
        title: "Bạn được giao xử lý issue",
        message: `${getActorName()} giao cho bạn issue "${issue.title || "-"}"` +
            (issue.deadline ? `, hạn ${formatDay(issue.deadline)}` : "") + ".",
        project: issue.project,
        link: getWorkflowLink(issue.project)
    }));
}

/**
 * Issue có giải pháp → người báo issue.
 * Issue chỉ lưu TÊN người báo (reporter) → tìm user theo tên.
 */
export function notifyIssueResolved(issue) {
    return safely(async () => {
        const users = await loadUsers();
        const reporterName = normalizeText(issue.reporter);
        const reporters = reporterName
            ? users.filter(user => normalizeText(user.employee_name) === reporterName)
            : [];

        return send({
            recipients: reporters.map(user => user.id),
            category: NOTIFICATION_CATEGORY.ISSUE,
            type: NOTIFICATION_TYPE.ISSUE_RESOLVED,
            title: "Issue đã có giải pháp",
            message: `${getActorName()} đã cập nhật giải pháp cho issue "${issue.title || "-"}" bạn báo.`,
            project: issue.project,
            link: getWorkflowLink(issue.project)
        });
    });
}

// =====================================================
// TASK
// =====================================================

/**
 * Task Plan mới → tất cả Part Leader duyệt.
 * @param {Object} task - bản ghi Tasks vừa tạo
 * @param {{ projectID: string, projectName: string, stageName: string }} context
 */
export function notifyTaskPlanSubmitted(task, { projectID, projectName, stageName }) {
    return safely(async () => {
        const users = await loadUsers();
        const approvers = users.filter(user => getUserRoles(user).includes(TASK_APPROVER_ROLE));

        return send({
            recipients: approvers.map(user => user.id),
            category: NOTIFICATION_CATEGORY.TASK,
            type: NOTIFICATION_TYPE.TASK_PLAN_SUBMITTED,
            title: "Task mới chờ duyệt",
            message: `${getActorName()} lên kế hoạch task "${task.name}"` +
                (stageName ? ` (${stageName})` : "") +
                (projectName ? ` trong dự án ${projectName}` : "") + ". Cần Part Leader duyệt.",
            project: projectID,
            link: getWorkflowLink(projectID)
        });
    });
}

/**
 * Task được duyệt → người tạo task (field created_by).
 */
export function notifyTaskAccepted(task, { projectID, projectName }) {
    return safely(() => send({
        recipients: [task.created_by],
        category: NOTIFICATION_CATEGORY.TASK,
        type: NOTIFICATION_TYPE.TASK_ACCEPTED,
        title: "Task đã được duyệt",
        message: `${getActorName()} đã duyệt task "${task.name}"` +
            (projectName ? ` trong dự án ${projectName}` : "") + ". Task bắt đầu hoạt động.",
        project: projectID,
        link: getWorkflowLink(projectID)
    }));
}

function formatDay(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "");
}
