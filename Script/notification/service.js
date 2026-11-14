// =====================================================
// TRANG THÔNG BÁO: đọc / đánh dấu đã đọc collection Notifications
// (API Rules: mỗi user chỉ thấy và sửa thông báo có recipient = chính mình)
// =====================================================
import * as api from "../services/generic.api.js";
import { COLLECTION_NOTIFICATIONS } from "../services/notification.api.js";

export { NOTIFICATION_CATEGORY, NOTIFICATION_TYPE } from "../services/notification.api.js";

const COLLECTION_PROJECTS = "Projects";

// Báo cho badge.js (ô số trên sidebar) đếm lại sau khi đánh dấu đã đọc
export const NOTIFICATIONS_CHANGED_EVENT = "ebt:notifications-changed";

export function getCurrentUserID() {
    try {
        return JSON.parse(sessionStorage.getItem("user"))?.id || "";
    } catch {
        return "";
    }
}

/**
 * Toàn bộ thông báo của user đang đăng nhập, mới nhất trước.
 */
export function loadNotifications() {
    const userID = getCurrentUserID();
    if (!userID) return Promise.resolve([]);

    return api.getAllRecords(COLLECTION_NOTIFICATIONS, {
        filter: `recipient = ${api.quoteFilterValue(userID)}`,
        expand: "actor,project",
        sort: "-created"
    });
}

export function loadProjects() {
    return api.getAllRecords(COLLECTION_PROJECTS, { sort: "name" });
}

export async function markAsRead(id) {
    const updated = await api.updateRecord(COLLECTION_NOTIFICATIONS, id, { is_read: true });
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
    return updated;
}

/**
 * @returns {Promise<string[]>} id các thông báo đánh dấu thành công
 */
export async function markAllAsRead(ids) {
    const results = await Promise.allSettled(
        ids.map(id => api.updateRecord(COLLECTION_NOTIFICATIONS, id, { is_read: true }))
    );
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
    return ids.filter((_, index) => results[index].status === "fulfilled");
}
