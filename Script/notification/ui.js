import { NOTIFICATION_TYPE } from "./service.js";

const panel = document.querySelector("#activity-list");

// Icon + màu theo loại thông báo
const TYPE_STYLES = {
    [NOTIFICATION_TYPE.ISSUE_CREATED]: { icon: "bi-exclamation-triangle-fill", tone: "issue", label: "Issue mới" },
    [NOTIFICATION_TYPE.ISSUE_ASSIGNED]: { icon: "bi-person-check-fill", tone: "issue", label: "Được giao issue" },
    [NOTIFICATION_TYPE.ISSUE_RESOLVED]: { icon: "bi-check-circle-fill", tone: "resolved", label: "Issue có giải pháp" },
    [NOTIFICATION_TYPE.TASK_PLAN_SUBMITTED]: { icon: "bi-hourglass-split", tone: "plan", label: "Task chờ duyệt" },
    [NOTIFICATION_TYPE.TASK_ACCEPTED]: { icon: "bi-patch-check-fill", tone: "accepted", label: "Task đã duyệt" }
};
const DEFAULT_STYLE = { icon: "bi-bell-fill", tone: "system", label: "Thông báo" };

const CATEGORY_LABELS = {
    issue: "Issue",
    task: "Task"
};

// =====================================================
// DANH SÁCH
// =====================================================

function renderNotification(notification) {
    const style = TYPE_STYLES[notification.type] || DEFAULT_STYLE;
    const created = new Date(notification.created);
    const projectName = notification.expand?.project?.name || "";
    const actorName = notification.expand?.actor?.employee_name || "";
    const unread = !notification.is_read;
    // Nhãn cạnh tiêu đề = nhóm thông báo (tiêu đề đã nói rõ sự kiện, tránh lặp chữ)
    const categoryLabel = CATEGORY_LABELS[notification.category] || "";

    return `
        <div class="activity-item notification-item ${unread ? "is-unread" : ""}"
             data-id="${escapeHtml(notification.id)}"
             data-link="${escapeHtml(notification.link || "")}"
             role="button" tabindex="0"
             aria-label="${escapeHtml(notification.title)}${unread ? " (chưa đọc)" : ""}">

            <div class="col-activity">
                <div class="activity-main">
                    <span class="activity-icon notification-icon-${style.tone}" aria-hidden="true">
                        <i class="bi ${style.icon}"></i>
                    </span>
                    <div class="activity-content">
                        <div class="activity-header">
                            ${unread ? '<span class="activity-dot-unread" title="Chưa đọc"></span>' : ""}
                            <span class="activity-title notification-title-${style.tone}">${escapeHtml(notification.title || style.label)}</span>
                            ${categoryLabel ? `<span class="notification-type-chip notification-chip-${style.tone}">${categoryLabel}</span>` : ""}
                        </div>
                        <div class="activity-desc">${escapeHtml(notification.message || "")}</div>
                        ${actorName ? `<div class="activity-fields"><span class="field-label">Người thực hiện:</span><span class="updated-by">${escapeHtml(actorName)}</span></div>` : ""}
                    </div>
                </div>
            </div>

            <div class="col-related">
                <div class="activity-relation">
                    ${projectName ? `<span class="relation-badge badge-project">${escapeHtml(projectName)}</span>` : ""}
                </div>
            </div>

            <div class="col-time">
                <div class="activity-meta">
                    <div class="activity-time">${formatTime(created)}</div>
                    <div class="activity-date">${formatDate(created)}</div>
                    ${unread ? `<button type="button" class="notification-read-button" data-mark-read="${escapeHtml(notification.id)}" title="Đánh dấu đã đọc" aria-label="Đánh dấu đã đọc"><i class="bi bi-check2"></i></button>` : ""}
                </div>
            </div>
        </div>`;
}

export function renderNotifications(list) {
    panel.innerHTML = list.map(renderNotification).join("");
}

export function renderState(message, retry = false) {
    panel.innerHTML = `
        <div class="activity-state" role="${retry ? "alert" : "status"}">
            <span>${escapeHtml(message)}</span>
            ${retry ? '<button type="button" class="activity-retry-btn" data-retry-activity>Thử lại</button>' : ""}
        </div>`;
}

export function renderLoading() {
    panel.innerHTML = '<div class="activity-state" role="status"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang tải thông báo...</div>';
}

// =====================================================
// TAB / BỘ LỌC / PHÂN TRANG
// =====================================================

export function renderTabCounts(counts) {
    Object.entries(counts).forEach(([key, value]) => {
        const element = document.querySelector(`.tab-count[data-count="${key}"]`);
        if (!element) return;
        element.textContent = value ? String(value) : "";
        element.hidden = !value;
    });
}

export function setActiveTab(tab) {
    document.querySelectorAll(".notification-tab").forEach(button => {
        const active = button.dataset.tab === tab;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
}

export function renderProjectOptions(projects, selected) {
    const select = document.getElementById("projectSelect");
    select.innerHTML = '<option value="">Tất cả dự án</option>' + projects
        .map(project => `<option value="${escapeHtml(project.id)}" ${project.id === selected ? "selected" : ""}>${escapeHtml(project.name || "Dự án chưa đặt tên")}</option>`)
        .join("");
}

export function renderPagination({ first, last, total, page, totalPages }) {
    document.getElementById("pagination-info").textContent = `${first}–${last} / ${total}`;
    document.getElementById("previous-page").disabled = page <= 1;
    document.getElementById("next-page").disabled = page >= totalPages;
}

export function setMarkAllEnabled(enabled) {
    document.getElementById("mark-all-read").disabled = !enabled;
}

// =====================================================
// HELPERS
// =====================================================

function formatTime(date) {
    return date.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

// dd/mm/yyyy
function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

export function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}
