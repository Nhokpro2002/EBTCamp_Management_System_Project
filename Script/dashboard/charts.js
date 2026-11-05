import { dashboardState as state } from "./state.js";

// =====================================================
// CHART SETUP
// =====================================================
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.font.family = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
Chart.defaults.color = "#64748b";
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;

// Màu stage giống trang Workflow (CSS/workflow.css: --stage-*-bg / --stage-*-fg)
const STAGE_COLORS = {
    design: { bg: "#a1d5ff", fg: "#073374" },
    mechanical: { bg: "#bcf7ff", fg: "#00705d" },
    assembly: { bg: "#c9fbca", fg: "#006307" },
    electric: { bg: "#ffe3b9", fg: "#923300" },
    program: { bg: "#f6c6ff", fg: "#2f0168" }
};

const COLORS = {
    open: "#ef4444",
    solved: "#10b981",
    grid: "#f1f5f9"
};

// Màu mức tồn kho giống huy hiệu Stock ở trang Inventory
const STOCK_LEVEL_COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

/**
 * Vẽ (hoặc vẽ lại) một biểu đồ vào canvas, hủy biểu đồ cũ cùng tên.
 */
function drawChart(name, canvasID, config) {
    state.charts[name]?.destroy();
    state.charts[name] = new Chart(document.getElementById(canvasID), config);
}

const integerAxis = {
    beginAtZero: true,
    ticks: { precision: 0 },
    grid: { color: COLORS.grid }
};

// =====================================================
// ISSUES BY TYPE — cột chồng: đang mở / đã xử lý
// =====================================================
export function renderIssuesByTypeChart({ labels, open, solved }) {
    drawChart("issuesByType", "issuesByTypeChart", {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Chưa xử lý", data: open, backgroundColor: COLORS.open, borderRadius: 6, maxBarThickness: 28 },
                { label: "Đã xử lý", data: solved, backgroundColor: COLORS.solved, borderRadius: 6, maxBarThickness: 28 }
            ]
        },
        options: {
            indexAxis: "y",
            scales: {
                x: { ...integerAxis, stacked: true },
                y: { stacked: true, grid: { display: false } }
            },
            plugins: { legend: { position: "bottom" } }
        }
    });
}

// =====================================================
// OPEN ISSUES BY STAGE — màu theo stage
// =====================================================
export function renderIssuesByStageChart(stageCounts) {
    drawChart("issuesByStage", "issuesByStageChart", {
        type: "bar",
        data: {
            labels: stageCounts.map(stage => stage.name),
            datasets: [{
                label: "Issue chưa xử lý",
                data: stageCounts.map(stage => stage.count),
                backgroundColor: stageCounts.map(stage => STAGE_COLORS[stage.key].bg),
                borderColor: stageCounts.map(stage => STAGE_COLORS[stage.key].fg),
                borderWidth: 1.5,
                borderRadius: 8,
                maxBarThickness: 48
            }]
        },
        options: {
            scales: {
                y: integerAxis,
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// =====================================================
// STOCK LEVELS — doughnut
// =====================================================
export function renderStockLevelChart(levels) {
    drawChart("stockLevels", "stockLevelChart", {
        type: "doughnut",
        data: {
            labels: ["Đủ hàng (≥ 30)", "Trung bình (10–29)", "Sắp hết (1–9)", "Hết hàng"],
            datasets: [{
                data: [levels.inStock, levels.medium, levels.low, levels.out],
                backgroundColor: STOCK_LEVEL_COLORS,
                borderColor: "#fff",
                borderWidth: 2
            }]
        },
        options: {
            cutout: "64%",
            plugins: { legend: { position: "bottom" } }
        }
    });
}
