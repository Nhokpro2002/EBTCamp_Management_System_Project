import * as service from "./service.js";
import * as ui from "./ui.js";
import * as utils from "../utils/utils.js";

import { setupScanInput, onEnter } from "../utils/scan-input.js";
import { exportState as state } from "./state.js";
import { exportPageMessage as message } from "./messages.js";

const scanInput = document.getElementById("exportScanInput");
const tbody = document.getElementById("exportTable");

/**
 * Vẽ lại bảng + tổng + trạng thái nút Lưu.
 */
export function render(highlightItemID = "") {
    const list = service.getList();
    ui.renderExportTable(list, service.isRowValid, highlightItemID);
    ui.renderSummary(list, service.getTotalQuantity());
    ui.setSaveEnabled(service.isListValid());
}

export function bindEvents() {
    bindScanEvents();
    bindTableEvents();
    bindActionEvents();

    // Danh sách chưa lưu → hỏi trước khi rời trang
    window.addEventListener("beforeunload", event => {
        if (service.getList().length) {
            event.preventDefault();
            event.returnValue = message.leaveWarning;
        }
    });
}

// =====================================================
// QUÉT → THÊM VÀO DANH SÁCH
// =====================================================
function bindScanEvents() {
    const scan = setupScanInput(scanInput);

    onEnter(scanInput, async () => {
        // "AAAA-51" → vật tư có code "AAAA"
        const scanned = service.parseScannedCode(scanInput.value);
        // Giữ mã vừa quét trên ô, lần quét sau sẽ tự thay
        scan.markDone();
        if (!scanned.code || state.isLookingUp) return;

        state.isLookingUp = true;
        ui.setScanResult("Đang tra cứu...");
        try {
            const result = await service.addScannedCode(scanned);
            const name = ui.escapeHtml(result.row?.item.name || result.item?.name || "");

            switch (result.status) {
                case "not-found":
                    ui.setScanResult(`Mã <b>${ui.escapeHtml(scanned.code)}</b> ${message.notFound}`, "error");
                    break;
                case "out-of-stock":
                    ui.setScanResult(`<b>${name}</b> ${message.outOfStock}`, "error");
                    break;
                case "incremented": {
                    const { quantity, item } = result.row;
                    // Vẫn cộng, nhưng báo đỏ nếu SL xuất vượt tồn kho (nút Lưu bị khóa tới khi sửa)
                    const overStock = !service.isRowValid(result.row);
                    ui.setScanResult(
                        `<b>${name}</b>: SL xuất <b>${quantity}</b>` +
                        (overStock ? ` — ${message.overStock(item.stock)}` : ""),
                        overStock ? "error" : "success"
                    );
                    render(item.id);
                    break;
                }
                default:
                    ui.setScanResult(`Đã thêm <b>${name}</b> · SL xuất <b>1</b>`, "success");
                    render(result.row.item.id);
            }
        } catch (error) {
            console.error(error);
            ui.setScanResult(message.lookupFailed, "error");
        } finally {
            state.isLookingUp = false;
            scanInput.focus();
        }
    });

    scanInput.focus();
}

// =====================================================
// SỬA SỐ LƯỢNG / BỎ DÒNG
// =====================================================
function bindTableEvents() {
    tbody.addEventListener("input", event => {
        if (!event.target.matches(".stock-quantity")) return;

        const row = service.findRow(event.target.closest("tr").dataset.itemId);
        if (!row) return;

        row.quantity = service.parseQuantity(event.target.value);
        ui.setQuantityInputValid(event.target, service.isRowValid(row));
        ui.renderSummary(service.getList(), service.getTotalQuantity());
        ui.setSaveEnabled(service.isListValid());
    });

    // Sửa xong số lượng → Enter quay lại ô quét
    tbody.addEventListener("keydown", event => {
        if (event.key === "Enter" && event.target.matches(".stock-quantity")) {
            event.preventDefault();
            scanInput.focus();
        }
    });

    tbody.addEventListener("click", event => {
        if (!event.target.closest(".stock-remove")) return;

        service.removeRow(event.target.closest("tr").dataset.itemId);
        render();
        scanInput.focus();
    });
}

// =====================================================
// XÓA DANH SÁCH / LƯU → TRỪ KHO
// =====================================================
function bindActionEvents() {
    document.getElementById("exportClearBtn").addEventListener("click", () => {
        service.clearList();
        ui.setScanResult("");
        render();
        scanInput.focus();
    });

    document.getElementById("exportSaveBtn").addEventListener("click", async () => {
        const list = service.getList();
        if (!list.length) {
            utils.showError(message.listEmpty);
            return;
        }
        if (!service.isListValid()) {
            utils.showError(message.invalidQuantity);
            return;
        }

        const confirmed = await utils.showConfirm(
            message.confirmTitle,
            message.confirmText(list.length, service.getTotalQuantity()),
            "Export"
        );
        if (!confirmed) return;

        ui.setSaving(true);
        try {
            const { errors } = await service.saveExport();
            if (errors.length) {
                // Các dòng lỗi vẫn nằm lại trong bảng để sửa và lưu lại
                utils.showError(`${message.exportFailed}: ${errors.join("; ")}`);
            } else {
                utils.showSuccess(message.exportSuccess);
                ui.setScanResult("");
            }
        } catch (error) {
            console.error(error);
            utils.showError(message.exportFailed);
        } finally {
            ui.setSaving(false);
            render();
            scanInput.focus();
        }
    });
}
