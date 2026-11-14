import { URL_LOCAL } from "../config.js";
import { COLLECTION_NOTIFICATIONS } from "../services/notification.api.js";
import { NOTIFICATIONS_CHANGED_EVENT } from "./service.js";

// =====================================================
// SỐ THÔNG BÁO TRÊN SIDEBAR (ô đỏ cạnh "Thông báo")
//
// Được auth.js nạp ở mọi trang có sidebar.
// = số thông báo CHƯA ĐỌC (Notifications: recipient = mình, is_read = false).
// Cập nhật khi: có thông báo mới / đánh dấu đã đọc (realtime), trang Thông báo
// đánh dấu đã đọc (sự kiện NOTIFICATIONS_CHANGED_EVENT), quay lại tab, và định kỳ.
// =====================================================

const REALTIME_TOPIC = `${COLLECTION_NOTIFICATIONS}/*`;
// Dự phòng khi mất kết nối realtime: đếm lại định kỳ
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

const user = readUser();

init();

function init() {
    if (!user?.id || !getBadge()) return;

    refreshCount();
    connectRealtime();

    setInterval(refreshCount, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) refreshCount();
    });
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshCount);
}

// =====================================================
// BADGE
// =====================================================
function getBadge() {
    return document.getElementById("badge-count");
}

function renderBadge(count) {
    const badge = getBadge();
    if (!badge) return;

    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.toggle("d-none", count === 0);
    badge.setAttribute("aria-label", `${count} thông báo chưa đọc`);
}

function readUser() {
    try {
        return JSON.parse(sessionStorage.getItem("user"));
    } catch {
        return null;
    }
}

function authHeaders() {
    const token = sessionStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Đếm thông báo chưa đọc (chỉ cần totalItems, không tải bản ghi).
 */
async function refreshCount() {
    try {
        const filter = `recipient = "${user.id}" && is_read = false`;
        const url = `${URL_LOCAL}/api/collections/${COLLECTION_NOTIFICATIONS}/records` +
            `?page=1&perPage=1&skipTotal=0&fields=id&filter=${encodeURIComponent(filter)}`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) throw new Error(`Load notifications failed (${res.status})`);

        const data = await res.json();
        renderBadge(Number(data.totalItems) || 0);
    } catch (error) {
        console.warn("Không đếm được thông báo chưa đọc.", error);
    }
}

// =====================================================
// REALTIME (PocketBase SSE, không cần nạp SDK)
// PocketBase chỉ đẩy bản ghi user được phép xem (recipient = mình).
// =====================================================
function connectRealtime() {
    if (!window.EventSource) return;

    const source = new EventSource(`${URL_LOCAL}/api/realtime`);

    // PocketBase gửi clientId khi kết nối (kể cả khi tự kết nối lại) → đăng ký kênh Notifications
    source.addEventListener("PB_CONNECT", async event => {
        try {
            const { clientId } = JSON.parse(event.data);
            await fetch(`${URL_LOCAL}/api/realtime`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ clientId, subscriptions: [REALTIME_TOPIC] })
            });
            // Có thể đã lỡ thông báo trong lúc mất kết nối
            refreshCount();
        } catch (error) {
            console.warn("Không đăng ký được thông báo realtime.", error);
        }
    });

    source.addEventListener(REALTIME_TOPIC, event => {
        try {
            const payload = JSON.parse(event.data);
            if (payload.record?.recipient !== user.id) return;
        } catch {
            return;
        }
        refreshCount();
    });

    window.addEventListener("pagehide", () => source.close());
}
