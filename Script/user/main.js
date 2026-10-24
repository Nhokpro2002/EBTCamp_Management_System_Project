import { URL_LOCAL } from "../config.js";
import { updateRecord } from "../services/generic.api.js";

const USERS_COLLECTION = "Users";
const DEFAULT_AVATAR = "../Image/LG-Symbol.png";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const storedUser = readStoredUser();

function readStoredUser() {
    const storedValue = localStorage.getItem("user");
    if (!storedValue) return null;

    try {
        const user = JSON.parse(storedValue);
        return user && typeof user === "object" ? user : null;
    } catch (error) {
        console.error("Unable to read the signed-in user profile.", error);
        return null;
    }
}

function getUserName(user) {
    return user?.employee_name || user?.name || user?.email || "User";
}

function getUserPosition(user) {
    return user?.position || user?.role || user?.user_role || user?.department || "Profile";
}

function getAvatarUrl(user) {
    if (!user?.id || !user?.avatar) return DEFAULT_AVATAR;
    const cacheKey = user.updated ? `?t=${encodeURIComponent(user.updated)}` : "";
    return `${URL_LOCAL}/api/files/${USERS_COLLECTION}/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}${cacheKey}`;
}

function updateUserStorage(updatedRecord) {
    const nextUser = { ...storedUser, ...updatedRecord };
    localStorage.setItem("user", JSON.stringify(nextUser));
    Object.assign(storedUser, nextUser);
    renderUser(nextUser);
}

function renderUser(user) {
    const name = getUserName(user);
    const position = getUserPosition(user);
    const avatarUrl = getAvatarUrl(user);

    document.querySelectorAll(".sidebar-user").forEach((sidebar) => {
        const nameElement = sidebar.querySelector(".user-name");
        const roleElement = sidebar.querySelector(".user-role");
        const avatarElement = sidebar.querySelector(".sidebar-user-avatar, img");

        if (nameElement) nameElement.textContent = name;
        if (roleElement) roleElement.textContent = position;
        if (avatarElement) avatarElement.src = avatarUrl;
    });

    const profileName = document.getElementById("profile-name");
    if (profileName) profileName.textContent = name;

    const subtitle = document.getElementById("profile-subtitle");
    if (subtitle) subtitle.textContent = user?.email || position;

    const profileAvatar = document.getElementById("profile-avatar");
    if (profileAvatar) profileAvatar.src = avatarUrl;

    const fields = {
        "employee-id": user?.employee_id,
        "vh-code": user?.vh_code,
        "full-name": user?.employee_name || user?.name,
        email: user?.email,
        phone: user?.phone,
        department: user?.department,
        position: user?.position || user?.role || user?.user_role
    };

    Object.entries(fields).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value || "";
    });
}

function showMessage(message, isError = false) {
    const status = document.getElementById("profile-status");
    if (status) {
        status.textContent = message;
        status.hidden = false;
        status.classList.toggle("is-error", isError);
        status.classList.toggle("is-success", !isError);
    }

    if (window.Swal) {
        return window.Swal.fire({
            icon: isError ? "error" : "success",
            title: isError ? "Unable to update profile" : "Success",
            text: message
        });
    }

    window.alert(message);
}

function setupBackButton() {
    document.getElementById("back-button")?.addEventListener("click", () => {
        if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
            window.history.back();
            return;
        }
        window.location.href = "inventory.html";
    });
}

function setupAvatarForm() {
    const form = document.getElementById("avatar-form");
    const fileInput = document.getElementById("avatar-file");
    const submitButton = document.getElementById("save-avatar");
    const profileAvatar = document.getElementById("profile-avatar");
    let selectedFile = null;
    let previewUrl = null;

    if (!form || !fileInput || !submitButton) return;

    fileInput.addEventListener("change", () => {
        selectedFile = fileInput.files?.[0] || null;
        submitButton.disabled = !selectedFile;

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;

        if (!selectedFile) {
            if (profileAvatar) profileAvatar.src = getAvatarUrl(storedUser);
            return;
        }

        const isImage = selectedFile.type.startsWith("image/")
            || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(selectedFile.name);
        if (!isImage) {
            selectedFile = null;
            fileInput.value = "";
            submitButton.disabled = true;
            showMessage("Choose a valid image file.", true);
            return;
        }

        if (selectedFile.size > MAX_AVATAR_SIZE) {
            selectedFile = null;
            fileInput.value = "";
            submitButton.disabled = true;
            showMessage("The avatar image must be 5 MB or smaller.", true);
            return;
        }

        previewUrl = URL.createObjectURL(selectedFile);
        if (profileAvatar) profileAvatar.src = previewUrl;
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!storedUser?.id || !selectedFile) {
            showMessage("Sign in and choose an image before uploading your avatar.", true);
            return;
        }

        submitButton.disabled = true;
        const payload = new FormData();
        payload.append("avatar", selectedFile);

        try {
            const updatedRecord = await updateRecord(USERS_COLLECTION, storedUser.id, payload);
            updateUserStorage(updatedRecord);
            fileInput.value = "";
            selectedFile = null;
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = null;
            await showMessage("Your profile picture has been updated.");
        } catch (error) {
            console.error("Avatar update failed.", error);
            await showMessage(error.message || "Could not update your profile picture.", true);
            submitButton.disabled = false;
        }
    });
}

function setupPasswordForm() {
    const form = document.getElementById("password-form");
    const submitButton = document.getElementById("change-password");
    if (!form || !submitButton) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!storedUser?.id) {
            await showMessage("Sign in before changing your password.", true);
            return;
        }

        const oldPassword = document.getElementById("current-password").value;
        const password = document.getElementById("new-password").value;
        const passwordConfirm = document.getElementById("confirm-password").value;

        if (password !== passwordConfirm) {
            await showMessage("The new password and confirmation do not match.", true);
            return;
        }

        if (password.length < 8) {
            await showMessage("The new password must contain at least 8 characters.", true);
            return;
        }

        submitButton.disabled = true;
        try {
            await updateRecord(USERS_COLLECTION, storedUser.id, {
                oldPassword,
                password,
                passwordConfirm
            });
            form.reset();
            await showMessage("Your password has been changed.");
        } catch (error) {
            console.error("Password update failed.", error);
            await showMessage(error.message || "Could not change your password.", true);
        } finally {
            submitButton.disabled = false;
        }
    });
}

if (storedUser) {
    renderUser(storedUser);
} else if (document.getElementById("profile-status")) {
    showMessage("No signed-in user was found. Please sign in again.", true);
}

setupBackButton();
setupAvatarForm();
setupPasswordForm();
