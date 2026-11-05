import * as service from "./service.js";
import * as ui from "./ui.js";

import { userState as state } from "./state.js";
import { userPageMessage as message } from "./messages.js";

// =====================================================
// PROFILE EVENTS
// =====================================================
export function bindProfileEvents() {
    bindImageUpload("avatar", "changeAvatarBtn", "avatar-file");
    bindImageUpload("cover", "changeCoverBtn", "cover-file");
    bindPositionForm();
    bindPasswordForm();
}

// =====================================================
// AVATAR / COVER — chọn ảnh là xem trước + upload luôn
// =====================================================

/**
 * @param {"avatar"|"cover"} kind
 */
function bindImageUpload(kind, buttonID, inputID) {
    const button = document.getElementById(buttonID);
    const input = document.getElementById(inputID);

    button.addEventListener("click", () => input.click());

    input.addEventListener("change", async () => {
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;

        const error = service.validateImage(file);
        if (error) {
            ui.showToast(error, true);
            return;
        }

        // Xem trước ngay trong lúc upload
        const previewUrl = URL.createObjectURL(file);
        if (kind === "avatar") ui.previewAvatar(previewUrl);
        else ui.setCoverImage(previewUrl);

        ui.setImageUploading(kind, true);
        try {
            const user = await service.uploadUserImage(kind, file);
            ui.renderProfileHeader(user);
            ui.renderSidebarUser(user);
            ui.showToast(kind === "avatar" ? message.avatarUpdated : message.coverUpdated);
        } catch (uploadError) {
            console.error("Image update failed.", uploadError);
            // Lỗi → trả lại ảnh cũ
            ui.renderProfileHeader(state.user);
            ui.showToast(uploadError.message || message.imageFailed, true);
        } finally {
            ui.setImageUploading(kind, false);
            URL.revokeObjectURL(previewUrl);
        }
    });
}

// =====================================================
// POSITION
// =====================================================
function bindPositionForm() {
    const form = document.getElementById("position-form");
    const saveButton = document.getElementById("savePositionBtn");

    const getSavedPositions = () => [...service.getPositions(state.user)].sort();

    const updateState = () => {
        const selected = ui.getSelectedPositions();
        ui.setPositionFormState({
            isDirty: JSON.stringify([...selected].sort()) !== JSON.stringify(getSavedPositions()),
            isValid: selected.length > 0
        });
    };

    form.addEventListener("change", updateState);

    document.getElementById("resetPositionBtn").addEventListener("click", () => {
        ui.renderPositionOptions(state.user);
        updateState();
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const positions = ui.getSelectedPositions();
        if (!positions.length) {
            ui.showToast(message.positionRequired, true);
            return;
        }

        ui.setButtonLoading(saveButton, true);
        try {
            const user = await service.updatePositions(positions);
            ui.renderProfileHeader(user);
            ui.renderPositionOptions(user);
            ui.renderSidebarUser(user);
            ui.showToast(message.positionUpdated);
        } catch (error) {
            console.error("Position update failed.", error);
            ui.showToast(error.message || message.positionFailed, true);
        } finally {
            ui.setButtonLoading(saveButton, false);
            updateState();
        }
    });

    updateState();
}

// =====================================================
// PASSWORD
// =====================================================
function bindPasswordForm() {
    const form = document.getElementById("password-form");
    const currentInput = document.getElementById("current-password");
    const newInput = document.getElementById("new-password");
    const confirmInput = document.getElementById("confirm-password");
    const submitButton = document.getElementById("change-password");

    const validate = () => {
        const rules = service.checkPasswordRules(newInput.value);
        const isMatch = Boolean(newInput.value) && newInput.value === confirmInput.value;

        ui.renderPasswordRules(rules, isMatch);
        ui.setPasswordSubmitEnabled(
            Boolean(currentInput.value) && service.isStrongPassword(newInput.value) && isMatch
        );
    };

    form.addEventListener("input", validate);

    form.addEventListener("click", event => {
        const toggle = event.target.closest("[data-toggle-password]");
        if (toggle) ui.togglePasswordVisibility(toggle);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (newInput.value !== confirmInput.value) {
            ui.showToast(message.passwordMismatch, true);
            return;
        }
        if (!service.isStrongPassword(newInput.value)) {
            ui.showToast(message.passwordWeak, true);
            return;
        }

        ui.setButtonLoading(submitButton, true, "Đang cập nhật...");
        try {
            await service.changePassword({
                oldPassword: currentInput.value,
                password: newInput.value,
                passwordConfirm: confirmInput.value
            });

            form.reset();
            // PocketBase hủy phiên cũ sau khi đổi mật khẩu → đăng nhập lại
            await ui.showAlert("Đã đổi mật khẩu", message.passwordChanged);
            window.EBTAuth?.logout();
        } catch (error) {
            console.error("Password update failed.", error);
            ui.showToast(message.passwordFailed, true);
            currentInput.focus();
        } finally {
            ui.setButtonLoading(submitButton, false);
            validate();
        }
    });

    validate();
}
