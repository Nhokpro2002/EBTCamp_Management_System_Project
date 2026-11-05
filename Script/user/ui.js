import * as service from "./service.js";

// =====================================================
// HELPERS
// =====================================================
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || "—";
}

// Trang nào cũng nạp file này nhưng không phải trang nào cũng có SweetAlert2
export function showToast(text, isError = false) {
    if (!window.Swal) {
        window.alert(text);
        return Promise.resolve();
    }
    return window.Swal.fire({
        toast: true,
        position: "top-end",
        icon: isError ? "error" : "success",
        title: text,
        showConfirmButton: false,
        timer: isError ? 3500 : 2000
    });
}

export function showAlert(title, text, icon = "success") {
    if (!window.Swal) {
        window.alert(text);
        return Promise.resolve();
    }
    return window.Swal.fire({ icon, title, text });
}

// =====================================================
// SIDEBAR (mọi trang)
// =====================================================
export function renderSidebarUser(user) {
    const name = service.getUserName(user);
    const position = service.getPositionText(user);
    const avatarUrl = service.getAvatarUrl(user);

    document.querySelectorAll(".sidebar-user").forEach(sidebar => {
        const nameElement = sidebar.querySelector(".user-name");
        const roleElement = sidebar.querySelector(".user-role");
        const avatarElement = sidebar.querySelector(".sidebar-user-avatar, img");

        // title: rê chuột xem đầy đủ khi tên / chức vụ dài bị cắt thành "..."
        if (nameElement) {
            nameElement.textContent = name;
            nameElement.title = name;
        }
        if (roleElement) {
            roleElement.textContent = position;
            roleElement.title = position;
        }
        if (avatarElement) avatarElement.src = avatarUrl;
    });
}

// =====================================================
// PROFILE: header (ảnh nền + avatar + tên)
// =====================================================
export function renderProfileHeader(user) {
    setText("profile-name", service.getUserName(user));
    setText("profile-email", user?.email);
    setText("profile-department", user?.department);

    document.getElementById("profile-avatar").src = service.getAvatarUrl(user);
    setCoverImage(service.getFileUrl(user, service.IMAGE_FIELDS.cover));

    document.getElementById("profile-position-chips").innerHTML =
        service.getPositions(user)
            .map(position => `<span class="position-chip">${escapeHtml(position)}</span>`)
            .join("") || '<span class="position-chip is-empty">Chưa có chức vụ</span>';
}

/**
 * Ảnh nền hiện trọn vẹn (không cắt), hai bên lấp bằng bản phóng to làm mờ của chính ảnh.
 * Ảnh rỗng → dùng nền gradient mặc định (CSS).
 */
export function setCoverImage(url) {
    const cover = document.getElementById("profile-cover");
    const photo = document.getElementById("cover-photo");

    cover.style.setProperty("--cover-url", url ? `url("${url}")` : "none");
    cover.classList.toggle("has-image", Boolean(url));

    photo.hidden = !url;
    if (url) photo.src = url;
    else photo.removeAttribute("src");
}

export function previewAvatar(url) {
    document.getElementById("profile-avatar").src = url;
}

/**
 * @param {"avatar"|"cover"} kind
 */
export function setImageUploading(kind, isUploading) {
    const target = document.getElementById(kind === "avatar" ? "avatar-wrap" : "profile-cover");
    target.classList.toggle("is-uploading", isUploading);
    target.setAttribute("aria-busy", String(isUploading));
    document.getElementById(kind === "avatar" ? "changeAvatarBtn" : "changeCoverBtn").disabled = isUploading;
}

// =====================================================
// PROFILE: About (chỉ xem)
// =====================================================
export function renderAbout(user) {
    setText("employee-id", user?.employee_id);
    setText("vh-code", user?.vh_code);
    setText("full-name", user?.employee_name || user?.name);
    setText("email", user?.email);
    setText("phone", user?.phone);
    setText("department", user?.department);
}

// =====================================================
// PROFILE: Position
// =====================================================

/**
 * Các role có thể chọn + role đang có (kể cả tên cũ không còn trong danh sách).
 */
export function renderPositionOptions(user) {
    const selected = service.getPositions(user);
    const options = [...new Set([...service.POSITION_OPTIONS, ...selected])];

    document.getElementById("position-options").innerHTML = options.map(position => `
        <label class="position-option">
            <input type="checkbox" name="position" value="${escapeHtml(position)}"
                ${selected.includes(position) ? "checked" : ""}>
            <span><i class="bi bi-check-lg" aria-hidden="true"></i>${escapeHtml(position)}</span>
        </label>`).join("");
}

export function getSelectedPositions() {
    return [...document.querySelectorAll('#position-options input[name="position"]:checked')]
        .map(input => input.value);
}

export function setPositionFormState({ isDirty, isValid }) {
    document.getElementById("savePositionBtn").disabled = !isDirty || !isValid;
    document.getElementById("resetPositionBtn").disabled = !isDirty;
    document.getElementById("position-hint").classList.toggle("is-error", !isValid);
}

// =====================================================
// PROFILE: Password
// =====================================================
export function renderPasswordRules(results = {}, isMatch = null) {
    document.getElementById("password-rules").innerHTML = [
        ...service.PASSWORD_RULES.map(rule => ({ label: rule.label, ok: Boolean(results[rule.key]) })),
        { label: "Hai mật khẩu khớp nhau", ok: Boolean(isMatch) }
    ].map(rule => `
        <li class="${rule.ok ? "is-ok" : ""}">
            <i class="bi ${rule.ok ? "bi-check-circle-fill" : "bi-circle"}" aria-hidden="true"></i>
            ${rule.label}
        </li>`).join("");
}

export function setPasswordSubmitEnabled(isEnabled) {
    document.getElementById("change-password").disabled = !isEnabled;
}

/**
 * Hiện / ẩn mật khẩu của ô nằm cạnh nút.
 */
export function togglePasswordVisibility(button) {
    const input = document.getElementById(button.dataset.togglePassword);
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    button.setAttribute("aria-pressed", String(isHidden));
    button.setAttribute("aria-label", isHidden ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    button.querySelector("i").className = `bi ${isHidden ? "bi-eye-slash" : "bi-eye"}`;
}

// =====================================================
// BUTTON LOADING
// =====================================================
export function setButtonLoading(button, isLoading, loadingText = "Đang lưu...") {
    if (isLoading) {
        button.dataset.originalHtml = button.innerHTML;
        button.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> ${loadingText}`;
        button.disabled = true;
    } else if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
        delete button.dataset.originalHtml;
    }
}
