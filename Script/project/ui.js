import * as utils from "../utils/utils.js";
import { URL_LOCAL } from "../config.js";

// =========================
// DOM ELEMENTS
// =========================
const projectGrid = document.getElementById("projectGrid");
const emptyState = document.getElementById("emptyState");
const paginationContainer = document.getElementById("pagination");
const createProjectOverlay = document.getElementById("overlay-create-project");

const DEFAULT_PROJECT_IMAGE =
    "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1000&q=85";

let picSelectInstance = null;

// ==================================================
// Project Page
// ==================================================

/**
 * Render project cards và pagination của trang hiện tại.
 */
export function renderProjectPage({ filteredProjects, currentPage, pageSize }) {
    renderProjectCards(filteredProjects, currentPage, pageSize);
    renderPagination(filteredProjects.length, currentPage, pageSize);
}

function renderProjectCards(data, currentPage, pageSize) {
    const start = (currentPage - 1) * pageSize;
    const pageData = data.slice(start, start + pageSize);

    if (!pageData.length) {
        projectGrid.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";
    projectGrid.innerHTML = pageData.map(renderProjectCard).join("");
}

function getProjectImageUrl(project) {
    return project.image_project
        ? `${URL_LOCAL}/api/files/Projects/${project.id}/${encodeURIComponent(project.image_project)}`
        : DEFAULT_PROJECT_IMAGE;
}

function renderProjectCard(project) {
    return `
        <article class="project-card" data-name="${project.name}">

            <div class="project-image-wrap">
                <img
                    class="project-image"
                    src="${getProjectImageUrl(project)}"
                    alt="${project.name}"
                    loading="lazy"
                >
            </div>

            <div class="project-body">

                <div class="project-title-row">
                    <div class="project-icon">
                        <i class="bi bi-robot"></i>
                    </div>

                    <div>
                        <h2 class="project-name">${project.name}</h2>
                    </div>
                </div>

                <div class="project-dates">

                    <div class="date-item">
                        <i class="bi bi-calendar3 date-icon"></i>
                        <div>
                            <div class="date-label">Ngày bắt đầu</div>
                            <div class="date-value">
                                ${utils.formatDateDisplay(project.start_date)}
                            </div>
                        </div>
                    </div>

                    <div class="date-item">
                        <i class="bi bi-calendar-check date-icon"></i>
                        <div>
                            <div class="date-label">Ngày kết thúc</div>
                            <div class="date-value">
                                ${utils.formatDateDisplay(project.end_date)}
                            </div>
                        </div>
                    </div>

                </div>

                <div class="project-footer">

                    <button
                        type="button"
                        class="btn-view-progress btn-workflow-project"
                        data-id="${project.id}"
                    >
                        <i class="bi bi-eye"></i>
                        Tiến độ
                    </button>

                    <button
                        type="button"
                        class="btn-view-matherial btn-view-more-project"
                        data-id="${project.id}"
                    >
                        <i class="bi bi-eye"></i>
                        Vật tư
                    </button>

                </div>

            </div>
        </article>
    `;
}

function renderPagination(totalItems, currentPage, pageSize) {
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalPages <= 1) {
        paginationContainer.innerHTML = "";
        return;
    }

    let html = `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <button class="page-link js-page" data-page="${currentPage - 1}">
                <i class="bi bi-chevron-left"></i>
            </button>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <button class="page-link js-page" data-page="${i}">
                    ${i}
                </button>
            </li>
        `;
    }

    html += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <button class="page-link js-page" data-page="${currentPage + 1}">
                <i class="bi bi-chevron-right"></i>
            </button>
        </li>
    `;

    paginationContainer.innerHTML = html;
}

// ==================================================
// Create Project Popup
// ==================================================

export function openCreateProjectPopup(users) {
    createProjectOverlay.style.display = "flex";
    document.body.style.overflow = "hidden";
    renderPicSelect(users);
}

export function closeCreateProjectPopup() {
    createProjectOverlay.style.display = "none";
    document.body.style.overflow = "auto";
    resetCreateProjectForm();
}

function resetCreateProjectForm() {
    $("#project-name, #start-date, #end-date, #image-project").val("");
    $("#pic").empty();
    picSelectInstance?.clear(true);
}

export function getCreateProjectFormData() {
    return {
        projectName: document.getElementById("project-name")?.value.trim(),
        startDate: document.getElementById("start-date")?.value,
        endDate: document.getElementById("end-date")?.value,
        pic: document.getElementById("pic")?.value,
        imageProject: document.getElementById("image-project")?.files?.[0] || null
    };
}

/**
 * Render hoặc refresh TomSelect chọn PIC cho project.
 */
function renderPicSelect(users) {
    const $select = $("#pic");
    if (!$select.length) return;

    // Xoá option cũ
    $select.empty();

    // Thêm option từ danh sách user
    users.forEach(user => {
        $select.append($("<option>", {
            value: user.id,
            text: user.employee_id
        }));
    });

    // Nếu chưa có instance TomSelect thì tạo mới
    if (!picSelectInstance) {
        picSelectInstance = new TomSelect("#pic", {
            plugins: ['remove_button'],
            hideSelected: true,
            create: false,
            placeholder: "Chọn người phụ trách",
        });
        return;
    }

    // Nếu đã có instance thì refresh options
    picSelectInstance.clearOptions();
    users.forEach(user => {
        picSelectInstance.addOption({
            value: user.id,
            text: user.employee_id
        });
    });
    picSelectInstance.refreshOptions(false);
}
