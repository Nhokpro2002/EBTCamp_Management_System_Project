
import { variableGlobal } from "../project.state.js";
import { projectElements } from "../project.state.js";
import * as ui from "./project.ui.js";
import * as handlerEvent from "./project.handle.event.js";
projects: [
    {
        id: 1,
        name: "Project Alpha",
        startDate: "01/06/2026",
        endDate: "30/08/2026",
        progress: 45,
        status: "In Progress"
    },
    {
        id: 2,
        name: "Project Beta",
        startDate: "15/05/2026",
        endDate: "15/09/2026",
        progress: 60,
        status: "In Progress"
    },
    {
        id: 3,
        name: "Project Gamma",
        startDate: "01/07/2026",
        endDate: "31/10/2026",
        progress: 20,
        status: "On Hold"
    },
    {
        id: 4,
        name: "Project Delta",
        startDate: "10/06/2026",
        endDate: "20/08/2026",
        progress: 100,
        status: "Completed"
    },
    {
        id: 5,
        name: "Project Epsilon",
        startDate: "20/07/2026",
        endDate: "25/11/2026",
        progress: 10,
        status: "Not Started"
    },
    {
        id: 6,
        name: "Project Zeta",
        startDate: "05/07/2026",
        endDate: "20/10/2026",
        progress: 35,
        status: "In Progress"
    }
]

projectElements.statsContainer = document.getElementById("statsContainer");
projectElements.projectTableBody = document.getElementById("projectTableBody");
projectElements.pagination = document.getElementById("pagination");
projectElements.tableInfo = document.getElementById("tableInfo");
projectElements.searchInput = document.getElementById("searchInput");
projectElements.statusFilter = document.getElementById("statusFilter");

function bindProjectEvents() {
    projectElements.searchInput.addEventListener("input", handlerEvent.handleFilterChange);
    projectElements.statusFilter.addEventListener("change", handlerEvent.handleFilterChange);
}

function initProjectPage() {
    variableGlobal.filteredProjects = [...variableGlobal.projectList];
    bindProjectEvents();
    handlerEvent.renderProjectPage();
}

document.addEventListener("DOMContentLoaded", initProjectPage);