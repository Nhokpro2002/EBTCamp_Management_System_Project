import * as api from "../services/generic.api.js";
import { taskData, warningRecord } from "./state.js";
import { URL_LOCAL } from "../config.js";

// =====================================================
// COLLECTIONS
// =====================================================
const COLLECTION_PROJECTS = "Projects";
const COLLECTION_NOTIFICATIONS = "Notifications";
const COLLECTION_ISSUES = "Issues";
const COLLECTION_TASKS = "Tasks";

export async function loadProjects() {
    const projectSelect = document.getElementById("projectSelect");

    if (!projectSelect) return;

    try {
        const projects = await api.getRecords(COLLECTION_PROJECTS);

        projectSelect.innerHTML = `
            <option value="" selected>Select your project</option>
        `;

        projects.forEach(project => {
            const option = document.createElement("option");

            option.value = project.id;
            option.textContent = project.name;

            projectSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Failed to load projects:", error);
    }
}

export async function loadIssueData(projectID) {
    try {
        const result = await api.getRecordsFilter(
            COLLECTION_ISSUES,
            "project",
            projectID
        );
        issueData.issue = result;

    } catch (error) {
        console.error(error);
    }
}

export async function loadNotificationData(projectID) {
    try {
        const result = await api.getRecordsFilter(
            COLLECTION_NOTIFICATIONS,
            "project",
            projectID
        );
        issueData.issue = result;

    } catch (error) {
        console.error(error);
    }
}

export async function loadTaskNotDone() {
    try {
        const token = localStorage.getItem("token");
        const filter = encodeURIComponent("progress < 1");
        const url =
            `${URL_LOCAL}/api/collections/${COLLECTION_TASKS}/records` +
            `?filter=${filter}`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!res.ok) {
            throw new Error("Failed to load tasks");
        }
        const data = await res.json();
        taskData.tasks = data.items || [];

        // Reset warning list
        warningRecord.warnings = [];
        for (const task of taskData.tasks) {
            const warning = calculateIssueLevel(task);
            // Không có vấn đề
            if (!warning) {
                continue;
            }
            console.log(
                `[LEVEL ${warning.level}]`,
                task.name,
                warning
            );
            const warningData = raiseWarning(
                task,
                warning
            );
            warningRecord.warnings.push(warningData);
        }

        console.log(
            "Warnings:",
            warningRecord.warnings
        );

    } catch (error) {

        console.error(
            "loadTaskNotDone error:",
            error
        );

    }
}

function calculateIssueLevel(task) {

    const now = new Date();
    const startDate = new Date(task.start_date);

    // duration: số ngày
    const durationMs =
        Number(task.duration) * 24 * 60 * 60 * 1000;

    if (
        isNaN(startDate.getTime()) ||
        !durationMs
    ) {
        return null;
    }

    const endDate =
        new Date(startDate.getTime() + durationMs);

    // ==========================================
    // PROGRESS TRONG DB: 0 -> 1
    // ==========================================

    const progress = Number(task.progress) || 0;

    // Chuyển sang % để tính toán
    const progressPercent = progress * 100;


    // Chưa bắt đầu
    if (now < startDate) {
        return null;
    }

    // Đã hoàn thành
    if (progress >= 1) {
        return null;
    }


    // ==========================================
    // % THỜI GIAN ĐÃ DÙNG
    // ==========================================

    const totalTime =
        endDate.getTime() - startDate.getTime();

    const elapsedTime =
        now.getTime() - startDate.getTime();

    let timeUsedPercent =
        (elapsedTime / totalTime) * 100;

    timeUsedPercent = Math.min(
        Math.max(timeUsedPercent, 0),
        100
    );


    // ==========================================
    // ĐỘ LỆCH
    // ==========================================

    const gap =
        timeUsedPercent - progressPercent;


    // ==========================================
    // THỜI GIAN CÒN LẠI
    // ==========================================

    const remainingMs =
        endDate.getTime() - now.getTime();

    const remainingHours =
        remainingMs / (1000 * 60 * 60);


    // ==========================================
    // LEVEL 3 - KHẨN CẤP
    // ==========================================

    if (
        gap > 30 ||
        (remainingHours < 12 && progressPercent < 80)
    ) {

        return {
            level: 3,
            severity: "critical",
            color: "red",

            timeUsedPercent,
            progress: progressPercent,
            gap,
            remainingHours,

            message:
                `Công việc "${task.name}" đang chậm tiến độ nghiêm trọng. ` +
                `Thời gian đã sử dụng ${timeUsedPercent.toFixed(1)}% ` +
                `nhưng tiến độ mới đạt ${progressPercent.toFixed(1)}%.`
        };
    }


    // ==========================================
    // LEVEL 2 - CẢNH BÁO
    // ==========================================

    if (
        gap >= 15 &&
        gap <= 30
    ) {

        return {
            level: 2,
            severity: "warning",
            color: "orange",

            timeUsedPercent,
            progress: progressPercent,
            gap,
            remainingHours,

            message:
                `Cảnh báo: Công việc "${task.name}" đang chậm tiến độ. ` +
                `Thời gian đã sử dụng ${timeUsedPercent.toFixed(1)}% ` +
                `nhưng tiến độ mới đạt ${progressPercent.toFixed(1)}%.`
        };
    }


    // ==========================================
    // LEVEL 1 - NHẮC NHỞ
    // ==========================================

    if (
        gap >= 5 &&
        gap < 15
    ) {

        return {
            level: 1,
            severity: "notice",
            color: "green",

            timeUsedPercent,
            progress: progressPercent,
            gap,
            remainingHours,

            message:
                `Công việc "${task.name}" đang hơi chậm một chút ` +
                `so với kế hoạch, bạn nhớ tăng tốc nhé!`
        };
    }


    return null;
}

export function raiseWarning(task, issue) {
    const warningData = {
        task_name: task.name,
        warning_level:
            getWarningTitle(issue.level),
        description:
            issue.message,
        level:
            issue.level,
        severity:
            issue.severity,
        time_used_percent:
            Number(issue.timeUsedPercent.toFixed(2)),
        progress:
            Number(issue.progress.toFixed(2)),
        gap:
            Number(issue.gap.toFixed(2)),
        remaining_hours:
            Number(issue.remainingHours.toFixed(2)),
        status: "open",
        project:
            task.project_name,
        handler: task.createdBy
    };
    return warningData;
}


function getWarningTitle(level) {
    switch (level) {
        case 1:
            return "Task đang chậm tiến độ";
        case 2:
            return "Cảnh báo chậm tiến độ";
        case 3:
            return "Khẩn cấp - Task chậm tiến độ";
        default:
            return "Task Issue";
    }
}

