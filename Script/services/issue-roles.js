// =====================================================
// ISSUE TYPE → POSITION (ROLE) MAPPING — dùng chung cho cả hệ thống
//   Electric         → Electric
//   Mechanical       → Mechanical
//   Program          → Program
//   Robot            → Robot
//   Missing Material → Purchasing
// Dùng cho: thông báo issue (Notification) và chọn người xử lý issue (Workflow).
// =====================================================

const ISSUE_TYPE_ROLES = {
    "electric": ["Electric"],
    "mechanical": ["Mechanical"],
    "program": ["Program"],
    "robot": ["Robot"],
    // "Purchasing Specialist" là tên role cũ, giữ lại cho user đã đăng ký trước đó
    "missing material": ["Purchasing", "Purchasing Specialist"]
};

// Tên type đúng như lưu trong database (dùng để lọc khi gọi API)
const ISSUE_TYPE_NAMES = {
    "electric": "Electric",
    "mechanical": "Mechanical",
    "program": "Program",
    "robot": "Robot",
    "missing material": "Missing Material"
};

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

/**
 * Position của một user, viết thường.
 * position có thể là mảng (multi select) hoặc chuỗi "A, B".
 * @returns {string[]}
 */
export function getUserRoles(user) {
    const position = user?.position;
    const roles = Array.isArray(position) ? position : String(position || "").split(",");
    return roles.map(normalize).filter(Boolean);
}

/**
 * Các role (viết thường) phụ trách một type issue.
 * @returns {string[]}
 */
export function getRolesForIssueType(type) {
    return (ISSUE_TYPE_ROLES[normalize(type)] || []).map(normalize);
}

/**
 * Các type issue mà một danh sách role (viết thường) phụ trách.
 * @returns {string[]} tên type như trong database
 */
export function getIssueTypesForRoles(userRoles) {
    return Object.entries(ISSUE_TYPE_ROLES)
        .filter(([, roles]) => roles.some(role => userRoles.includes(normalize(role))))
        .map(([typeKey]) => ISSUE_TYPE_NAMES[typeKey]);
}

/**
 * Danh sách role (viết thường) có phù hợp với type của issue không.
 */
export function isIssueForRoles(issue, userRoles) {
    return getRolesForIssueType(issue?.type).some(role => userRoles.includes(role));
}

/**
 * Những user có position phù hợp để xử lý một type issue.
 */
export function getUsersForIssueType(users, type) {
    const roles = getRolesForIssueType(type);
    return users.filter(user => getUserRoles(user).some(role => roles.includes(role)));
}
