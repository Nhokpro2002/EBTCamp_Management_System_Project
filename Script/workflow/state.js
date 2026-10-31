export const workflowData = {
    projectID: null,
    stages: [],
    tasks: [],
    currentTaskID: null,
    currentStageID: null,
    reportHistory: [], // lịch sử báo cáo của task đang mở popup
    taskGroups: {}
};

export const projectData = { // mapping from stages and tasks
    data: [],
    links: [],
    startDate: "",
    endDate: "",
    projectName: ""
}

export const issueData = { // mapping from stages and tasks
    issue: []
}

