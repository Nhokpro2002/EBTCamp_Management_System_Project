// =====================================================
// AUTH: chặn truy cập khi chưa đăng nhập + menu avatar (View profile / Logout)
//
// Nạp bằng <script> thường (KHÔNG phải type="module") trong <head>, để chạy trước
// khi trang hiển thị:
//   Trang cần đăng nhập:  <script src="../Script/auth/auth.js"></script>
//   Trang login:          <script src="../Script/auth/auth.js" data-guest></script>
//     (đã đăng nhập rồi thì chuyển thẳng vào hệ thống)
//   Trang register không nạp file này (ai cũng mở được, kể cả khi đang đăng nhập).
//   login.html?logout → luôn hiện form đăng nhập (xóa phiên hiện tại), dùng cho link
//   "Đăng nhập" ở trang register.
//
// Phiên đăng nhập (token, user) lưu trong sessionStorage: đóng tab / trình duyệt là
// mất, lần sau vào lại phải đăng nhập lại.
// =====================================================
(function () {
    const LOGIN_PAGE = "login.html";
    const HOME_PAGE = "inventory.html";
    const GUEST_PAGES = ["login.html", "register.html"];
    // sessionStorage key của phiên đăng nhập
    const SESSION_KEYS = ["token", "user"];
    // Bản cũ lưu phiên trong localStorage ("pocketbase_auth" do PocketBase SDK tự lưu) → luôn xóa
    const LEGACY_LOCAL_KEYS = ["token", "user", "pocketbase_auth"];
    // Ghi vào localStorage khi đăng xuất để các tab khác cùng thoát
    const LOGOUT_SIGNAL_KEY = "ebt_logout_at";
    const SESSION_CHECK_INTERVAL_MS = 60 * 1000;

    LEGACY_LOCAL_KEYS.forEach(key => localStorage.removeItem(key));

    const isGuestPage = document.currentScript?.hasAttribute("data-guest") ?? false;
    // Số thông báo trên sidebar (module riêng, nạp sau khi trang dựng xong)
    const BADGE_MODULE_URL = new URL("../notification/badge.js", document.currentScript?.src || location.href).href;
    // Ô ngày hiển thị dd/mm/yyyy (giá trị vẫn yyyy-mm-dd cho PocketBase)
    const DATE_INPUT_MODULE_URL = new URL("../utils/date-input.js", document.currentScript?.src || location.href).href;

    // ---------- Session ----------

    /**
     * Đọc phần payload của JWT (PocketBase token) để lấy thời điểm hết hạn.
     */
    function readTokenPayload(token) {
        try {
            const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            return JSON.parse(atob(payload));
        } catch {
            return null;
        }
    }

    function isLoggedIn() {
        const token = sessionStorage.getItem("token");
        if (!token || !token.trim()) return false;

        const payload = readTokenPayload(token);
        if (!payload) return false;

        // exp tính bằng giây
        return !payload.exp || payload.exp * 1000 > Date.now();
    }

    function clearSession() {
        SESSION_KEYS.forEach(key => sessionStorage.removeItem(key));
        LEGACY_LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
    }

    function getCurrentPage() {
        const page = location.pathname.split("/").pop() || HOME_PAGE;
        return page + location.search + location.hash;
    }

    /**
     * Về trang đăng nhập, kèm trang hiện tại để đăng nhập xong quay lại.
     * Dùng replace để nút Back không quay lại trang cần đăng nhập.
     */
    function redirectToLogin(keepCurrentPage = true) {
        clearSession();
        // Ẩn nội dung trong lúc chuyển trang
        document.documentElement.style.visibility = "hidden";

        const query = keepCurrentPage
            ? `?redirect=${encodeURIComponent(getCurrentPage())}`
            : "";
        location.replace(LOGIN_PAGE + query);
    }

    /**
     * Trang cần quay lại sau khi đăng nhập (chỉ cho phép trang cùng website).
     */
    function getRedirectTarget() {
        const redirect = new URLSearchParams(location.search).get("redirect");
        if (!redirect) return HOME_PAGE;

        try {
            const url = new URL(redirect, location.href);
            const page = url.pathname.split("/").pop();
            if (url.origin !== location.origin || !page || GUEST_PAGES.includes(page)) {
                return HOME_PAGE;
            }
            return url.href;
        } catch {
            return HOME_PAGE;
        }
    }

    function logout() {
        localStorage.setItem(LOGOUT_SIGNAL_KEY, String(Date.now()));
        redirectToLogin(false);
    }

    // Cho các script khác dùng: window.EBTAuth.logout(), ...
    window.EBTAuth = { isLoggedIn, logout, getRedirectTarget };

    // ---------- Trang login / register ----------
    if (isGuestPage) {
        // Bấm "Đăng nhập" từ trang register → luôn ở lại form đăng nhập
        const params = new URLSearchParams(location.search);
        if (params.has("logout")) {
            clearSession();
            params.delete("logout");
            const query = params.toString();
            history.replaceState(null, "", location.pathname + (query ? `?${query}` : "") + location.hash);
            return;
        }
        if (isLoggedIn()) {
            location.replace(getRedirectTarget());
        }
        return;
    }

    // ---------- Trang cần đăng nhập ----------
    if (!isLoggedIn()) {
        redirectToLogin();
        return;
    }

    const ensureLoggedIn = () => {
        if (!isLoggedIn()) redirectToLogin();
    };

    // Quay lại bằng nút Back sau khi logout (trang lấy từ cache) → kiểm tra lại
    window.addEventListener("pageshow", ensureLoggedIn);
    // Logout ở tab khác → tab này cũng thoát
    window.addEventListener("storage", event => {
        if (event.key === LOGOUT_SIGNAL_KEY && event.newValue) redirectToLogin(false);
    });
    // Token hết hạn trong lúc đang mở trang
    setInterval(ensureLoggedIn, SESSION_CHECK_INTERVAL_MS);

    // ---------- Menu avatar ----------

    function setupUserMenu(link) {
        // Đổi thẻ <a href="user.html"> thành nút mở menu, giữ nguyên các phần tử con
        // (user/main.js vẫn cập nhật tên / ảnh qua class .sidebar-user)
        const button = document.createElement("button");
        button.type = "button";
        button.className = `${link.className} sidebar-user-button`;
        button.setAttribute("aria-haspopup", "menu");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Menu tài khoản");
        while (link.firstChild) button.appendChild(link.firstChild);
        button.insertAdjacentHTML(
            "beforeend",
            '<i class="bi bi-three-dots-vertical sidebar-user-caret" aria-hidden="true"></i>'
        );

        const menu = document.createElement("div");
        menu.className = "user-menu";
        menu.setAttribute("role", "menu");
        menu.hidden = true;
        menu.innerHTML = `
            <a class="user-menu-item" role="menuitem" href="user.html">
                <i class="bi bi-person" aria-hidden="true"></i> Xem hồ sơ
            </a>
            <button type="button" class="user-menu-item is-danger" role="menuitem" data-logout>
                <i class="bi bi-box-arrow-right" aria-hidden="true"></i> Đăng xuất
            </button>`;

        const wrap = document.createElement("div");
        wrap.className = "user-menu-wrap";
        link.replaceWith(wrap);
        wrap.append(menu, button);

        const items = () => [...menu.querySelectorAll(".user-menu-item")];

        const open = () => {
            menu.hidden = false;
            button.setAttribute("aria-expanded", "true");
            items()[0]?.focus();
        };
        const close = (returnFocus = false) => {
            if (menu.hidden) return;
            menu.hidden = true;
            button.setAttribute("aria-expanded", "false");
            if (returnFocus) button.focus();
        };

        button.addEventListener("click", () => (menu.hidden ? open() : close()));

        menu.addEventListener("click", event => {
            if (event.target.closest("[data-logout]")) logout();
        });

        // Đóng khi bấm ra ngoài
        document.addEventListener("click", event => {
            if (!wrap.contains(event.target)) close();
        });

        // Bàn phím: Esc đóng, mũi tên lên/xuống chuyển mục
        wrap.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                close(true);
                return;
            }
            if (menu.hidden || !["ArrowDown", "ArrowUp"].includes(event.key)) return;

            event.preventDefault();
            const list = items();
            const index = list.indexOf(document.activeElement);
            const step = event.key === "ArrowDown" ? 1 : -1;
            list[(index + step + list.length) % list.length].focus();
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("a.sidebar-user").forEach(setupUserMenu);

        import(DATE_INPUT_MODULE_URL).catch(error =>
            console.warn("Không tải được ô ngày dd/mm/yyyy.", error)
        );

        // Trang có ô số thông báo trên sidebar → đếm thông báo mới theo position
        if (document.getElementById("badge-count")) {
            import(BADGE_MODULE_URL).catch(error =>
                console.warn("Không tải được bộ đếm thông báo.", error)
            );
        }
    });
})();
