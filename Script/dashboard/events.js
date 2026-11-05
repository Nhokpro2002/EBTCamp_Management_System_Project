// =====================================================
// UI EVENTS
// =====================================================

/**
 * @param {{ onRefresh: () => void }} handlers
 */
export function bindEvents({ onRefresh }) {
    document.getElementById("refreshDashboardBtn").addEventListener("click", onRefresh);

    // Quay lại tab sau một lúc → tự tải lại số liệu mới
    let hiddenAt = 0;
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            hiddenAt = Date.now();
        } else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) {
            onRefresh();
        }
    });
}
