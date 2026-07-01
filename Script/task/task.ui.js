// Chỉ chứa các sự kiện như việc người dùng click chuột
// * Event -> Call function logic -> render UI
// Chỉ chứa hàm render UI


// ==================================================
// Change user avatar in dropdown
// ==================================================

import * as utils from "../utils/utils.js";
import { variableGlobal } from "../project.state.js";

const POCKETBASE_URL = "http://127.0.0.1:8090";
const COLLECTION_USERS = "users";


export function changeIconAvatar() {

    const $dropdownAvatar = $(".dropdown img");
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!$dropdownAvatar.length || !userData) return;

    const avatarUrl =
        `${POCKETBASE_URL}/api/files/users/${userData.id}/${userData.avatar}?t=${Date.now()}`;


    $dropdownAvatar.attr("src", avatarUrl);
}

// ==================================================
// Change topbar welcome text
// ==================================================
export function changeTopbarText() {

    const $topbarText = $(".topbar .text-muted");
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!$topbarText.length || !userData) return;


    $topbarText.text(
        `Welcome back, ${userData.employee_id} 👋`
    );
}

// ==================================================
// Render project option list
// ==================================================
export function renderProjectOptionList() {

    const $select = $("#projectSelect");

    $select.empty();

    variableGlobal.projectList.forEach(project => {

        const $option = $("<option>", {
            value: project.id,
            text: project.name
        });

        $select.append($option);
    });

}


export function renderStages(stageListByProject) {

    const workflow = document.getElementById("timeline-container");
    if (!workflow) return;
    workflow.innerHTML = "";

    stageListByProject.forEach((stage, index) => {

        const linkLine = document.createElement("div");
        linkLine.classList.add("timeline-line");

        const div = document.createElement("div");
        div.setAttribute("data-id", stage.id);

        let borderClass = "border-secondary";
        let badgeClass = "bg-secondary text-white";
        let textClass = "text-secondary";
        let bgColor = "#f8f9fa";

        switch (stage.status) {

            case "Processing":
                borderClass = "border-warning";
                badgeClass = "bg-warning text-dark";
                textClass = "text-warning";
                bgColor = "#fff8e1";
                linkLine.classList.add("bg-warning");
                break;

            case "Done":
                borderClass = "border-success";
                badgeClass = "bg-success text-white";
                textClass = "text-success";
                bgColor = "#e8f5e9";
                linkLine.classList.add("bg-success");
                break;

            case "Pending":
            default:
                borderClass = "border-secondary";
                badgeClass = "bg-secondary text-white";
                textClass = "text-secondary";
                bgColor = "#f5f5f5";
                linkLine.classList.add("bg-secondary");
                break;
        }

        div.classList.add(
            "stage-card",
            "p-3",
            "rounded-3",
            "border",
            "border-2",
            borderClass
        );

        div.style.backgroundColor = bgColor;

        div.innerHTML = `
            <div class="d-flex align-items-center justify-content-between ${textClass}">
    
    <div class="display-6 fw-bold">
        <span>${index + 1}</span>
    </div>

    <div class="d-flex gap-1 d-none stage-actions">
        <button
            class="btn btn-sm btn-outline-primary btn-edit-stage"
            title="Edit stage">
            <i class="bi bi-pencil"></i>
        </button>

        <button
            class="btn btn-sm btn-outline-danger btn-delete-stage"
            title="Delete stage">
            <i class="bi bi-trash"></i>
        </button>

    </div>

</div>

            <h5 class="${textClass} mb-1 text-truncate" title="${stage.name}">
                   ${stage.name}
            </h5>

            <hr class="my-1">

            <div class="mb-1">
                <div class="text-muted small">
                    Start Date
                </div>

                <div class="fw-bold fs-5 text-dark">
                    ${utils.formatDateDisplay(stage.start_date)}
                </div>
            </div>

            <div class="mb-1">
                <div class="text-muted small">
                    End Date
                </div>

                <div class="fw-bold fs-5 text-dark">
                    ${utils.formatDateDisplay(stage.end_date)}
                </div>
            </div>

            <div>
                <div class="text-muted small mb-2">
                    Status
                </div>

                <span class="badge rounded-pill px-3 py-2 ${badgeClass}">
                    ${stage.status}
                </span>
            </div>
        `;

        workflow.appendChild(div);

        if (index < variableGlobal.stageListByProject.length - 1) {
            workflow.appendChild(linkLine);
        }
    });
}

export function changeProjectStatusUI(status) {
    const map = {
        Done: ["Done", "bg-success"],
        Processing: ["Processing", "bg-warning text-dark"],
        Pending: ["Pending", "bg-secondary"]
    };

    const [text, className] = map[status] || map.Pending;

    $("#project-status").html(
        `<span class="badge ${className}">${text}</span>`
    );
}

export function renderTasks(taskListByStage) {

    const $tbody = $("#taskBody");

    if (!Array.isArray(taskListByStage)) {
        console.error("taskListByStage not array");
        return;
    }

    const html = taskListByStage.map(task => {

        const handlers = task.handler || [];

        const avatarsHtml = handlers.map(handlerID => {

            const user = variableGlobal.userMap?.[handlerID];

            const avatarUrl = user?.avatar
                ? `${POCKETBASE_URL}/api/files/${COLLECTION_USERS}/${user.id}/${user.avatar}`
                : "https://i.pravatar.cc/40";

            return `
                <img
                    src="${avatarUrl}"
                    title="${user?.employee_id || ''}"
                    style="
                        width:28px;
                        height:28px;
                        border-radius:50%;
                        object-fit:cover;
                        border:2px solid white;
                        margin-left:-8px;
                    "
                />
            `;
        }).join('');

        return `
        <tr>
            <td class="task-name">${task.name}</td>
            <td class="task-handler">${avatarsHtml}</td>
            <td class="task-status">${getStatusBadge(task.status)}</td>
            <td class="task-percent">${task.percent}</td>
            <td class="task-start">${utils.formatDateDisplay(task.start_date)}</td>
            <td class="task-end">${utils.formatDateDisplay(task.end_date)}</td>

            <td class="task-action-button">
                <div class="d-flex gap-1">

                    <button
                        class="btn btn-sm btn-outline-primary btn-edit-task"
                        data-id="${task.id}"
                        title="Edit Task">
                        <i class="bi bi-pencil"></i>
                    </button>

                    <button
                        class="btn btn-sm btn-outline-info btn-view-more-task"
                        data-id="${task.id}"
                        title="View More">
                        <i class="bi bi-eye"></i>
                    </button>

                    <button
                        class="btn btn-sm btn-outline-success btn-save-task"
                        data-id="${task.id}"
                        title="Save"
                        disabled>
                        <i class="bi bi-floppy"></i>
                    </button>

                    <button
                        class="btn btn-sm btn-outline-danger btn-delete-task"
                        data-id="${task.id}"
                        title="Delete Task">
                        <i class="bi bi-trash"></i>
                    </button>

                </div>
            </td>
        </tr>
        `;
    }).join('');
    $tbody.html(html);
}

export function getStatusBadge(status) {
    switch (status) {
        case "Done":
            return `<span class="badge bg-success badge-status">${status}</span>`;
        case "Processing":
            return `<span class="badge bg-warning badge-status">${status}</span>`;
        case "Problem":
            return `<span class="badge bg-danger badge-status">${status}</span>`;
        default:
            return `<span class="badge bg-secondary badge-status">${status}</span>`;
    }
}

function renderMembersSelect(type) {  // type: "pic", "members", "handler"

    const $select = $(`#${type}`);
    if (!$select.length) return;

    // Xoá option cũ
    $select.empty();

    // Thêm option từ userMap
    Object.values(variableGlobal.userMap).forEach(user => {
        const $option = $("<option>", {
            value: user.id,
            text: user.employee_id
        });

        $select.append($option);
    });

    // Nếu chưa có instance TomSelect thì tạo mới
    // ! Error
    if (!variableGlobal.tomSelectInstances[type]) {

        variableGlobal.tomSelectInstances[type] = new TomSelect(`#${type}`, {
            plugins: ['remove_button'],
            hideSelected: true,
            create: false,
            placeholder:
                type === "pic" ? "Select PIC" :
                    type === "members" ? "Select Members" :
                        "Select Handler",
        });

    } else {

        // Nếu đã có instance thì refresh options
        const instance = variableGlobal.tomSelectInstances[type];

        instance.clearOptions();

        Object.values(variableGlobal.userMap).forEach(user => {
            instance.addOption({
                value: user.id,
                text: user.employee_id
            });
        });

        instance.refreshOptions(false);
    }
}

export function enableStageEditMode(stageId) {

    const stage = variableGlobal.stageListByProject.find(s => s.id == stageId);
    if (!stage) return;

    const card = document.querySelector(`[data-id="${stageId}"]`).closest(".stage-card");

    if (!card) return;

    card.innerHTML = `
        <div class="mb-2">
            <label class="text-muted small">Stage Name</label>
            <input class="form-control form-control-sm" id="stage-name" value="${stage.name}">
        </div>

        <div class="mb-2">
            <label class="text-muted small">Start Date</label>
            <input type="date" class="form-control form-control-sm" id="stage-start-date" value="${stage.start_date}">
        </div>

        <div class="mb-2">
            <label class="text-muted small">End Date</label>
            <input type="date" class="form-control form-control-sm" id="stage-end-date" value="${stage.end_date}">
        </div>

        <div class="mb-3">
            <label class="text-muted small">Status</label>
            <select class="form-select form-select-sm" id="stage-status">
                <option value="Pending" ${stage.status === "Pending" ? "selected" : ""}>Pending</option>
                <option value="Processing" ${stage.status === "Processing" ? "selected" : ""}>Processing</option>
                <option value="Done" ${stage.status === "Done" ? "selected" : ""}>Done</option>
            </select>
        </div>

        <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-success btn-save-stage">
                Save
            </button>

            <button type="button" class="btn btn-sm btn-secondary btn-return-stage">
                Cancel
            </button>
        </div>
    `;
}

export function enableTaskEditMode(tr, taskId) {

    tr.classList.add("editing");

    tr.querySelector(".btn-save-task").disabled = false;

    const task = variableGlobal.taskListByStage.find(t => t.id === taskId);
    if (!task) return;

    // name
    tr.querySelector(".task-name").innerHTML =
        `<input class="form-control form-control-sm" value="${task.name}">`;

    // status
    tr.querySelector(".task-status").innerHTML = `
        <select class="form-select form-select-sm">
            <option ${task.status === "Done" ? "selected" : ""}>Done</option>
            <option ${task.status === "Processing" ? "selected" : ""}>Processing</option>
            <option ${task.status === "Problem" ? "selected" : ""}>Problem</option>
        </select>
    `;

    // percent
    tr.querySelector(".task-percent").innerHTML =
        `<input type="number" class="form-control form-control-sm" value="${task.percent}">`;

    // handler (MULTI SELECT)
    tr.querySelector(".task-handler").innerHTML = `
        <select id="handler-${task.id}" multiple placeholder="Select Handler"></select>
    `;

    tr.querySelector(".task-start").innerHTML =
        `<input type="date" class="form-control form-control-sm" value="${utils.formatDateInput(task.start_date)}">`;

    tr.querySelector(".task-end").innerHTML =
        `<input type="date" class="form-control form-control-sm" value="${utils.formatDateInput(task.end_date)}">`;

    // init TomSelect sau khi DOM đã render
    setTimeout(() => {

        const select = document.getElementById(`handler-${task.id}`);

        if (!select) return;

        // add options
        Object.values(variableGlobal.userMap).forEach(user => {
            const option = document.createElement("option");
            option.value = user.id;
            option.textContent = user.employee_id;

            // preselect nếu có
            if (task.handler?.includes(user.id)) {
                option.selected = true;
            }

            select.appendChild(option);
        });

        // init TomSelect
        if (!variableGlobal.tomSelectInstances) {
            variableGlobal.tomSelectInstances = {};
        }

        if (variableGlobal.tomSelectInstances[task.id]) {
            variableGlobal.tomSelectInstances[task.id].destroy();
        }

        variableGlobal.tomSelectInstances[task.id] = new TomSelect(select, {
            plugins: ['remove_button'],
            hideSelected: true,
            placeholder: "Select Handler"
        });
    }, 0);
}

export function disableTaskEditMode(tr, taskID) {

    tr.classList.remove("editing");

    tr.querySelector(".btn-save-task").disabled = true;

    if (variableGlobal.tomSelectInstances?.[taskID]) {
        variableGlobal.tomSelectInstances[taskID].destroy();
        delete variableGlobal.tomSelectInstances[taskID];
    }

    const task = variableGlobal.taskListByStage.find(t => t.id === taskID);
    if (!task) return;


    // name
    tr.querySelector(".task-name").textContent = task.name;

    // handler (nếu bạn không edit thì giữ nguyên hoặc render lại avatar)
    const handlers = task.handler || [];
    const avatarsHtml = handlers.map(handlerID => {

        const user = variableGlobal.userMap?.[handlerID];

        const avatarUrl = user?.avatar
            ? `${POCKETBASE_URL}/api/files/${COLLECTION_USERS}/${user.id}/${user.avatar}`
            : "https://i.pravatar.cc/40";

        return `
            <img
                src="${avatarUrl}"
                title="${user?.employee_id || ''}"
                style="
                    width:28px;
                    height:28px;
                    border-radius:50%;
                    object-fit:cover;
                    border:2px solid white;
                    margin-left:-8px;
                "
            />
        `;
    }).join('');

    tr.querySelector(".task-handler").innerHTML = avatarsHtml;

    // status
    tr.querySelector(".task-status").innerHTML = getStatusBadge(task.status);

    // percent
    tr.querySelector(".task-percent").textContent = task.percent;

    // start date
    tr.querySelector(".task-start").textContent = utils.formatDateDisplay(task.start_date);

    // end date
    tr.querySelector(".task-end").textContent = utils.formatDateDisplay(task.end_date);

    // remove edit mode class (nếu có)
    tr.classList.remove("editing");
}

export function openCreateProjectPopup() {
    document.getElementById("overlay-create-project").style.display = "flex";
    document.body.style.overflow = "hidden";
    renderMembersSelect("pic");
    renderMembersSelect("members");
}


function resetCreateProjectForm() {
    $("#project-name, #start-date, #end-date").val("");
    $("#pic, #members").empty();
    variableGlobal.tomSelectInstances?.pic?.clear(true);
    variableGlobal.tomSelectInstances?.members?.clear(true);
}

export function closeCreateProjectPopup() {
    document.getElementById("overlay-create-project").style.display = "none";
    document.body.style.overflow = "auto";
    resetCreateProjectForm();
}

export function renderProjectItemList() {
    const $tbody = $("#itemBody");
    variableGlobal.projectItemList.push({
        model: "",
        name: "",
        code: "",
        required: 0,
        stock: 0,
        purchase: 0
    });

    const html = variableGlobal.projectItemList.map((item, index) => `
        <tr data-index="${index}">

            <td>
                <input class="form-control form-control-sm item-model"
                       value="${item.model || ''}"
                       readonly
                       data-index="${index}">
            </td>

            <td>
                <input class="form-control form-control-sm item-name"
                       value="${item.name || ''}"
                       readonly>
            </td>

            <td>
                <input class="form-control form-control-sm item-code"
                       value="${item.code || ''}"
                       readonly>
            </td>

            <td>
                <input type="number" class="form-control form-control-sm item-required"
                       value="${item.required || 0}">
            </td>

            <td>
                <input type="number" class="form-control form-control-sm item-stock"
                       value="${item.stock || 0}">
            </td>

            <td>
                <input type="number" class="form-control form-control-sm item-purchase"
                       value="${item.purchase || 0}">
            </td>

            <td>
                <button class="btn btn-sm btn-danger btn-delete-item"
                        data-index="${index}">
                    Delete
                </button>
            </td>

        </tr>
    `).join('');

    $tbody.html(html);
}

