import * as api from "../services/generic.api.js";

// =====================================================
// COLLECTIONS
// =====================================================
const COLLECTION_PROJECTS = "Projects";

// =====================================================
// ISSUE → ROLE MAPPING
// Issue chỉ hiện trong Notification của user có role tương ứng
// =====================================================
const ISSUE_TYPE_ROLES = {
    "electric": ["Electric"],
    "mechanical": ["Mechanical"],
    "program": ["Program"],
    "robot": ["Robot"],
    // "Purchasing Specialist" là tên role cũ, giữ lại cho user đã đăng ký trước đó
    "missing material": ["Purchasing", "Purchasing Specialist"]
};

/**
 * Role (position) của user đang đăng nhập, lấy từ localStorage.
 * @returns {string[]}
 */
export function getCurrentUserRoles() {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        const roles = Array.isArray(user?.position)
            ? user.position
            : String(user?.position || "").split(",");
        return roles.map(role => role.trim().toLowerCase()).filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * User có role phù hợp với type của issue không.
 */
export function isIssueForRoles(issue, userRoles) {
    const targetRoles = ISSUE_TYPE_ROLES[String(issue?.type || "").trim().toLowerCase()] || [];
    return targetRoles.some(role => userRoles.includes(role.toLowerCase()));
}

export async function loadProjects() {
    const projectSelect = document.getElementById("projectSelect");

    if (!projectSelect) return;

    try {
        const firstPage = await api.loadInventoryItemEachPage(
            COLLECTION_PROJECTS,
            1,
            200
        );
        const remainingPages = await Promise.all(
            Array.from(
                { length: Math.max(0, firstPage.totalPages - 1) },
                (_, index) => api.loadInventoryItemEachPage(
                    COLLECTION_PROJECTS,
                    index + 2,
                    200
                )
            )
        );
        const projects = [
            ...firstPage.items,
            ...remainingPages.flatMap(page => page.items)
        ];

        projectSelect.innerHTML = `
            <option value="" selected>All projects</option>
        `;

        projects.forEach(project => {
            const option = document.createElement("option");

            option.value = project.id;
            option.textContent = project.name;

            projectSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Failed to load projects:", error);
        projectSelect.replaceChildren(
            new Option("Unable to load projects", "")
        );
        projectSelect.disabled = true;
        throw error;
    }
}
