import * as service from "./service.js";
import * as ui from "./ui.js";
import { warningRecord } from "./state.js";

const pb = new PocketBase("http://127.0.0.1:8090");

const panel = document.querySelector("#activity-list");
const dateInput = document.querySelector("#filter-date");
const badgeCount = document.querySelector("#badge-count");

service.loadProjects();

// =====================================================
// 1. State
// =====================================================

let newNotification = 0;


// =====================================================
// 2. Initialization
// =====================================================

const todayStr = new Date().toLocaleDateString("sv-SE");

dateInput.value = todayStr;

// =====================================================
// Deadline Drawer Events
// =====================================================

const deadlineButton =
    document.getElementById("btn-deadline");

const deadlineDrawer =
    document.getElementById("deadline-drawer");

const deadlineOverlay =
    document.getElementById("deadline-overlay");

const closeButton =
    document.getElementById("btn-close-deadline");

deadlineButton?.addEventListener("click", async () => {

    console.log("CLICK DEADLINE");

    deadlineDrawer.classList.add("active");
    deadlineOverlay.classList.add("active");

    await loadDeadlineWarnings();
});

closeButton?.addEventListener("click", () => {

    deadlineDrawer.classList.remove("active");
    deadlineOverlay.classList.remove("active");

});

// =====================================================
// Load initial data
// =====================================================

await loadActivity(todayStr);

subscribeRealtime();

dateInput.addEventListener("change", async (event) => {
    await loadActivity(event.target.value);
});

// =====================================================
// 3. Load Activity History
// =====================================================

async function loadActivity(selectedDate) {

    try {

        panel.innerHTML = "";

        if (!selectedDate) {
            return;
        }

        const {
            startOfDay,
            endOfDay
        } = getDateRange(selectedDate);


        // ---------------------------------------------
        // Load Notifications + Issues cùng lúc
        // ---------------------------------------------

        const [notifications, issues] = await Promise.all([

            pb.collection("Notifications").getList(1, 100, {
                sort: "-created",

                filter: `
                    created >= "${startOfDay}"
                    &&
                    created <= "${endOfDay}"
                `
            }),

            pb.collection("Issues").getList(1, 100, {
                sort: "-created_date",

                filter: `
                    created_date >= "${startOfDay}"
                    &&
                    created_date <= "${endOfDay}"
                `
            })

        ]);


        // ---------------------------------------------
        // Gộp thành một danh sách Activity
        // ---------------------------------------------

        const activities = [

            ...notifications.items.map(notification => ({
                type: "notification",
                data: notification,
                date: new Date(notification.created)
            })),

            ...issues.items.map(issue => ({
                type: "issue",
                data: issue,
                date: new Date(issue.created_date)
            }))

        ];


        // ---------------------------------------------
        // Sort mới nhất -> cũ nhất
        // ---------------------------------------------

        activities.sort(
            (a, b) => b.date - a.date
        );


        // ---------------------------------------------
        // Render
        // ---------------------------------------------

        activities.forEach(activity => {

            if (activity.type === "notification") {
                ui.renderNotification(activity.data);
            }

            else if (activity.type === "issue") {
                ui.renderIssue(activity.data);
            }

        });

    }

    catch (error) {

        console.error(
            "Lỗi khi tải lịch sử thông báo:",
            error
        );

    }
}


// =====================================================
// 4. Realtime
// =====================================================

function subscribeRealtime() {
    subscribeCollection("Notifications");
    subscribeCollection("Issues");
}


function subscribeCollection(collectionName) {
    pb.collection(collectionName).subscribe("*", event => {

        if (event.action !== "create") {
            return;
        }

        // ---------------------------------------------
        // Notification counter
        // ---------------------------------------------
        increaseNotificationCount();

        // ---------------------------------------------
        // Kiểm tra record có thuộc ngày đang chọn không
        // ---------------------------------------------
        const recordDate = getRecordDate(
            collectionName,
            event.record
        );

        const selectedDate = dateInput.value;

        if (recordDate !== selectedDate) {
            return;
        }


        // ---------------------------------------------
        // Render record mới
        // ---------------------------------------------
        if (collectionName === "Notifications") {
            ui.renderNotification(event.record);
        }

        else if (collectionName === "Issues") {
            ui.renderIssue(event.record);
        }
    });
}


function increaseNotificationCount() {
    newNotification++;
    badgeCount.textContent =
        newNotification > 99
            ? "99+"
            : newNotification;
    badgeCount.classList.remove("d-none");
}


function getRecordDate(collectionName, record) {
    const field =
        collectionName === "Notifications"
            ? record.created
            : record.created_date;
    return new Date(field)
        .toLocaleDateString("sv-SE");
}

// =====================================================
// 8. Helpers - Date / Time
// =====================================================

function getDateRange(selectedDate) {

    const startOfDay =
        new Date(
            `${selectedDate}T00:00:00+07:00`
        );

    const endOfDay =
        new Date(
            `${selectedDate}T23:59:59.999+07:00`
        );


    return {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
    };

}


const deadlineWarningList =
    document.getElementById("deadline-warning-list");

const deadlineEmpty =
    document.getElementById("deadline-empty");

const deadlineWarningCount =
    document.getElementById("deadline-warning-count");

function openDeadlineDrawer() {
    deadlineDrawer.classList.add("active");
    deadlineOverlay.classList.add("active");
    console.log("open");
    loadDeadlineWarnings();
}


function closeDeadlineDrawer() {

    deadlineDrawer.classList.remove("active");
    deadlineOverlay.classList.remove("active");
}

async function loadDeadlineWarnings() {

    deadlineWarningList.innerHTML = `
        <div class="deadline-loading">
            <div class="spinner-border" role="status"></div>
            Checking task deadlines...
        </div>
    `;

    deadlineEmpty.style.display = "none";

    try {

        await service.loadTaskNotDone();

        const warnings =
            warningRecord.warnings || [];

        renderDeadlineWarnings(warnings);

    } catch (error) {

        console.error(
            "Failed to load deadline warnings:",
            error
        );

        deadlineWarningList.innerHTML = `
            <div class="alert alert-danger">
                Failed to load deadline warnings.
            </div>
        `;
    }
}

function renderDeadlineWarnings(warnings) {

    deadlineWarningList.innerHTML = "";

    deadlineWarningCount.textContent =
        `${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`;

    // Update sidebar count
    const countElement =
        document.querySelector(".count-system");

    if (countElement) {
        countElement.textContent = warnings.length;
    }


    // Không có warning
    if (!warnings.length) {

        deadlineEmpty.style.display = "flex";

        return;
    }


    deadlineEmpty.style.display = "none";


    // Sort:
    // Level 3 -> Level 2 -> Level 1

    const sortedWarnings = [...warnings].sort(
        (a, b) => Number(b.level) - Number(a.level)
    );


    for (const warning of sortedWarnings) {

        const card =
            createDeadlineWarningCard(warning);

        deadlineWarningList.appendChild(card);
    }
}


function createDeadlineWarningCard(warning) {

    const card = document.createElement("div");

    const level = Number(warning.level);

    const levelText = {
        1: "Notice",
        2: "Warning",
        3: "Critical"
    }[level] || "Warning";

    const levelIcon = {
        1: "bi-info-circle",
        2: "bi-exclamation-triangle",
        3: "bi-exclamation-octagon"
    }[level] || "bi-exclamation-triangle";


    const progress =
        Number(warning.progress || 0);

    const timeUsed =
        Number(warning.time_used_percent || 0);

    const gap =
        Number(warning.gap || 0);

    const remainingHours =
        Number(warning.remaining_hours || 0);

    const severity =
        warning.severity || "Normal";

    const status =
        warning.status || "open";

    const project =
        warning.project || "Unknown Project";

    const handler =
        warning.handler || "Unassigned";


    card.className =
        `deadline-warning level-${level}`;


    card.innerHTML = `

        <!-- HEADER -->
        <div class="warning-card-header">

            <div class="warning-title-wrapper">

                <div class="warning-icon">
                    <i class="bi ${levelIcon}"></i>
                </div>

                <div class="warning-title-content">

                    <h6 class="warning-task-name">
                        ${ui.escapeHtml(
        warning.task_name || "Unknown Task"
    )}
                    </h6>

                    <div class="warning-project">
                        <i class="bi bi-kanban"></i>
                        ${ui.escapeHtml(project)}
                    </div>

                </div>

            </div>


            <span class="warning-level level-${level}">
                ${ui.escapeHtml(
        warning.warning_level || levelText
    )}
            </span>

        </div>


        <!-- DESCRIPTION -->
        <div class="warning-description">

            <i class="bi bi-chat-left-text"></i>

            <span>
                ${ui.escapeHtml(
        warning.description || ""
    )}
            </span>

        </div>


        <!-- STATISTICS -->
        <div class="warning-stats">


            <!-- PROGRESS -->
            <div class="warning-stat">

                <div class="warning-stat-label">
                    <i class="bi bi-graph-up-arrow"></i>
                    Progress
                </div>

                <div class="warning-stat-value">
                    ${progress.toFixed(1)}%
                </div>

            </div>


            <!-- TIME USED -->
            <div class="warning-stat">

                <div class="warning-stat-label">
                    <i class="bi bi-clock-history"></i>
                    Time Used
                </div>

                <div class="warning-stat-value">
                    ${timeUsed.toFixed(1)}%
                </div>

            </div>


            <!-- GAP -->
            <div class="warning-stat">

                <div class="warning-stat-label">
                    <i class="bi bi-activity"></i>
                    Gap
                </div>

                <div class="
                    warning-stat-value
                    ${gap > 0 ? "negative" : "positive"}
                ">
                    ${gap.toFixed(1)}%
                </div>

            </div>

        </div>

        <!-- FOOTER -->
        <div class="warning-footer">

            <!-- REMAINING -->
            <div class="warning-footer-item">

                <div class="warning-footer-icon">
                    <i class="bi bi-hourglass-split"></i>
                </div>

                <div>

                    <span class="warning-footer-label">
                        Remaining
                    </span>

                    <strong>
                        ${formatRemainingTime(
        remainingHours
    )}
                    </strong>

                </div>

            </div>

            <!-- HANDLER -->
            <div class="warning-footer-item">

                <div class="warning-footer-icon">
                    <i class="bi bi-person"></i>
                </div>

                <div>

                    <span class="warning-footer-label">
                        Handler
                    </span>

                    <strong title="${ui.escapeHtml(handler)}">
                        ${ui.escapeHtml(handler)}
                    </strong>

                </div>

            </div>

        </div>

    `;

    return card;
}



function formatRemainingTime(hours) {
    if (hours <= 0) {
        return "Deadline exceeded";
    }
    if (hours < 1) {
        return "Less than 1 hour remaining";
    }
    if (hours < 24) {
        return `${hours.toFixed(1)} hours remaining`;
    }
    const days = hours / 24;
    return `${days.toFixed(1)} days remaining`;
}

