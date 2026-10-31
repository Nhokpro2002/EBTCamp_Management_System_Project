import * as api from "../services/generic.api.js";

// =========================
// CONSTANTS
// =========================
const COLLECTION_PROJECTS = "Projects";
const COLLECTION_STAGES = "Stages";
const COLLECTION_USERS = "Users";

// Stage mặc định được tạo kèm mỗi project mới
const DEFAULT_STAGES = [
    { name: "Design", css: "design" },
    { name: "Mechanical", css: "mechanical" },
    { name: "Assembly", css: "assembly" },
    { name: "Electric", css: "electric" },
    { name: "Program", css: "program" }
];

// =========================
// LOAD
// =========================
export function loadProjects() {
    return api.getRecords(COLLECTION_PROJECTS);
}

export function loadUsers() {
    return api.getRecords(COLLECTION_USERS);
}

// =========================
// CREATE PROJECT
// =========================
export function isValidProjectForm({ projectName, startDate, endDate, pic }) {
    return Boolean(projectName && startDate && endDate && pic);
}

function buildProjectPayload(data) {
    const payload = new FormData();
    Object.entries({
        name: data.projectName,
        start_date: data.startDate,
        end_date: data.endDate,
        pic: data.pic,
        status: "Not Started"
    }).forEach(([key, value]) => {
        payload.append(key, value);
    });

    if (data.imageProject) {
        payload.append("image_project", data.imageProject);
    }
    return payload;
}

/**
 * Tạo project kèm 5 stage mặc định.
 * @returns {Promise<Object>} Project vừa tạo.
 */
export async function createProject(formData) {
    const project = await api.createRecord(
        COLLECTION_PROJECTS,
        buildProjectPayload(formData)
    );

    await Promise.all(
        DEFAULT_STAGES.map(stage =>
            api.createRecord(COLLECTION_STAGES, {
                project: project.id,
                name: stage.name,
                css: stage.css,
                start_date: project.start_date,
                duration: 0,
                progress: 0
            })
        )
    );

    return project;
}
