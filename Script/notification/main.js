
const pb = new PocketBase("http://127.0.0.1:8090");

const panel = document.querySelector("#activity-list");

// =====================================================
// Start
// =====================================================

await loadNotifications();

subscribeNotifications();


// =====================================================
// Load history
// =====================================================
async function loadNotifications() {
    try {
        const result = await pb.collection("Notifications").getList(1, 50, {
            sort: "-created"
        });
        result.items
            .reverse()
            .forEach(renderNotification);
    }
    catch (error) {
        console.error(error);
    }
}


// =====================================================
// Realtime
// =====================================================
function subscribeNotifications() {
    pb.collection("Notifications").subscribe("*", (e) => {
        if (e.action !== "create")
            return;
        renderNotification(e.record);
    });
}


// =====================================================
// Render Notification
// =====================================================
function renderNotification(notification) {
    const created = new Date(notification.created);
    const time = created.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit"
    });
    const date = created.toLocaleDateString("vi-VN");

    // -------------------------
    // Changed fields
    // -------------------------
    const durationChanged =
        Number(notification.duration_before) !==
        Number(notification.duration_updated);

    const progressChanged =
        Number(notification.progress_before) !==
        Number(notification.progress_updated);


    // -------------------------
    // Duration
    // -------------------------
    let durationHtml = "";
    if (durationChanged) {
        const css =
            Number(notification.duration_updated) >
                Number(notification.duration_before)
                ? "change-up"
                : "change-down";

        durationHtml = `

                <div class="field-name">
                    Duration
                </div>

                <div class="field-value">

                    <span class="change-before">
                        ${notification.duration_before}
                    </span>

                    <i class="bi bi-arrow-right change-arrow"></i>

                    <span class="${css}">
                        ${notification.duration_updated}
                    </span>

                    days

                </div>

            `;
    }


    // -------------------------
    // Progress
    // -------------------------

    let progressHtml = "";

    if (progressChanged) {

        const css =
            Number(notification.progress_updated) >
                Number(notification.progress_before)
                ? "change-up"
                : "change-down";

        progressHtml = `

                <div class="field-name">
                    Progress
                </div>

                <div class="field-value">

                    <span class="change-before">
                        ${formatProgress(notification.progress_before)}
                    </span>

                    <i class="bi bi-arrow-right change-arrow"></i>

                    <span class="${css}">
                        ${formatProgress(notification.progress_updated)}
                    </span>

                </div>

            `;
    }


    // -------------------------
    // HTML
    // -------------------------

    const html = `

            <div class="activity-item">

                <div class="activity-left">

                    <div class="activity-icon">
                        <i class="bi bi-pencil-square"></i>
                    </div>


                    <div class="activity-content">

                        <div class="activity-title">
                            Task Updated
                        </div>

                        <div class="activity-desc">

                            <strong>
                                ${notification.name}
                            </strong>

                            has been updated.

                        </div>


                        <div class="activity-fields">

                            <div class="field-name">
                                Stage
                            </div>

                            <div class="field-value">
                                <span class="stage-badge ${getStageClass(notification.stage)}">
                                    ${notification.stage ?? "-"}
                                </span>
                            </div>


                            ${durationHtml}

                            ${progressHtml}

                            <div class="field-name">
                                Updated by
                            </div>

                            <div class="field-value">
                                <span class="updated-by">
                                    ${notification.updated_by ?? "Unknown"}
                                </span>
                            </div>

                        </div>

                    </div>

                </div>


                <div class="activity-right">

                    <div class="activity-time">
                        ${time}
                    </div>

                    <div class="activity-date">
                        ${date}
                    </div>

                </div>

            </div>

        `;

    panel.insertAdjacentHTML(
        "afterbegin",
        html
    );

}


// =====================================================
// Helpers
// =====================================================

function formatProgress(value) {
    if (value === null || value === undefined)
        return "-";
    value = Number(value);
    if (value <= 1)
        return Math.round(value * 100) + "%";
    return value + "%";
}


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



