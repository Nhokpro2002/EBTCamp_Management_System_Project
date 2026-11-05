import { URL_LOCAL } from "../config.js";
import * as utils from "../utils/utils.js";

// =====================================================
// HELPERS
// =====================================================
export function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US");
}

function formatDate(date) {
    return Number.isNaN(date.getTime())
        ? "-"
        : utils.formatDateTimeToDisplay(date);
}

function workflowUrl(projectID) {
    return `workflow.html?projectID=${encodeURIComponent(projectID)}`;
}

function emptyState(message, colspan = 0) {
    const content = `
        <div class="empty-state">
            <i class="bi bi-inbox" aria-hidden="true"></i>
            <span>${escapeHtml(message)}</span>
        </div>`;
    return colspan ? `<tr><td colspan="${colspan}">${content}</td></tr>` : content;
}

// =====================================================
// LOADING / ERROR
// =====================================================
export function setLoading(isLoading) {
    document.querySelector(".content").setAttribute("aria-busy", String(isLoading));

    const button = document.getElementById("refreshDashboardBtn");
    button.disabled = isLoading;
    button.innerHTML = isLoading
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang tải...'
        : '<i class="bi bi-arrow-clockwise"></i> Làm mới';
}

export function setLastUpdated(date) {
    document.getElementById("lastUpdated").textContent =
        `Cập nhật lúc ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
}

// =====================================================
// KPI
// =====================================================
export function renderKpis(kpis) {
    const set = (id, value) => {
        document.getElementById(id).textContent = value;
    };

    set("kpiProjects", formatNumber(kpis.projects));
    set("kpiProjectsNote", `${formatNumber(kpis.projectsInProgress)} đang thực hiện`);

    set("kpiOverdue", formatNumber(kpis.overdueTasks));
    set("kpiOverdueNote", `trên tổng ${formatNumber(kpis.totalTasks)} task`);

    set("kpiIssues", formatNumber(kpis.openIssues));
    set("kpiIssuesNote", `trên tổng ${formatNumber(kpis.totalIssues)} issue`);

    set("kpiLowStock", formatNumber(kpis.lowStock));
    set("kpiLowStockNote", `${formatNumber(kpis.outOfStock)} vật tư hết hàng`);

    // Đổi màu ghi chú khi có vấn đề cần xử lý
    document.getElementById("kpiOverdueNote").classList.toggle("is-warn", kpis.overdueTasks > 0);
    document.getElementById("kpiIssuesNote").classList.toggle("is-warn", kpis.openIssues > 0);
    document.getElementById("kpiLowStockNote").classList.toggle("is-warn", kpis.outOfStock > 0);
}

// =====================================================
// PROJECT OVERVIEW
// =====================================================
function getProgressClass(project) {
    if (project.progress >= 100) return "is-done";
    if (project.overdueTasks > 0) return "is-late";
    return "is-on-track";
}

export function renderProjectTable(projects, emptyMessage) {
    const tbody = document.getElementById("projectTable");

    if (!projects.length) {
        tbody.innerHTML = emptyState(emptyMessage, 5);
        return;
    }

    tbody.innerHTML = projects.map(project => {
        const percent = Math.round(project.progress);
        return `
        <tr>
            <td>
                <a class="project-link" href="${workflowUrl(project.id)}">${escapeHtml(project.name)}</a>
            </td>
            <td class="cell-muted">${escapeHtml(utils.formatDateDisplay(project.endDate) || "-")}</td>
            <td>
                <div class="progress-cell" role="img" aria-label="Hoàn thành ${percent}%">
                    <div class="progress-track">
                        <div class="progress-fill ${getProgressClass(project)}" style="width:${percent}%"></div>
                    </div>
                    <span>${percent}%</span>
                </div>
            </td>
            <td>
                ${project.overdueTasks
                    ? `<span class="count-chip is-red">${project.overdueTasks}</span>`
                    : '<span class="count-chip">0</span>'}
            </td>
            <td>
                ${project.openIssues
                    ? `<span class="count-chip is-amber">${project.openIssues}</span>`
                    : '<span class="count-chip">0</span>'}
            </td>
        </tr>`;
    }).join("");
}

// =====================================================
// RECENT ISSUES
// =====================================================
function getStageClass(stage) {
    const key = String(stage ?? "").trim().toLowerCase();
    return ["design", "mechanical", "assembly", "electric", "program"].includes(key) ? key : "default";
}

export function renderRecentIssues(issues, emptyMessage) {
    const tbody = document.getElementById("recentIssueTable");

    if (!issues.length) {
        tbody.innerHTML = emptyState(emptyMessage, 5);
        return;
    }

    tbody.innerHTML = issues.map(issue => `
        <tr>
            <td>
                ${issue.project
                    ? `<a class="project-link" href="${workflowUrl(issue.project)}#issues-panel">${escapeHtml(issue.title || "Issue chưa đặt tên")}</a>`
                    : `<span class="project-link">${escapeHtml(issue.title || "Issue chưa đặt tên")}</span>`}
                <small class="cell-sub">${escapeHtml(issue.project_name || "")}</small>
            </td>
            <td><span class="type-chip">${escapeHtml(issue.type || "-")}</span></td>
            <td>
                ${issue.related_stage
                    ? `<span class="stage-badge ${getStageClass(issue.related_stage)}">${escapeHtml(issue.related_stage)}</span>`
                    : '<span class="cell-muted">-</span>'}
            </td>
            <td class="cell-muted">${formatDate(issue.date)}</td>
            <td>
                <span class="status-pill ${issue.solved ? "is-solved" : "is-open"}">
                    ${issue.solved ? "Đã xử lý" : "Chưa xử lý"}
                </span>
            </td>
        </tr>`).join("");
}

// =====================================================
// LOW STOCK
// =====================================================
export function renderLowStock(materials, lowStockLimit, emptyMessage) {
    const container = document.getElementById("lowStockList");

    if (!materials.length) {
        container.innerHTML = emptyState(emptyMessage);
        return;
    }

    container.innerHTML = materials.map(material => {
        const stock = Number(material.stock) || 0;
        const percent = Math.max(4, Math.min(100, stock / lowStockLimit * 100));
        const imageUrl = material.image
            ? `${URL_LOCAL}/api/files/Inventory_Items/${encodeURIComponent(material.id)}/${encodeURIComponent(material.image)}`
            : "";

        return `
        <div class="stock-item">
            <div class="material-thumb">
                <i class="bi bi-box-seam" aria-hidden="true"></i>
                ${imageUrl ? `<img src="${imageUrl}" alt="" loading="lazy" onerror="this.remove()">` : ""}
            </div>
            <div class="stock-info">
                <div class="stock-header">
                    <span class="stock-name">${escapeHtml(material.name)}</span>
                    <span class="stock-count ${stock <= 0 ? "is-out" : ""}">
                        ${stock <= 0 ? "Hết hàng" : `Còn ${stock}`}
                    </span>
                </div>
                <small class="cell-sub">${escapeHtml(material.code || material.model || "")}</small>
                <div class="progress-track">
                    <div class="progress-fill ${stock <= 0 ? "is-late" : "is-warn"}" style="width:${percent}%"></div>
                </div>
            </div>
        </div>`;
    }).join("");
}

// =====================================================
// CHART EMPTY STATE
// =====================================================
/**
 * Ẩn canvas và hiện thông báo khi biểu đồ không có dữ liệu.
 */
export function toggleChartEmpty(canvasID, isEmpty, message) {
    const box = document.getElementById(canvasID).closest(".chart-box");
    box.classList.toggle("is-empty", isEmpty);
    box.dataset.emptyMessage = message;
}
