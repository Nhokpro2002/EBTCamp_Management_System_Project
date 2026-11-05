import * as service from "./service.js";
import * as ui from "./ui.js";
import * as qrLabel from "./qr-label.js";
import * as utils from "../utils/utils.js";

import { onEnter } from "../utils/scan-input.js";
import { importState as state } from "./state.js";
import { importPageMessage as message, excelImportMessage, MAX_LABELS } from "./messages.js";

const qrCodeInput = document.getElementById("qrCodeInput");
const qrLabelCount = document.getElementById("qrLabelCount");

export function bindEvents() {
    bindLabelEvents();
    bindProductFormEvents();
    bindExcelImportEvents();
}

// =====================================================
// IN TEM QR = NHẬP KHO
// Tem dạng "<code>-<số thứ tự>": auto_increment_id đang là 50, in 50 tem
// → AAAA-51 … AAAA-100, lưu auto_increment_id = 100 VÀ cộng 50 vào stock.
// =====================================================

function getLabelCount() {
    const count = service.parseQuantity(qrLabelCount.value);
    return count && count <= MAX_LABELS ? count : null;
}

/**
 * Xem trước tem đầu tiên + dải số của lượt in (theo vật tư đang chọn và số tem).
 */
function renderPreview() {
    const item = state.previewItem;
    const count = getLabelCount();
    if (!item || !count) {
        qrLabel.clearQrPreview();
        ui.setPrintEnabled(false);
        return;
    }

    const start = service.getLastLabelSerial(item) + 1;
    qrLabel.renderQrPreview({
        firstLabel: service.buildLabelText(item.code, start),
        lastLabel: service.buildLabelText(item.code, start + count - 1),
        count,
        itemName: item.name || ""
    });
    ui.setPrintEnabled(true);
}

async function generatePreview() {
    const code = service.normalizeCode(qrCodeInput.value);
    if (!code) {
        utils.showError(message.codeRequired);
        qrCodeInput.focus();
        return;
    }
    if (!qrLabel.isQrLibraryReady()) {
        utils.showError(message.qrLibraryMissing);
        return;
    }
    if (!getLabelCount()) {
        utils.showError(message.labelCountInvalid);
        qrLabelCount.focus();
        return;
    }

    ui.setLookupResult("");
    try {
        const item = await service.findPreviewItem(code);
        // Mã chưa có → nút "Tạo vật tư mới"
        if (!item) ui.renderMissingCode(code);
    } catch (error) {
        console.error(error);
        state.previewItem = null;
        utils.showError(message.lookupFailed);
    }
    renderPreview();
}

async function printLabels() {
    const count = getLabelCount();
    if (!state.previewItem || !count) return;

    // Mở cửa sổ in ngay trong lúc bấm, nếu không trình duyệt chặn pop-up
    const printWindow = qrLabel.openPrintWindow();
    if (!printWindow) {
        utils.showError(message.printBlocked);
        return;
    }

    ui.setPrintEnabled(false);
    try {
        // Cấp số tem + cộng số lượng vào stock TRƯỚC khi in
        const { item, labels } = await service.printLabelsAndAddStock(state.previewItem.code, count);
        qrLabel.printQrLabels(printWindow, labels);
        ui.addPrintLogEntry(item, labels);
        utils.showSuccess(message.printed(labels, item.stock));
    } catch (error) {
        console.error(error);
        printWindow.close();
        utils.showError(error.message || message.printFailed);
    } finally {
        // Xem trước lượt in kế tiếp (số tem tiếp nối)
        renderPreview();
    }
}

function bindLabelEvents() {
    document.getElementById("generateQrBtn").addEventListener("click", generatePreview);
    onEnter(qrCodeInput, generatePreview);

    // Đổi code → phải bấm "Tạo mã" lại; đổi số tem → cập nhật dải số ngay
    qrCodeInput.addEventListener("input", () => {
        state.previewItem = null;
        ui.setLookupResult("");
        renderPreview();
    });
    qrLabelCount.addEventListener("input", renderPreview);

    document.getElementById("printQrBtn").addEventListener("click", printLabels);

    // Mã chưa có → mở form tạo vật tư mới (điền sẵn code)
    document.getElementById("labelLookupResult").addEventListener("click", event => {
        if (event.target.closest("#createFromCodeBtn")) {
            openCreateForm(state.missingCode);
        }
    });

    qrCodeInput.focus();
}

// =====================================================
// TẠO VẬT TƯ MỚI (mã chưa có trong kho)
// Tồn kho ban đầu mặc định 0: số lượng nhập sẽ được cộng khi in tem.
// =====================================================
function getProductModal() {
    return bootstrap.Modal.getOrCreateInstance(document.getElementById("addProductModal"));
}

function openCreateForm(code) {
    ui.prefillProductForm({ code, stock: 0 });
    getProductModal().show();
}

function bindProductFormEvents() {
    const modal = document.getElementById("addProductModal");

    document.getElementById("saveProductBtn").addEventListener("click", async () => {
        if (!ui.validateProductForm()) return;

        ui.setProductSaving(true);
        try {
            const item = await service.createMaterial(ui.createProductPayload());
            utils.showSuccess(message.saveSuccess);
            ui.renderMaterialCodeOptions(service.getMaterials());

            // Vật tư vừa tạo → điền mã và xem trước tem để in luôn
            qrCodeInput.value = item.code;
            ui.setLookupResult("");
            renderPreview();
            getProductModal().hide();
        } catch (error) {
            console.error(error);
            utils.showError(message.saveFailed);
        } finally {
            ui.setProductSaving(false);
        }
    });

    modal.addEventListener("hidden.bs.modal", () => {
        ui.resetProductForm();
        qrLabelCount.focus();
    });
}


// =====================================================
// NHẬP KHO + IN TEM TỪ EXCEL
// Chọn / kéo thả file → đọc + xem trước (số tem từng dòng, dòng lỗi) → bấm "In tem & nhập kho"
// → tạo mã mới (nếu cần) + cộng stock + cấp số tem lần lượt từng dòng → in tất cả tem một lần.
// =====================================================
function renderExcel() {
    ui.renderExcelPreview(service.getExcelImport(), service.getExcelTotals());
}

function resetExcel() {
    service.clearExcelImport();
    ui.resetExcelFileInput();
    ui.renderExcelPreview(null);
}

async function readExcelFile(file) {
    if (!service.isExcelLibraryReady()) {
        utils.showError(excelImportMessage.libraryMissing);
        return;
    }
    if (!/\.xlsx$/i.test(file.name)) {
        utils.showError(excelImportMessage.invalidFile);
        ui.resetExcelFileInput();
        return;
    }

    ui.setExcelReading(true);
    try {
        await service.readExcelImport(file);
        renderExcel();
        // Danh sách vật tư vừa được tải lại → cập nhật gợi ý mã ở ô in lẻ
        ui.renderMaterialCodeOptions(service.getMaterials());
    } catch (error) {
        console.error(error);
        resetExcel();
        utils.showError(error.message || excelImportMessage.readFailed);
    } finally {
        ui.setExcelReading(false);
    }
}

async function importExcelAndPrint() {
    const totals = service.getExcelTotals();
    if (!totals.ready) {
        utils.showError(excelImportMessage.nothingToImport);
        return;
    }
    if (totals.tooManyLabels) {
        utils.showError(excelImportMessage.tooManyLabels(totals.labelCount));
        return;
    }
    if (!qrLabel.isQrLibraryReady()) {
        utils.showError(message.qrLibraryMissing);
        return;
    }

    const confirmed = await utils.showConfirm(
        excelImportMessage.confirmTitle(totals.ready, totals.labelCount),
        excelImportMessage.confirmText(totals.create),
        excelImportMessage.confirmButton
    );
    if (!confirmed) return;

    // Mở cửa sổ in ngay sau cú bấm xác nhận, nếu không trình duyệt chặn pop-up
    const printWindow = qrLabel.openPrintWindow();
    if (!printWindow) {
        utils.showError(message.printBlocked);
        return;
    }

    ui.setExcelImportState({ progress: { done: 0, total: totals.ready } });
    try {
        const { labels, doneRows, errors } = await service.importExcelAndReserveLabels((done, total) => {
            ui.setExcelImportState({ progress: { done, total } });
        });

        // Tem in đúng thứ tự dòng trong file (trong mỗi dòng số tăng dần)
        if (labels.length) qrLabel.printQrLabels(printWindow, labels);
        else printWindow.close();

        doneRows.forEach(row => ui.addPrintLogEntry(row.item, row.labels));
        ui.renderMaterialCodeOptions(service.getMaterials());

        if (!doneRows.length) {
            utils.showPopup("Error", excelImportMessage.allFailed(errors), "error");
        } else if (errors.length) {
            utils.showPopup("Warning", excelImportMessage.partialFailed(doneRows.length, errors), "warning");
        } else {
            utils.showSuccess(excelImportMessage.imported(doneRows.length, labels.length));
        }
    } catch (error) {
        console.error(error);
        printWindow.close();
        utils.showError(error.message || message.printFailed);
    } finally {
        // Bảng hiện trạng thái "Đã nhập" / "Lỗi khi nhập" của từng dòng
        renderExcel();
    }
}

async function downloadTemplate() {
    if (!service.isExcelLibraryReady()) {
        utils.showError(excelImportMessage.libraryMissing);
        return;
    }
    const blob = await service.createExcelTemplate();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mau-nhap-kho.xlsx";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function bindExcelImportEvents() {
    const fileInput = document.getElementById("excelFileInput");
    const dropzone = document.getElementById("excelDropzone");

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (file) readExcelFile(file);
    });

    // Kéo thả file vào vùng chọn
    ["dragenter", "dragover"].forEach(type => dropzone.addEventListener(type, event => {
        event.preventDefault();
        ui.setDropzoneActive(true);
    }));
    ["dragleave", "dragend"].forEach(type => dropzone.addEventListener(type, event => {
        if (!dropzone.contains(event.relatedTarget)) ui.setDropzoneActive(false);
    }));
    dropzone.addEventListener("drop", event => {
        event.preventDefault();
        ui.setDropzoneActive(false);
        const file = event.dataTransfer?.files[0];
        if (file && !fileInput.disabled) readExcelFile(file);
    });

    document.getElementById("excelImportBtn").addEventListener("click", importExcelAndPrint);
    document.getElementById("excelClearBtn").addEventListener("click", resetExcel);
    document.getElementById("excelTemplateBtn").addEventListener("click", downloadTemplate);
}
