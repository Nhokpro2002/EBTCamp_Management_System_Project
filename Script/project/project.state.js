export let variableGlobal = {
    projectList: [],
    currentProjectID: null,
    stageListByProject: [],
    currentStageID: null,
    taskListByStage: [],
    currentTaskID: null,
    userMap: {},
    projectItemList: [],
    filteredProjects: [],
    inventoryItems: [],
    pageSize: 5,
    currentPage: 1,

    tomSelectInstances: {}
};

export const messageCommon = {
    success: {
        createSuccess: "Create successfully",
        updateSuccess: "Update successfully",
        deleteSuccess: "Delete successfully",
        getSuccess: "Load data successfully"
    },
    error: {
        createError: "Failed to create",
        updateError: "Failed to update",
        deleteError: "Failed to delete",
        getError: "Load data Failed"
    }

};

export let projectElements = {
    statsContainer: null,
    projectTableBody: null,
    pagination: null,
    tableInfo: null,
    searchInput: null,
    statusFilter: null
}