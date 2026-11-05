import * as api from "../services/generic.api.js";
import { getUserRoles } from "../services/issue-roles.js";

// Quy tắc type issue → position nằm ở Script/services/issue-roles.js (dùng chung với Workflow)
export { getIssueTypesForRoles, isIssueForRoles } from "../services/issue-roles.js";

// =====================================================
// COLLECTIONS
// =====================================================
const COLLECTION_PROJECTS = "Projects";

/**
 * Role (position) của user đang đăng nhập, lấy từ localStorage (viết thường).
 * Issue chỉ hiện trong Notification của user có role tương ứng.
 * @returns {string[]}
 */
export function getCurrentUserRoles() {
    try {
        return getUserRoles(JSON.parse(localStorage.getItem("user")));
    } catch {
        return [];
    }
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
            <option value="" selected>Tất cả dự án</option>
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
            new Option("Không tải được danh sách dự án", "")
        );
        projectSelect.disabled = true;
        throw error;
    }
}
