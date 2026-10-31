import * as service from "./service.js";
import * as events from "./events.js";
import * as utils from "../utils/utils.js";

import { projectState as state } from "./state.js";
import { projectPageMessage } from "./messages.js";

// =========================
// INIT APP
// =========================
events.bindEvents();

$(document).ready(function () {
    if (!checkAuthentication()) return;

    initProjectPage();
});

// =========================
// AUTH
// =========================
function checkAuthentication() {
    const token = localStorage.getItem("token");

    if (!token || !token.trim()) {
        utils.showPopup("Warning", "You must login", "warning")
            .then(() => {
                // Đường dẫn tương đối: chạy được ở cả máy test lẫn server thật
                window.location.href = "login.html";
            });

        return false;
    }

    return true;
}

// =========================
// INIT DATA
// =========================
async function initProjectPage() {
    try {
        const [projects, users] = await Promise.all([
            service.loadProjects(),
            service.loadUsers()
        ]);

        state.projectList = projects;
        state.userMap = Object.fromEntries(
            users.map(user => [user.id, user])
        );
        state.filteredProjects = [...projects];

        events.renderPage();

    } catch (error) {
        console.error(error);
        utils.showError(projectPageMessage.loadError);
    }
}
