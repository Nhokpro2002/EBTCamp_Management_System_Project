/* =====================================================
       CONSTANTS
       ===================================================== */
const COLLECTION_PROJECTS = "Projects";
const COLLECTION_TASKS = "Tasks";
const COLLECTION_USERS = "Users";
const COLLECTION_STAGES = "Stages";
const POCKETBASE_URL = "http://127.0.0.1:8090";

/* =====================================================
  Variables
  ===================================================== */

// projectData
let projectList = [];

// stage data
let stageListByProject = [];
let currentTaskID = 0; // task đang được chọn của stage nào đó

// task data
let taskListByStage = [];
let curentStageID = 0; // stage đang được chọn của dự án nào đó 

let network = null;

let userMap = {};


$(document).ready(function () {

    if (!checkAuthentication()) return;

    document.querySelector(".container-fluid").style.display = "block";

    // window.alert(window.innerWidth + " x " + window.innerHeight);
    // Spec: 1528 * 732;

    const currentPage = window.location.pathname;

    if (currentPage.includes('dashboard')) {
        document.getElementById('dashboard-link').classList.add('active');
    } else if (currentPage.includes('order')) {
        document.getElementById('order-link').classList.add('active');
    } else if (currentPage.includes('user')) {
        document.getElementById('user-link').classList.add('active');
    } else if (currentPage.includes('setting')) {
        document.getElementById('setting-link').classList.add('active');
    } else if (currentPage.includes('project')) {
        document.getElementById('project-link').classList.add('active');
    }

    changeIconAvatar();

    changeTopbarText();

    getProjectsData().then(async () => {
        renderProjectOptionList();
        initDefaultProject();

        if (projectList.length != 0) {
            await getStagesData(projectList[0].id);

            await getUsersData();

            renderWorkFlow(stageListByProject);

        }
    })

});

document.querySelectorAll('.menu-link').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.menu-link').forEach(el => {
            el.classList.remove('active');
        });

        this.classList.add('active');
    });
});

document.getElementById("logoutLink").addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "http://127.0.0.1:5500/Page/login.html";
});

function checkAuthentication() {
    const token = localStorage.getItem("token");
    if (!token || token.trim() === "") {
        Swal.fire({
            icon: 'warning',      // icon của popup: 'warning', 'error', 'success', 'info', 'question'
            title: 'Access Denied',
            text: 'You must log in to access this page',
            confirmButtonText: 'Go to Login'
        }).then(() => {
            window.location.href = "http://127.0.0.1:5500/Page/login.html"; // chuyển hướng sau khi user bấm OK
        });

        return false;
    }

    return true;
}

function changeIconAvatar() {
    const dropdownAvatar = document.querySelector('.dropdown img');
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!dropdownAvatar || !userData) return;

    dropdownAvatar.src =
        `${POCKETBASE_URL}/api/files/${COLLECTION_USERS}/${userData.id}/${userData.avatar}?t=${Date.now()}`;
}

function changeTopbarText() {
    const topbarText = document.querySelector('.topbar .text-muted');
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!topbarText || !userData) return;

    topbarText.textContent = `Welcome back, ${userData.employee_id} 👋`;
}

function renderProjectOptionList() {

    const select = document.getElementById("projectSelect");
    select.innerHTML = "";

    // add option mới từ API
    projectList.forEach(project => {
        const option = document.createElement("option");
        option.value = project.id;
        option.textContent = project.name;
        select.appendChild(option);
    });

}

function changeProjectStatusUI(status) {
    const el = document.getElementById("project-status");
    const map = {
        Done: {
            text: "Done",
            class: "bg-success"
        },
        Processing: {
            text: "Processing",
            class: "bg-warning text-dark"
        },
        Pending: {
            text: "Pending",
            class: "bg-secondary"
        }
    };

    const s = map[status] || map.pending;

    el.innerHTML = `
        <span class="badge ${s.class}">
            ${s.text}
        </span>
    `;
}

// function helper to convert date and time -> date/month
function formatDate(dateStr) {
    const d = new Date(dateStr);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");

    return `${day}/${month}`;
}

function renderWorkFlow(stageListByProject) {

    const container = document.getElementById("network");

    const nodeDataSet = stageListByProject.map(stage => ({
        id: stage.id,
        label: `${formatDate(stage.start_date)} - ${formatDate(stage.end_date)}\n${stage.name}`,
        font: { multi: true },
        shape: "dot",
        size: 30
    }));

    const nodes = new vis.DataSet(nodeDataSet);

    const edgeDataSet = stageListByProject
        .map((stage, index, arr) => {
            if (index === arr.length - 1) return null;

            return {
                from: stage.id,
                to: arr[index + 1].id,
                arrows: "to"
            };
        })
        .filter(Boolean);

    const edges = new vis.DataSet(edgeDataSet);

    const data = {
        nodes,
        edges
    };

    const options = {
        physics: false,
        edges: {
            smooth: false,
            arrows: {
                to: true
            }
        },
        layout: {
            hierarchical: {
                enabled: true,
                direction: "LR",
                levelSeparation: 200
            }
        },
        nodes: {
            shape: "dot",
            size: 30
        },
        physics: false
    };

    if (network !== null) {
        network.destroy();
    }

    network = new vis.Network(container, data, options);

    network.on("click", async function (params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            await getTasksData(nodeId);
            renderTasks();
        }
    });

}

document.getElementById("projectSelect").addEventListener("change", async function (e) {
    const selectedId = e.target.value;

    const project = projectList.find(p => p.id == selectedId);

    if (project) {
        // change status UI follow selected project
        changeProjectStatusUI(project.status);

        // class api to get stage list follow selected project
        await getStagesData(selectedId);

    }
});

function initDefaultProject() {
    const first = projectList[0];

    if (!first) return;

    document.getElementById("projectSelect").value = first.id;
    changeProjectStatusUI(first.status);
}


// API
async function getProjectsData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(
            `${POCKETBASE_URL}/api/collections/${COLLECTION_PROJECTS}/records`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        projectList = result.items || [];

    } catch (error) {
        console.log(error);
    }
}

// API
async function getStagesData(projectID) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(
            `${POCKETBASE_URL}/api/collections/${COLLECTION_STAGES}/records?filter=(project="${projectID}")`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        stageListByProject = result.items || [];

    } catch (error) {
        console.log(error);
    }
}

// API
async function getTasksData(stageID) {
    try {
        const token = localStorage.getItem("token");

        const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        };

        const tasksRes = await fetch(`${POCKETBASE_URL}/api/collections/${COLLECTION_TASKS}/records?filter=(stage="${stageID}")`, { headers });
        if (!tasksRes.ok) {
            throw new Error("Load data failed");
        }

        const tasks = await tasksRes.json();
        taskListByStage = tasks.items || [];
    } catch (error) {
        console.log(error);
    }

}

async function getUsersData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${POCKETBASE_URL}/api/collections/${COLLECTION_USERS}/records`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        result.items.forEach(user => {
            userMap[user.id] = user;
        });

    } catch (error) {

        console.log(error);
    }
}





function getStatusBadge(status) {

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



function renderTasks() {

    const tbody = document.getElementById("taskBody");

    if (!Array.isArray(taskListByStage)) {
        console.error("taskListByStage not array");
        return;
    }

    tbody.innerHTML = taskListByStage.map(task => {

        const handlers = task.handler || [];

        const avatarsHtml = handlers.map(handlerID => {

            const user = userMap?.[handlerID];

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
            <td class="task-start">${formatDate(task.start_date)}</td>
            <td class="task-end">${formatDate(task.end_date)}</td>
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
            title="Save">
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
}

function enableRowEdit(tr, taskId) {

    const task = taskListByStage.find(t => t.id === taskId);
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

    // Error
    tr.querySelector(".task-start").innerHTML =
        `<input type="date" class="form-control form-control-sm" value="${formatDate(task.start_date)}">`;

    // Error
    tr.querySelector(".task-end").innerHTML =
        `<input type="date" class="form-control form-control-sm" value="${formatDate(task.end_date)}">`;

    // init TomSelect sau khi DOM đã render
    setTimeout(() => {

        const select = document.getElementById(`handler-${task.id}`);

        if (!select) return;

        // add options
        Object.values(userMap).forEach(user => {
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
        if (!window.tomSelectInstances) {
            window.tomSelectInstances = {};
        }

        if (window.tomSelectInstances[task.id]) {
            window.tomSelectInstances[task.id].destroy();
        }

        window.tomSelectInstances[task.id] = new TomSelect(select, {
            plugins: ['remove_button'],
            hideSelected: true,
            placeholder: "Select Handler"
        });
    }, 0);
}


function renderMembersSelect(type) {  // type: "pic", "members", "handler"
    const select = document.getElementById(type);
    if (!select) return;

    // Xoá option cũ
    select.innerHTML = "";

    // Thêm option từ users.items
    Object.values(userMap).forEach(user => {
        const option = document.createElement("option");
        option.value = user.id;
        option.textContent = user.employee_id;
        select.appendChild(option);
    });

    // Nếu chưa có instance TomSelect cho select này thì tạo mới
    if (!window.tomSelectInstances[type]) {
        window.tomSelectInstances[type] = new TomSelect(`#${type}`, {
            plugins: ['remove_button'],
            hideSelected: true,
            create: false,
            placeholder: type === "pic" ? "Select PIC" :
                type === "members" ? "Select Members" :
                    "Select Handler",
        });
    } else {
        // Nếu đã có instance thì refresh options
        window.tomSelectInstances[type].clearOptions();
        Object.values(userMap).forEach(user => {
            window.tomSelectInstances[type].addOption({
                value: user.id,
                text: user.employee_id
            });
        });
        window.tomSelectInstances[type].refreshOptions(false);
    }
}


function cancelEditRow(tr, taskId) {

    if (window.tomSelectInstances?.[taskId]) {
        window.tomSelectInstances[taskId].destroy();
        delete window.tomSelectInstances[taskId];
    }

    const task = taskListByStage.find(t => t.id === taskId);
    if (!task) return;

    // name
    tr.querySelector(".task-name").textContent = task.name;

    // handler (nếu bạn không edit thì giữ nguyên hoặc render lại avatar)
    const handlers = task.handler || [];
    const avatarsHtml = handlers.map(handlerID => {

        const user = userMap?.[handlerID];

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
    tr.querySelector(".task-start").textContent = formatDate(task.start_date);

    // end date
    tr.querySelector(".task-end").textContent = formatDate(task.end_date);

    // remove edit mode class (nếu có)
    tr.classList.remove("editing");
}

// FIX
async function updateTask(taskID, updatedTaskData) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(
            `${POCKETBASE_URL}/api/collections/${COLLECTION_TASKS}/records/${taskID}`,
            {
                method: "PATCH",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedTaskData)
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // 🔥 update local data
        const index = taskListByStage.findIndex(t => t.id === taskID);
        if (index !== -1) {
            taskListByStage[index] = result;
        }

        // 🔥 re-render UI
        renderTasks();

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Update task successfully',
            showConfirmButton: false,
            timer: 2000
        });

        return result;

    } catch (error) {
        console.log(error);
    }
}

document.getElementById("taskBody").addEventListener("click", function (e) {

    const saveButton = e.target.closest(".btn-save-task");
    if (!saveButton) return;

    const tr = saveButton.closest("tr");
    const taskID = saveButton.dataset.id;

    const nameInput = tr.querySelector(".task-name input");
    const statusSelect = tr.querySelector(".task-status select");
    const percentInput = tr.querySelector(".task-percent input");
    const handlerSelect = window.tomSelectInstances?.[taskID];
    const startInput = tr.querySelector(".task-start input");
    const endInput = tr.querySelector(".task-end input");

    const updatedTaskData = {
        name: nameInput.value,
        status: statusSelect.value,
        percent: Number(percentInput.value),
        handler: handlerSelect ? handlerSelect.getValue() : [],
        start_date: startInput.value,
        end_date: endInput.value
    };

    updateTask(taskID, updatedTaskData); // api function to save task
});

document.getElementById("taskBody").addEventListener("click", function (e) {

    const editButton = e.target.closest(".btn-edit-task");
    if (!editButton) return;

    editButton.classList.toggle("active");

    const isActive = editButton.classList.contains("active");

    const taskId = editButton.dataset.id;
    const tr = editButton.closest("tr");

    if (isActive) {
        enableRowEdit(tr, taskId);   // vào chế độ edit
    } else {
        cancelEditRow(tr, taskId);   // thoát edit
    }
});