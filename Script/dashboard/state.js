export const dashboardState = {
    // Dữ liệu thô từ PocketBase
    projects: [],
    stages: [],
    tasks: [],
    issues: [],
    materials: [],

    // Instance Chart.js đang vẽ (để destroy khi tải lại)
    charts: {},

    isLoading: false
};
