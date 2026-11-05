export const dailyReportState = {
    projects: [],
    users: [],
    tasks: [],
    issues: [],
    reports: [],
    taskReports: {},
    reportRecordID: "",
    reportTaskDailyReportIDs: [],
    projectID: "",
    workDate: "",
    reporter: null,
    isSaving: false,
    // Dự án + ngày đang chọn đã có báo cáo được lưu → khóa (trừ Part Leader)
    isSubmitted: false,
    canEditSubmitted: false,
    // Tên người đã nộp báo cáo đang xem (chưa nộp thì là người đang đăng nhập)
    reportOwnerName: ""

};
