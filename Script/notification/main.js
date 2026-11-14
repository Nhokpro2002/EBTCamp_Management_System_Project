// =====================================================
// TRANG THÔNG BÁO (notification.html)
// Thông báo của user đang đăng nhập (collection Notifications):
//   - Tab: Tất cả / Chưa đọc / Issue / Duyệt task (kèm số chưa đọc)
//   - Lọc theo dự án + tìm kiếm, phân trang
//   - Bấm thông báo → đánh dấu đã đọc + mở trang liên quan (link)
//   - Realtime: thông báo mới hiện ngay
// =====================================================
import * as service from "./service.js";
import * as ui from "./ui.js";

import { URL_LOCAL } from "../config.js";
import { COLLECTION_NOTIFICATIONS } from "../services/notification.api.js";

const state = {
    notifications: [],
    tab: "all",          // all | unread | issue | task
    project: "",
    query: "",
    page: 1,
    pageSize: Number(document.getElementById("page-size").value) || 10
};

// =====================================================
// LỌC + VẼ
// =====================================================

function matchesTab(notification, tab) {
    switch (tab) {
        case "unread":
            return !notification.is_read;
        case "issue":
            return notification.category === service.NOTIFICATION_CATEGORY.ISSUE;
        case "task":
            return notification.category === service.NOTIFICATION_CATEGORY.TASK;
        default:
            return true;
    }
}

function getFiltered() {
    const query = state.query;
    return state.notifications.filter(notification =>
        matchesTab(notification, state.tab) &&
        (!state.project || notification.project === state.project) &&
        (!query || [
            notification.title,
            notification.message,
            notification.expand?.actor?.employee_name,
            notification.expand?.project?.name
        ].some(value => String(value ?? "").toLocaleLowerCase().includes(query)))
    );
}

function render() {
    // Số trên tab = số CHƯA ĐỌC của từng loại
    const unread = state.notifications.filter(notification => !notification.is_read);
    ui.renderTabCounts({
        all: unread.length,
        unread: unread.length,
        issue: unread.filter(notification => matchesTab(notification, "issue")).length,
        task: unread.filter(notification => matchesTab(notification, "task")).length
    });
    ui.setMarkAllEnabled(unread.length > 0);

    const list = getFiltered();
    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const start = (state.page - 1) * state.pageSize;
    const pageItems = list.slice(start, start + state.pageSize);

    if (!state.notifications.length) {
        ui.renderState("Bạn chưa có thông báo nào.");
    } else if (!pageItems.length) {
        ui.renderState("Không có thông báo nào khớp bộ lọc.");
    } else {
        ui.renderNotifications(pageItems);
    }

    ui.renderPagination({
        first: list.length ? start + 1 : 0,
        last: Math.min(start + state.pageSize, list.length),
        total: list.length,
        page: state.page,
        totalPages
    });
}

// =====================================================
// ĐÃ ĐỌC
// =====================================================

async function markRead(id) {
    const notification = state.notifications.find(item => item.id === id);
    if (!notification || notification.is_read) return;

    notification.is_read = true;
    render();
    try {
        await service.markAsRead(id);
    } catch (error) {
        console.error("Không đánh dấu được đã đọc.", error);
        notification.is_read = false;
        render();
    }
}

async function openNotification(id) {
    const notification = state.notifications.find(item => item.id === id);
    if (!notification) return;

    await markRead(id);
    if (notification.link) {
        window.location.href = notification.link;
    }
}

async function markAllRead() {
    const ids = state.notifications.filter(item => !item.is_read).map(item => item.id);
    if (!ids.length) return;

    document.getElementById("mark-all-read").disabled = true;
    const done = new Set(await service.markAllAsRead(ids));
    state.notifications.forEach(item => {
        if (done.has(item.id)) item.is_read = true;
    });
    render();
}

// =====================================================
// SỰ KIỆN
// =====================================================

function bindEvents() {
    const panel = document.getElementById("activity-list");
    const searchInput = document.getElementById("search-notifications");

    document.querySelectorAll(".notification-tab").forEach(button => {
        button.addEventListener("click", () => {
            state.tab = button.dataset.tab;
            state.page = 1;
            ui.setActiveTab(state.tab);
            render();
        });
    });

    document.getElementById("projectSelect").addEventListener("change", event => {
        state.project = event.target.value;
        state.page = 1;
        render();
    });

    searchInput.addEventListener("input", () => {
        state.query = searchInput.value.trim().toLocaleLowerCase();
        state.page = 1;
        render();
    });

    document.getElementById("page-size").addEventListener("change", event => {
        state.pageSize = Number(event.target.value) || 10;
        state.page = 1;
        render();
    });
    document.getElementById("previous-page").addEventListener("click", () => {
        state.page--;
        render();
    });
    document.getElementById("next-page").addEventListener("click", () => {
        state.page++;
        render();
    });

    document.getElementById("mark-all-read").addEventListener("click", markAllRead);

    panel.addEventListener("click", event => {
        if (event.target.closest("[data-retry-activity]")) {
            loadAll();
            return;
        }

        const readButton = event.target.closest("[data-mark-read]");
        if (readButton) {
            event.stopPropagation();
            markRead(readButton.dataset.markRead);
            return;
        }

        const item = event.target.closest(".notification-item");
        if (item) openNotification(item.dataset.id);
    });

    panel.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const item = event.target.closest(".notification-item");
        if (!item || event.target !== item) return;
        event.preventDefault();
        openNotification(item.dataset.id);
    });

    // "/" để tìm, Esc để xóa tìm kiếm
    document.addEventListener("keydown", event => {
        const target = event.target;
        const isTyping = target instanceof HTMLElement &&
            (target.matches("input, textarea, select") || target.isContentEditable);
        if (event.key === "/" && !isTyping) {
            event.preventDefault();
            searchInput.focus();
        } else if (event.key === "Escape" && target === searchInput) {
            searchInput.value = "";
            state.query = "";
            render();
            searchInput.blur();
        }
    });
}

// =====================================================
// TẢI DỮ LIỆU + REALTIME
// =====================================================

async function loadAll() {
    ui.renderLoading();
    try {
        state.notifications = await service.loadNotifications();
        render();
    } catch (error) {
        console.error("Failed to load notifications:", error);
        ui.renderState("Không tải được thông báo. Vui lòng thử lại.", true);
    }
}

async function loadProjects() {
    try {
        ui.renderProjectOptions(await service.loadProjects(), state.project);
    } catch (error) {
        console.error("Failed to load projects:", error);
    }
}

function subscribeRealtime() {
    if (!window.PocketBase) return;

    const pb = new PocketBase(URL_LOCAL);
    // Mặc định SDK lưu token vào localStorage ("pocketbase_auth") → còn sau khi đóng trình duyệt.
    // Thay bằng BaseAuthStore (chỉ giữ trong bộ nhớ); bản UMD không export class này nên lấy qua prototype.
    const MemoryAuthStore = Object.getPrototypeOf(Object.getPrototypeOf(pb.authStore)).constructor;
    pb.authStore = new MemoryAuthStore();
    const token = sessionStorage.getItem("token");
    if (token) pb.authStore.save(token);

    const userID = service.getCurrentUserID();

    // PocketBase chỉ đẩy bản ghi user được phép xem (recipient = mình); kiểm tra lại cho chắc
    pb.collection(COLLECTION_NOTIFICATIONS).subscribe("*", async event => {
        if (event.record.recipient !== userID) return;

        if (event.action === "create") {
            // Lấy lại kèm expand (actor, project) để hiện đủ thông tin
            try {
                const full = await pb.collection(COLLECTION_NOTIFICATIONS).getOne(event.record.id, { expand: "actor,project" });
                state.notifications.unshift(full);
            } catch {
                state.notifications.unshift(event.record);
            }
        } else if (event.action === "update") {
            const existing = state.notifications.find(item => item.id === event.record.id);
            if (existing) existing.is_read = event.record.is_read;
        } else if (event.action === "delete") {
            state.notifications = state.notifications.filter(item => item.id !== event.record.id);
        }
        render();
    }).catch(error => console.warn("Không đăng ký được thông báo realtime.", error));
}

bindEvents();
loadProjects();
await loadAll();
subscribeRealtime();
