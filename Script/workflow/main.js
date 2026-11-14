import * as service from "./service.js";
import * as events from "./events.js";
import * as ui from "./ui.js";
import * as utils from "../utils/utils.js";

import { setupGantt } from "./gantt.js";
import { workflowData, projectData } from "./state.js";

// =====================================================
// INIT APP
// =====================================================
setupGantt();
events.bindGanttEvents();
events.bindUIEvents();
events.renderIssues();

initPage();

// =====================================================
// PAGE DATA INITIALIZATION
// =====================================================
async function initPage() {
    const projectID = new URLSearchParams(location.search).get("projectID");

    if (!projectID) {
        utils.showError("Thiếu mã dự án (projectID) trên đường dẫn.");
        return;
    }

    workflowData.projectID = projectID;

    try {
        gantt.init("gantt_here");

        // ---------- Project ----------
        await service.loadProjectData(projectID);
        ui.renderProjectDates(projectData.startDate, projectData.endDate);

        // ---------- Stages + Tasks ----------
        await service.loadStageData(projectID);
        service.mappingData();
        gantt.parse(projectData);

        updateProjectStatistics();

        // ---------- Issues ----------
        await Promise.all([
            service.loadIssueData(projectID),
            service.loadUsers()
        ]);
        // Bảng Issues + số issue (gồm cả task trễ hạn)
        events.renderIssues();

        gantt.render();
    } catch (error) {
        console.error(error);
        utils.showError("Không tải được dữ liệu tiến độ.");
    }
}

// =====================================================
// PROJECT STATISTICS
// =====================================================
function updateProjectStatistics() {
    ui.renderTotalTaskCount(service.getTotalTaskCount());
    ui.renderPlanTaskCount(service.getPlanTaskCount());
    events.renderStageProgress();
}
