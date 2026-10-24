import * as service from "./service.js";
import * as ui from "./ui.js";
import { warningRecord } from "./state.js";

const pb = new PocketBase("http://127.0.0.1:8090");

const panel = document.querySelector("#activity-list");
const dateInput = document.querySelector("#filter-date");
const badgeCount = document.querySelector("#badge-count");
const searchInput = document.querySelector("#search-notifications");
const projectSelect = document.querySelector("#projectSelect");
const tabButtons = [...document.querySelectorAll("[data-tab]")];
let activeActivityTab = "all";
let activityLoadSequence = 0;

const token = localStorage.getItem("token");
if (token) {
    pb.authStore.save(token);
}

// =====================================================
// 1. State
// =====================================================

let newNotification = 0;


// =====================================================
// 2. Initialization
// =====================================================

const todayStr = getBusinessDate(new Date());

dateInput.value = todayStr;

try {
    await service.loadProjects();
} catch (error) {
    console.error("Failed to initialize project filter:", error);
}

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

deadlineButton?.addEventListener("click", openDeadlineDrawer);
closeButton?.addEventListener("click", closeDeadlineDrawer);
deadlineOverlay?.addEventListener("click", closeDeadlineDrawer);
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && deadlineDrawer?.classList.contains("active")) {
        closeDeadlineDrawer();
    }
});

// =====================================================
// Load initial data
// =====================================================

await loadActivity(todayStr);

subscribeRealtime();

dateInput.addEventListener("change", async (event) => {
    await loadActivity(event.target.value);
});

searchInput?.addEventListener("input", applyActivityFilters);
projectSelect?.addEventListener("change", applyActivityFilters);

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        activeActivityTab = button.dataset.tab;
        tabButtons.forEach(tab => {
            const isActive = tab === button;
            tab.classList.toggle("active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
        });
        applyActivityFilters();
    });
});

document.addEventListener("keydown", event => {
    const target = event.target;
    const isTypingTarget =
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") || target.isContentEditable);
    if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        searchInput?.focus();
    } else if (event.key === "Escape" && event.target === searchInput) {
        searchInput.value = "";
        applyActivityFilters();
        searchInput.blur();
    }
});

panel.addEventListener("click", event => {
    if (event.target.closest("[data-retry-activity]")) {
        loadActivity(dateInput.value);
    }
});

// =====================================================
// 3. Load Activity History
// =====================================================

async function loadActivity(selectedDate) {
    const loadSequence = ++activityLoadSequence;
    panel.setAttribute("aria-busy", "true");
    panel.innerHTML = '<div class="activity-state" role="status"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading activities...</div>';
    updateActivityCounts();
    try {
        if (!selectedDate) {
            showActivityState("Choose a date to view activities.");
            return;
        }

        const { startOfDay, endOfDay } = getDateRange(selectedDate);
        const dateFilter = `created >= "${startOfDay}" && created <= "${endOfDay}"`;
        const [notifications, issues] = await Promise.all([
            getAllActivityRecords("Notifications", {
                sort: "-created",
                filter: dateFilter
            }),
            loadIssuesForDate(startOfDay, endOfDay)
        ]);
        if (loadSequence !== activityLoadSequence) {
            return;
        }
        const activities = [
            ...notifications.items.map(notification => ({
                type: "project",
                data: notification,
                date: new Date(notification.created)
            })),
            ...issues.items.map(issue => ({
                type: "issue",
                data: issue,
                date: getActivityDate(issue)
            }))
        ];

        activities.sort((a, b) => a.date - b.date);
        panel.innerHTML = "";
        activities.forEach(activity => {
            if (activity.type === "project") {
                ui.renderNotification(activity.data, true);
            }
            else {
                ui.renderIssue(activity.data, true);
            }
        });
        if (!activities.length) {
            showActivityState("No activities found for this date.");
        }
        updateActivityCounts();
        applyActivityFilters();
    } catch (error) {
        if (loadSequence !== activityLoadSequence) {
            return;
        }
        console.error("Failed to load activity history:", error);
        showActivityState(
            "Failed to load activities. Please try again.",
            true
        );
    } finally {
        if (loadSequence === activityLoadSequence) {
            panel.setAttribute("aria-busy", "false");
        }
    }
}

async function getAllActivityRecords(collection, options) {
    const firstPage = await pb.collection(collection).getList(1, 100, options);
    const remainingPages = await Promise.all(
        Array.from(
            { length: Math.max(0, firstPage.totalPages - 1) },
            (_, index) => pb.collection(collection).getList(index + 2, 100, options)
        )
    );
    return {
        items: [
            ...firstPage.items,
            ...remainingPages.flatMap(page => page.items)
        ]
    };
}

async function loadIssuesForDate(startOfDay, endOfDay) {
    try {
        return await getAllActivityRecords("Issues", {
            sort: "-created_date",
            filter: `created_date >= "${startOfDay}" && created_date <= "${endOfDay}"`
        });
    } catch (customDateError) {
        try {
            return await getAllActivityRecords("Issues", {
                sort: "-created",
                filter: `created >= "${startOfDay}" && created <= "${endOfDay}"`
            });
        } catch (fallbackError) {
            console.warn("Issue date-field query failed:", customDateError);
            throw fallbackError;
        }
    }
}

function showActivityState(message, retry = false) {
    panel.innerHTML = `
        <div class="activity-state" role="${retry ? "alert" : "status"}">
            <span>${message}</span>
            ${retry ? '<button type="button" class="activity-retry-btn" data-retry-activity>Try again</button>' : ""}
        </div>
    `;
}

function updateActivityCounts() {
    const projectCount =
        panel.querySelectorAll('.activity-item[data-type="project"]').length;
    const issueCount =
        panel.querySelectorAll('.activity-item[data-type="issue"]').length;
    document.querySelector(".count-project").textContent = projectCount;
    document.querySelector(".count-issue").textContent = issueCount;
    document.querySelector(".count-all").textContent =
        projectCount + issueCount;
}

function applyActivityFilters() {
    const query = searchInput?.value.trim().toLocaleLowerCase() || "";
    const projectId = projectSelect?.value || "";
    let visibleCount = 0;

    panel.querySelectorAll(".activity-item").forEach(item => {
        const matchesTab =
            activeActivityTab === "all" ||
            item.dataset.type === activeActivityTab;
        const matchesProject =
            !projectId || item.dataset.projectId === projectId;
        const matchesSearch =
            !query || item.textContent.toLocaleLowerCase().includes(query);
        const isVisible = matchesTab && matchesProject && matchesSearch;

        item.hidden = !isVisible;
        if (isVisible) visibleCount++;
    });

    panel.querySelector("#activity-filter-empty")?.remove();
    if (panel.querySelector(".activity-item") && visibleCount === 0) {
        const emptyState = document.createElement("div");
        emptyState.id = "activity-filter-empty";
        emptyState.className = "activity-state";
        emptyState.textContent = "No activities match the selected filters.";
        panel.appendChild(emptyState);
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

        increaseNotificationCount();
        if (getRecordDate(collectionName, event.record) !== dateInput.value) {
            return;
        }

        if (collectionName === "Notifications") {
            ui.renderNotification(event.record, true);
        }
        else {
            ui.renderIssue(event.record, true);
        }
        updateActivityCounts();
        applyActivityFilters();
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
    const date = collectionName === "Notifications"
        ? new Date(record.created)
        : getActivityDate(record);
    return getBusinessDate(date);
}

function getActivityDate(record) {
    return new Date(record.created_date || record.createdDate || record.created);
}

function getBusinessDate(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
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
    deadlineDrawer.setAttribute("aria-hidden", "false");
    deadlineButton?.setAttribute("aria-expanded", "true");
    closeButton?.focus();
    return loadDeadlineWarnings();
}


function closeDeadlineDrawer() {
    deadlineDrawer.classList.remove("active");
    deadlineOverlay.classList.remove("active");
    deadlineDrawer.setAttribute("aria-hidden", "true");
    deadlineButton?.setAttribute("aria-expanded", "false");
    deadlineButton?.focus();
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
        console.error("Failed to load deadline warnings:", error);
        deadlineWarningCount.textContent = "Unable to load warnings";
        const countElement = document.querySelector(".count-system");
        if (countElement) {
            countElement.textContent = "!";
            countElement.title = "Unable to load deadline warnings";
        }
        deadlineWarningList.innerHTML = `
            <div class="activity-state deadline-error" role="alert">
                Failed to load deadline warnings. Please try again.
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
        countElement.removeAttribute("title");
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
