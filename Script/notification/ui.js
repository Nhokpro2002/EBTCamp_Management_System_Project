const panel = document.querySelector("#activity-list");

// =====================================================
// Render Issue
// =====================================================

export function renderIssue(issue, prepend = false) {

    const created = new Date(issue.created_date || issue.createdDate || issue.created);

    const time = formatTime(created);
    const date = formatDate(created);


    const html = `

        <div class="activity-item" data-type="issue" data-project-id="${escapeHtml(issue.project ?? "")}" data-project-name="${escapeHtml(issue.project_name ?? "")}">

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
                                Type:
                            </span>

                            <span class="field-value issue-type">
                                ${escapeHtml(issue.type || "-")}
                            </span>

                            <span class="field-separator">
                                •
                            </span>

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
                    <span class="relation-badge badge-project">
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

        </div>

    `;


    panel.insertAdjacentHTML(prepend ? "afterbegin" : "beforeend", html);

}

function formatTime(date) {
    return date.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function formatDate(date) {
    return date.toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh"
    });
}

// =====================================================
// Helpers - Security
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
// Helpers - Stage
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
