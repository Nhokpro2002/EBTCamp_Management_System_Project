import * as service from "./service.js";
import * as ui from "./ui.js";

import { URL_LOCAL } from "../config.js";

const pb = new PocketBase(URL_LOCAL);

const panel = document.querySelector("#activity-list");
const dateInput = document.querySelector("#filter-date");
const searchInput = document.querySelector("#search-notifications");
const projectSelect = document.querySelector("#projectSelect");
const pageSizeSelect = document.querySelector("#page-size");
const paginationInfo = document.querySelector("#pagination-info");
const previousPageButton = document.querySelector("#previous-page");
const nextPageButton = document.querySelector("#next-page");
let activityLoadSequence = 0;
let currentPage = 1;
let pageSize = Number(pageSizeSelect.value);

const token = localStorage.getItem("token");
if (token) {
    pb.authStore.save(token);
}

// =====================================================
// 1. State
// =====================================================

const userRoles = service.getCurrentUserRoles();


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
// Load initial data
// =====================================================

await loadActivity(todayStr);

subscribeRealtime();

dateInput.addEventListener("change", async (event) => {
    await loadActivity(event.target.value);
});

searchInput?.addEventListener("input", () => applyActivityFilters(true));
projectSelect?.addEventListener("change", () => applyActivityFilters(true));
pageSizeSelect?.addEventListener("change", () => {
    pageSize = Number(pageSizeSelect.value);
    applyActivityFilters(true);
});
previousPageButton?.addEventListener("click", () => {
    currentPage--;
    applyActivityFilters();
});
nextPageButton?.addEventListener("click", () => {
    currentPage++;
    applyActivityFilters();
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
        applyActivityFilters(true);
        searchInput.blur();
    }
});

panel.addEventListener("click", event => {
    if (event.target.closest("[data-retry-activity]")) {
        loadActivity(dateInput.value);
    }
});

// =====================================================
// 3. Load Issue Notifications
// Chỉ hiện issue có type phù hợp với role của user
// =====================================================

async function loadActivity(selectedDate) {
    const loadSequence = ++activityLoadSequence;
    currentPage = 1;
    panel.setAttribute("aria-busy", "true");
    panel.innerHTML = '<div class="activity-state" role="status"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang tải thông báo...</div>';
    paginationInfo.textContent = "0–0 / 0";
    previousPageButton.disabled = true;
    nextPageButton.disabled = true;
    try {
        if (!selectedDate) {
            showActivityState("Chọn ngày để xem thông báo.");
            return;
        }

        const { startOfDay, endOfDay } = getDateRange(selectedDate);
        const issues = await loadIssuesForDate(startOfDay, endOfDay);
        if (loadSequence !== activityLoadSequence) {
            return;
        }
        const activities = issues.items
            .filter(issue => service.isIssueForRoles(issue, userRoles))
            .map(issue => ({
                data: issue,
                date: getActivityDate(issue)
            }));

        activities.sort((first, second) => first.date - second.date);
        panel.innerHTML = "";
        activities.forEach(activity => ui.renderIssue(activity.data, true));
        if (!activities.length) {
            showActivityState("Không có thông báo nào trong ngày này.");
        }
        applyActivityFilters();
    } catch (error) {
        if (loadSequence !== activityLoadSequence) {
            return;
        }
        console.error("Failed to load notifications:", error);
        showActivityState(
            "Không tải được thông báo. Vui lòng thử lại.",
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
            ${retry ? '<button type="button" class="activity-retry-btn" data-retry-activity>Thử lại</button>' : ""}
        </div>
    `;
}

function applyActivityFilters(resetPage = false) {
    if (resetPage) {
        currentPage = 1;
    }
    const query = searchInput?.value.trim().toLocaleLowerCase() || "";
    const projectId = projectSelect?.value || "";
    const selectedProjectName = projectSelect?.selectedOptions[0]?.textContent
        .trim()
        .toLocaleLowerCase() || "";
    const matchingItems = [...panel.querySelectorAll(".activity-item")].filter(item => {
        const matchesProject = !projectId ||
            item.dataset.projectId === projectId ||
            item.dataset.projectName?.toLocaleLowerCase() === selectedProjectName;
        const matchesSearch =
            !query || item.textContent.toLocaleLowerCase().includes(query);
        return matchesProject && matchesSearch;
    });

    const totalPages = Math.max(1, Math.ceil(matchingItems.length / pageSize));
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const visibleItems = new Set(matchingItems.slice(startIndex, startIndex + pageSize));
    panel.querySelectorAll(".activity-item").forEach(item => {
        item.hidden = !visibleItems.has(item);
    });

    panel.querySelector("#activity-filter-empty")?.remove();
    if (panel.querySelector(".activity-item") && matchingItems.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.id = "activity-filter-empty";
        emptyState.className = "activity-state";
        emptyState.textContent = "Không có thông báo nào khớp bộ lọc.";
        panel.appendChild(emptyState);
    }
    const firstItem = matchingItems.length ? startIndex + 1 : 0;
    const lastItem = Math.min(startIndex + pageSize, matchingItems.length);
    paginationInfo.textContent = `${firstItem}–${lastItem} / ${matchingItems.length}`;
    previousPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
}

// =====================================================
// 4. Realtime
// =====================================================

function subscribeRealtime() {
    pb.collection("Issues").subscribe("*", event => {
        if (event.action !== "create") {
            return;
        }

        // Issue chỉ báo cho user có role phù hợp với type
        if (!service.isIssueForRoles(event.record, userRoles)) {
            return;
        }

        // Số trên sidebar do Script/notification/badge.js quản lý
        if (getBusinessDate(getActivityDate(event.record)) !== dateInput.value) {
            return;
        }

        // Thay thông báo "không có dữ liệu" bằng issue mới
        panel.querySelector(".activity-state")?.remove();
        ui.renderIssue(event.record, true);
        applyActivityFilters(true);
    });
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
