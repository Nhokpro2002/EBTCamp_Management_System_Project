const panel = document.querySelector("#activity-list");

export function renderProgressChange(notification) {

    const before =
        Number(notification.progress_before);

    const updated =
        Number(notification.progress_updated);


    if (before === updated) {
        return "";
    }


    const isUp =
        updated > before;


    const cssClass =
        isUp
            ? "change-up"
            : "change-down";


    const arrowIcon =
        isUp
            ? '<i class="bi bi-arrow-up-short"></i>'
            : '<i class="bi bi-arrow-down-short"></i>';


    return `

        <span class="field-separator">
            •
        </span>

        <span class="field-label">
            Progress:
        </span>

        <span class="field-value">
            ${formatProgress(before)}
        </span>

        <span class="field-change ${cssClass}">
            ${arrowIcon}
            ${formatProgress(updated)}
        </span>

    `;
}

// =====================================================
// 7. Notification Changes
// =====================================================

export function renderDurationChange(notification) {

    const before =
        Number(notification.duration_before);

    const updated =
        Number(notification.duration_updated);


    if (before === updated) {
        return "";
    }


    const isUp = updated > before;

    const cssClass =
        isUp
            ? "change-up"
            : "change-down";


    const arrowIcon =
        isUp
            ? '<i class="bi bi-arrow-up-short"></i>'
            : '<i class="bi bi-arrow-down-short"></i>';


    const difference =
        Math.abs(updated - before);


    return `

        <span class="field-separator">
            •
        </span>

        <span class="field-label">
            Duration:
        </span>

        <span class="field-value">
            ${before}
        </span>

        <span class="field-change ${cssClass}">
            ${arrowIcon}
            ${difference} days
        </span>

    `;
}

// =====================================================
// 6. Render Issue
// =====================================================

export function renderIssue(issue) {

    const created = new Date(issue.created_date);

    const time = formatTime(created);
    const date = formatDate(created);


    const html = `

        <div class="activity-item">

            <!-- Activity -->
            <div class="col-activity">

                <div class="activity-main">

                    <div class="activity-content">


                        <div class="activity-header">
    <span class="activity-title issue-title">
        <i class="bi bi-exclamation-triangle-fill issue-icon"></i>
        New Issue
    </span>
</div>


                        <div class="activity-desc">

                            <strong>
                                ${escapeHtml(
        issue.title ?? "-"
    )}
                            </strong>

                            has been raised.

                        </div>


                        <div class="activity-fields">


                            <span class="field-label">
                                Stage:
                            </span>

                            <span class="stage-badge ${getStageClass(issue.related_stage)}">
                                ${escapeHtml(
        issue.related_stage ?? "-"
    )}
                            </span>


                            <span class="field-separator">
                                •
                            </span>


                            <span class="field-label">
                                Task:
                            </span>

                            <span class="field-value">
                                ${escapeHtml(
        issue.related_task ?? "-"
    )}
                            </span>
                            <span class="field-separator">
                                •
                            </span>
                            <span class="field-label">
                                Posted by:
                            </span>
                            <span class="updated-by">
                                ${escapeHtml(
        issue.reporter ??
        "Unknown"
    )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>


            <!-- Related -->
            <div class="col-related">
                <div class="activity-relation">
                    <span class="relation-badge badge-issue">
                    ${escapeHtml(issue.project_name || "")}
                    </span>
                </div>
            </div>

            <!-- Time -->
            <div class="col-time">
                <div class="activity-meta">
                    <div class="activity-time">
                        ${time}
                    </div>
                    <div class="activity-date">
                        ${date}
                    </div>
                </div>
            </div>

            <!-- Action -->
            <div class="col-action">
                <button class="activity-action-btn">
                    <i class="bi bi-three-dots-vertical"></i>
                </button>
            </div>

        </div>

    `;


    panel.insertAdjacentHTML(
        "beforeend",
        html
    );

}


// =====================================================
// 5. Render Notification
// =====================================================

export function renderNotification(notification) {

    const created = new Date(notification.created);

    const time = formatTime(created);
    const date = formatDate(created);


    // ---------------------------------------------
    // Duration
    // ---------------------------------------------

    const durationHtml =
        renderDurationChange(notification);


    // ---------------------------------------------
    // Progress
    // ---------------------------------------------

    const progressHtml =
        renderProgressChange(notification);


    // ---------------------------------------------
    // Project / type
    // ---------------------------------------------

    const type =
        (notification.project_name || "project")
            .toLowerCase();


    const html = `

        <div class="activity-item">

            <!-- Activity -->
            <div class="col-activity">

                <div class="activity-main">

                    <div class="activity-content">

                        <div class="activity-header">
    <span class="activity-title">
        <i class="bi bi-graph-up progress-icon"></i>
        Task Updated
    </span>
</div>


                        <div class="activity-desc">

                            <strong>
                                ${escapeHtml(
        notification.name ??
        "Design task 1"
    )}
                            </strong>

                            has been updated.

                        </div>


                        <div class="activity-fields">

                            <span class="field-label">
                                Stage:
                            </span>

                            <span class="stage-badge ${getStageClass(notification.stage)}">
                                ${escapeHtml(
        notification.stage ?? "-"
    )}
                            </span>

                            ${durationHtml}

                            ${progressHtml}


                            <span class="field-separator">
                                •
                            </span>


                            <span class="field-label">
                                Updated by:
                            </span>

                            <span class="updated-by">
                                ${escapeHtml(
        notification.updated_by ??
        "Unknown"
    )}
                            </span>

                        </div>

                    </div>

                </div>

            </div>


            <!-- Related -->
            <div class="col-related">

                <div class="activity-relation">
                    <span class="relation-badge badge-${type}">
                        ${capitalize(type)}
                    </span>
                </div>

            </div>


            <!-- Time -->
            <div class="col-time">

                <div class="activity-meta">

                    <div class="activity-time">
                        ${time}
                    </div>

                    <div class="activity-date">
                        ${date}
                    </div>

                </div>

            </div>


            <!-- Action -->
            <div class="col-action">

                <button class="activity-action-btn">

                    <i class="bi bi-three-dots-vertical"></i>

                </button>

            </div>

        </div>

    `;


    panel.insertAdjacentHTML(
        "beforeend",
        html
    );

}

function formatTime(date) {
    return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function formatDate(date) {
    return date.toLocaleDateString("vi-VN");
}

// =====================================================
// 9. Helpers - Format
// =====================================================
function formatProgress(value) {
    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {
        return "-";
    }

    value = Number(value);

    if (value <= 1) {
        return Math.round(
            value * 100
        ) + "%";
    }
    return value + "%";
}

// =====================================================
// 11. Helpers - Security
// =====================================================

export function escapeHtml(value) {
    return String(value ?? "")
        .replace(/[&<>"']/g, char => ({

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));
}

// =====================================================
// 10. Helpers - Stage
// =====================================================
function getStageClass(stage) {
    switch (stage?.toLowerCase()) {
        case "design":
            return "stage-badge-design";
        case "mechanical":
            return "stage-badge-mechanical";
        case "assembly":
            return "stage-badge-assembly";
        case "electric":
            return "stage-badge-electric";
        case "program":
            return "stage-badge-program";
        default:
            return "stage-badge-default";
    }
}

function capitalize(value) {
    if (!value) {
        return "";
    }
    return value.charAt(0).toUpperCase()
        + value.slice(1);
}
