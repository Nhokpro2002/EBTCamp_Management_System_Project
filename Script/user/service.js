import { URL_LOCAL } from "../config.js";
import { updateRecord } from "../services/generic.api.js";

import { userState as state } from "./state.js";
import { userPageMessage as message } from "./messages.js";

// =====================================================
// CONSTANTS
// =====================================================
const USERS_COLLECTION = "Users";

export const DEFAULT_AVATAR = "../Image/LG-Symbol.png";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Field ảnh trong collection Users
export const IMAGE_FIELDS = {
    avatar: "avatar",
    cover: "background_image"
};

// Giống trang Register
export const POSITION_OPTIONS = [
    "Part Leader",
    "Senior Engineer",
    "Purchasing",
    "Technician",
    "Unit Leader",
    "Engineer",
    "Mechanical",
    "Electric",
    "Program",
    "Robot"
];

// Giống quy tắc mật khẩu ở trang Register
export const PASSWORD_RULES = [
    { key: "length", label: "8–30 ký tự", test: value => value.length >= 8 && value.length <= 30 },
    { key: "upper", label: "Có chữ in hoa", test: value => /[A-Z]/.test(value) },
    { key: "number", label: "Có chữ số", test: value => /[0-9]/.test(value) },
    { key: "special", label: "Có ký tự đặc biệt", test: value => /[!@#$%^&*(),.?":{}|<>]/.test(value) }
];

// =====================================================
// USER (localStorage)
// =====================================================
export function readStoredUser() {
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

/**
 * Gộp bản ghi mới vào user hiện tại, lưu lại localStorage.
 */
function saveUser(updatedRecord) {
    state.user = { ...state.user, ...updatedRecord };
    localStorage.setItem("user", JSON.stringify(state.user));
    return state.user;
}

// =====================================================
// DISPLAY HELPERS
// =====================================================
export function getUserName(user) {
    return user?.employee_name || user?.name || user?.email || "Người dùng";
}

/**
 * position có thể là mảng (multi select) hoặc chuỗi "A, B".
 */
export function getPositions(user) {
    const position = user?.position;
    const list = Array.isArray(position) ? position : String(position || "").split(",");
    return list.map(item => item.trim()).filter(Boolean);
}

export function getPositionText(user) {
    const positions = getPositions(user);
    return positions.length
        ? positions.join(", ")
        : user?.role || user?.user_role || user?.department || "Hồ sơ";
}

export function getFileUrl(user, field) {
    const fileName = user?.[field];
    if (!user?.id || !fileName) return "";

    const cacheKey = user.updated ? `?t=${encodeURIComponent(user.updated)}` : "";
    return `${URL_LOCAL}/api/files/${USERS_COLLECTION}/${encodeURIComponent(user.id)}/${encodeURIComponent(fileName)}${cacheKey}`;
}

export function getAvatarUrl(user) {
    return getFileUrl(user, IMAGE_FIELDS.avatar) || DEFAULT_AVATAR;
}

// =====================================================
// IMAGES
// =====================================================

/**
 * @returns {string} thông báo lỗi, "" nếu hợp lệ
 */
export function validateImage(file) {
    const isImage = file.type.startsWith("image/")
        || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name);
    if (!isImage) return message.invalidImage;
    if (file.size > MAX_IMAGE_SIZE) return message.imageTooLarge;
    return "";
}

/**
 * Upload ảnh đại diện hoặc ảnh nền.
 * @param {"avatar"|"cover"} kind
 */
export async function uploadUserImage(kind, file) {
    const payload = new FormData();
    payload.append(IMAGE_FIELDS[kind], file);

    const updatedRecord = await updateRecord(USERS_COLLECTION, state.user.id, payload);
    return saveUser(updatedRecord);
}

// =====================================================
// POSITION
// =====================================================
export async function updatePositions(positions) {
    const updatedRecord = await updateRecord(USERS_COLLECTION, state.user.id, { position: positions });
    return saveUser(updatedRecord);
}

// =====================================================
// PASSWORD
// =====================================================
export function checkPasswordRules(password) {
    return Object.fromEntries(PASSWORD_RULES.map(rule => [rule.key, rule.test(password)]));
}

export function isStrongPassword(password) {
    return PASSWORD_RULES.every(rule => rule.test(password));
}

/**
 * Đổi mật khẩu (PocketBase yêu cầu mật khẩu cũ).
 * Đổi xong PocketBase hủy token hiện tại → cần đăng nhập lại.
 */
export function changePassword({ oldPassword, password, passwordConfirm }) {
    return updateRecord(USERS_COLLECTION, state.user.id, {
        oldPassword,
        password,
        passwordConfirm
    });
}
