import * as service from "./service.js";
import * as events from "./events.js";
import * as utils from "../utils/utils.js";

import { projectState as state } from "./state.js";
import { projectPageMessage } from "./messages.js";

// =========================
// INIT APP
// =========================
events.bindEvents();

// Chặn truy cập khi chưa đăng nhập: Script/auth/auth.js (nạp trong <head>)
$(document).ready(function () {
    initProjectPage();
});

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
