import * as service from "./service.js";
import * as ui from "./ui.js";
import * as charts from "./charts.js";
import * as events from "./events.js";
import * as utils from "../utils/utils.js";

import { dashboardState as state } from "./state.js";
import { dashboardPageMessage as message } from "./messages.js";

// =====================================================
// INIT
// (chặn truy cập khi chưa đăng nhập: Script/auth/auth.js trong <head>)
// =====================================================
events.bindEvents({ onRefresh: loadDashboard });
loadDashboard();

// =====================================================
// LOAD + RENDER
// =====================================================
async function loadDashboard() {
    if (state.isLoading) return;

    state.isLoading = true;
    ui.setLoading(true);

    try {
        await service.loadDashboardData();
        renderDashboard();
        ui.setLastUpdated(new Date());
    } catch (error) {
        console.error("Failed to load dashboard.", error);
        utils.showError(message.loadFailed);
    } finally {
        state.isLoading = false;
        ui.setLoading(false);
    }
}

function renderDashboard() {
    const projects = service.getProjectSummaries();

    ui.renderKpis(service.getKpis(projects));
    ui.renderProjectTable(projects, message.noProjects);

    // ---------- Biểu đồ ----------
    const issuesByType = service.getIssuesByType();
    const hasIssues = state.issues.length > 0;
    ui.toggleChartEmpty("issuesByTypeChart", !hasIssues, message.noIssues);
    charts.renderIssuesByTypeChart(issuesByType);

    const issuesByStage = service.getOpenIssuesByStage();
    ui.toggleChartEmpty(
        "issuesByStageChart",
        issuesByStage.every(stage => stage.count === 0),
        message.noOpenIssues
    );
    charts.renderIssuesByStageChart(issuesByStage);

    ui.toggleChartEmpty("stockLevelChart", state.materials.length === 0, message.noData);
    charts.renderStockLevelChart(service.getStockLevels());

    // ---------- Danh sách ----------
    ui.renderRecentIssues(service.getRecentIssues(), message.noIssues);
    ui.renderLowStock(service.getLowStockMaterials(), service.LOW_STOCK_LIMIT, message.noLowStock);
}
