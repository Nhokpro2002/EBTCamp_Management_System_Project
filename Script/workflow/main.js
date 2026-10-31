import * as service from "./service.js";
import * as events from "./events.js";
import * as ui from "./ui.js";
import * as utils from "../utils/utils.js";

import { setupGantt } from "./gantt.js";
import { workflowData, projectData, issueData } from "./state.js";

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
        utils.showError("Project ID is missing from the workflow URL.");
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
        await service.loadIssueData(projectID);
        ui.renderIssueCount(issueData.issue.length);
        events.renderIssues();

        gantt.render();
    } catch (error) {
        console.error(error);
        utils.showError("Failed to load workflow data.");
    }
}

// =====================================================
// PROJECT STATISTICS
// =====================================================
function updateProjectStatistics() {
    ui.renderTotalTaskCount(service.getTotalTaskCount());
    events.renderStageProgress();
}
