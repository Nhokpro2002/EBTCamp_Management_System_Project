import { URL_LOCAL } from "../config.js";
import * as api from "../services/generic.api.js";
import { getCurrentUserRoles, getIssueTypesForRoles, isIssueForRoles } from "./service.js";

// =====================================================
// SỐ THÔNG BÁO TRÊN SIDEBAR (ô đỏ cạnh "Thông báo")
//
// Được auth.js nạp ở mọi trang có sidebar.
// Đếm issue mới (kể từ lần cuối mở trang Thông báo) có type khớp với position
// của user đang đăng nhập; có issue mới (realtime) khớp → +1.
// Mở trang Thông báo = đã xem hết → về 0.
// =====================================================

const COLLECTION_ISSUES = "Issues";
const REALTIME_TOPIC = `${COLLECTION_ISSUES}/*`;
const PAGE_SIZE = 200;
// Dự phòng khi mất kết nối realtime: đếm lại định kỳ
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

const user = readUser();
const roles = getCurrentUserRoles();
const isNotificationPage = location.pathname.split("/").pop() === "notification.html";
const lastSeenKey = `notification_last_seen_${user?.id ?? "guest"}`;

let unreadCount = 0;

init();

function init() {
    if (!user?.id || !getBadge()) return;

    // Lần đầu dùng tính năng → bắt đầu đếm từ bây giờ (không dồn issue cũ)
    if (!localStorage.getItem(lastSeenKey) || isNotificationPage) {
        markAllSeen();
    }

    refreshCount();
    connectRealtime();

    setInterval(refreshCount, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) refreshCount();
    });
    // Mở trang Thông báo ở tab khác → tab này cũng về 0
    window.addEventListener("storage", event => {
        if (event.key === lastSeenKey) refreshCount();
    });
}

// =====================================================
// BADGE
// =====================================================
function getBadge() {
    return document.getElementById("badge-count");
}

function renderBadge() {
    const badge = getBadge();
    if (!badge) return;

    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.classList.toggle("d-none", unreadCount === 0);
    badge.setAttribute("aria-label", `${unreadCount} thông báo mới`);
}

function markAllSeen() {
    localStorage.setItem(lastSeenKey, new Date().toISOString());
    unreadCount = 0;
    renderBadge();
}

// =====================================================
// ĐẾM ISSUE MỚI
// =====================================================
function readUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }
}

function getIssueDate(issue) {
    return new Date(issue.created_date || issue.createdDate || issue.created || 0);
}

function getLastSeen() {
    return new Date(localStorage.getItem(lastSeenKey) || Date.now());
}

/**
 * Đếm lại từ database: issue có type ứng với position của user, tạo sau lần xem cuối.
 */
async function refreshCount() {
    if (isNotificationPage) {
        markAllSeen();
        return;
    }

    const types = getIssueTypesForRoles(roles);
    if (!types.length) {
        unreadCount = 0;
        renderBadge();
        return;
    }

    try {
        const filter = types
            .map(type => `type = ${api.quoteFilterValue(type)}`)
            .join(" || ");
        const issues = await getAllIssues(filter);
        const lastSeen = getLastSeen();

        unreadCount = issues.filter(issue =>
            isIssueForRoles(issue, roles) && getIssueDate(issue) > lastSeen
        ).length;
        renderBadge();
    } catch (error) {
        console.warn("Không đếm được thông báo mới.", error);
    }
}

async function getAllIssues(filter) {
    const items = [];
    let page = 1;
    let totalPages = 1;

    do {
        const url = `${URL_LOCAL}/api/collections/${COLLECTION_ISSUES}/records` +
            `?page=${page}&perPage=${PAGE_SIZE}&filter=${encodeURIComponent(filter)}`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) throw new Error(`Load issues failed (${res.status})`);

        const data = await res.json();
        items.push(...data.items);
        totalPages = data.totalPages || 1;
        page++;
    } while (page <= totalPages);

    return items;
}

function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// =====================================================
// REALTIME (PocketBase SSE, không cần nạp SDK)
// =====================================================
function connectRealtime() {
    if (!window.EventSource) return;

    const source = new EventSource(`${URL_LOCAL}/api/realtime`);

    // PocketBase gửi clientId khi kết nối (kể cả khi tự kết nối lại) → đăng ký kênh Issues
    source.addEventListener("PB_CONNECT", async event => {
        try {
            const { clientId } = JSON.parse(event.data);
            await fetch(`${URL_LOCAL}/api/realtime`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ clientId, subscriptions: [REALTIME_TOPIC] })
            });
            // Có thể đã lỡ issue trong lúc mất kết nối
            refreshCount();
        } catch (error) {
            console.warn("Không đăng ký được thông báo realtime.", error);
        }
    });

    source.addEventListener(REALTIME_TOPIC, event => {
        let payload;
        try {
            payload = JSON.parse(event.data);
        } catch {
            return;
        }
        if (payload.action !== "create" || !isIssueForRoles(payload.record, roles)) return;

        if (isNotificationPage) {
            // Đang xem trang Thông báo: issue hiện thẳng trong danh sách, không cần đếm
            markAllSeen();
            return;
        }

        unreadCount++;
        renderBadge();
    });

    window.addEventListener("pagehide", () => source.close());
}
