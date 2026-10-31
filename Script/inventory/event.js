import { inventoryVariable } from "./state.js";
import { inventoryItemPageMessage } from "./inventory_items_page_message.js";
import * as ui from "./ui.js";
import * as service from "./service.js";
import * as utils from "../utils/utils.js";

const MAX_LABELS = 200;

export function initEvent() {
    const pagination = document.getElementById("pagination");
    pagination.addEventListener(
        "click",
        (e) => {
            const btn =
                e.target.closest(".page-btn");
            if (!btn) return;
            service.changePage(
                Number(btn.dataset.page)
            );
        });


    const bindFilter = (id, event, key, transform = value => value) => {
        const element = document.getElementById(id);

        element.addEventListener(event, () => {
            inventoryVariable[key] = transform(element.value);
            ui.applyFilter();
        });
    };

    bindFilter(
        "searchInput",
        "input",
        "searchKeyword",
        value => value.toLowerCase().trim()
    );

    bindFilter("brandFilter", "change", "selectedBrand");

    document
        .getElementById("saveProductBtn")
        .addEventListener("click", async () => {
            if (!ui.validateProductForm()) return;
            const inventoryItemData = ui.createPayload();
            const saved = await service.saveItem(inventoryItemData);
            if (!saved) return;

            getModal("addProductModal").hide();
            await service.reloadInventory();
        });


    document.getElementById("addProductModal").addEventListener("hidden.bs.modal", function () {
        ui.resetProductForm();
    });

    const btnDeleteSelected = document.getElementById("btnDeleteSelected");

    document.getElementById("btnDeleteSelected").addEventListener("click", async () => {
        const IDList = Array.from(
            document.querySelectorAll(".row-checkbox:checked")
        ).map(checkbox => checkbox.value);

        if (IDList.length === 0) {
            alert("Please select at least one item.");
            return;
        }

        const confirmed = confirm(`Delete ${IDList.length} selected item(s)?`);
        if (!confirmed) return;

        await service.deleteItem(IDList);


        inventoryVariable.inventoryItemFiltered =
            inventoryVariable.inventoryItemFiltered.filter(
                item => !IDList.includes(item.id)
            );

        ui.renderTable(inventoryVariable.inventoryItemFiltered);
    });

    initImportEvents();
    initExportEvents();
}

function getModal(id) {
    return bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
}

/**
 * Máy quét cầm tay (USB HID) gõ nội dung QR vào ô đang focus rồi gửi Enter.
 */
function onEnter(element, handler) {
    element.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        handler();
    });
}

// =====================================================
// IMPORT MATERIAL
// =====================================================
function initImportEvents() {
    const importModal = document.getElementById("importModal");
    const qrCodeInput = document.getElementById("qrCodeInput");
    const qrLabelCount = document.getElementById("qrLabelCount");
    const printQrBtn = document.getElementById("printQrBtn");
    const scanInput = document.getElementById("importScanInput");
    const quantityInput = document.getElementById("importQuantity");

    let isLookingUp = false;

    // ---------- Tạo QR ----------
    const generateQr = () => {
        const code = service.normalizeCode(qrCodeInput.value);
        if (!code) {
            utils.showError(inventoryItemPageMessage.codeRequired);
            qrCodeInput.focus();
            return;
        }
        if (!ui.renderQrPreview(code)) {
            utils.showError(inventoryItemPageMessage.qrLibraryMissing);
            return;
        }
        printQrBtn.disabled = false;
    };

    document.getElementById("generateQrBtn").addEventListener("click", generateQr);
    onEnter(qrCodeInput, generateQr);

    // Đổi code thì QR cũ không còn đúng → phải tạo lại trước khi in
    qrCodeInput.addEventListener("input", () => {
        ui.clearQrPreview();
        printQrBtn.disabled = true;
    });

    printQrBtn.addEventListener("click", () => {
        const count = service.parseQuantity(qrLabelCount.value);
        if (!count || count > MAX_LABELS) {
            utils.showError(`Labels must be between 1 and ${MAX_LABELS}.`);
            return;
        }
        if (!ui.printQrLabels(service.normalizeCode(qrCodeInput.value), count)) {
            utils.showError(inventoryItemPageMessage.printBlocked);
        }
    });

    // ---------- Quét code ----------
    const lookupImportCode = async () => {
        const code = service.normalizeCode(scanInput.value);
        if (!code || isLookingUp) return;

        isLookingUp = true;
        inventoryVariable.importItem = null;
        ui.setImportReady(false);
        ui.setScanResult("importScanResult", "Looking up...");

        try {
            const item = await service.findItemByCode(code);
            if (!item) {
                ui.renderImportNotFound(code);
                return;
            }

            inventoryVariable.importItem = item;
            ui.renderImportItem(item);
            ui.setImportReady(true);
            quantityInput.focus();
            quantityInput.select();
        } catch (error) {
            console.error(error);
            ui.setScanResult("importScanResult", inventoryItemPageMessage.lookupFailed, "error");
        } finally {
            isLookingUp = false;
        }
    };

    onEnter(scanInput, lookupImportCode);

    // Sửa/quét code khác → bỏ vật tư đang chọn cho tới khi Enter lại
    scanInput.addEventListener("input", () => {
        if (inventoryVariable.importItem) {
            inventoryVariable.importItem = null;
            ui.setImportReady(false);
            ui.setScanResult("importScanResult", "");
        }
    });

    // ---------- Cộng kho ----------
    const saveImport = async () => {
        const item = inventoryVariable.importItem;
        if (!item) return;

        const quantity = service.parseQuantity(quantityInput.value);
        if (!quantity) {
            utils.showError(inventoryItemPageMessage.invalidQuantity);
            quantityInput.focus();
            return;
        }

        ui.setImportSaving(true);
        try {
            const updated = await service.changeStock(item.id, quantity);
            utils.showSuccess(inventoryItemPageMessage.importSuccess);
            ui.setScanResult(
                "importScanResult",
                `<i class="bi bi-check-circle"></i> Added <b>${quantity}</b> to
                 <b>${ui.escapeHtml(updated.name)}</b>. New stock: <b>${ui.escapeHtml(updated.stock)}</b>`,
                "success"
            );

            // Sẵn sàng cho lần quét tiếp theo
            inventoryVariable.importItem = null;
            scanInput.value = "";
            quantityInput.value = 1;
            scanInput.focus();

            await service.reloadInventory();
        } catch (error) {
            console.error(error);
            utils.showError(`${inventoryItemPageMessage.importFailed}: ${error.message}`);
        } finally {
            ui.setImportSaving(false);
            ui.setImportReady(Boolean(inventoryVariable.importItem));
        }
    };

    document.getElementById("importSaveBtn").addEventListener("click", saveImport);
    onEnter(quantityInput, saveImport);

    // ---------- Code chưa có → tạo vật tư mới ----------
    document.getElementById("importScanResult").addEventListener("click", event => {
        if (!event.target.closest("#createFromScanBtn")) return;

        const code = service.normalizeCode(scanInput.value);
        const quantity = service.parseQuantity(quantityInput.value) ?? "";

        importModal.addEventListener("hidden.bs.modal", () => {
            ui.prefillProductForm({ code, stock: quantity });
            getModal("addProductModal").show();
        }, { once: true });
        getModal("importModal").hide();
    });

    // ---------- Mở / đóng popup ----------
    importModal.addEventListener("shown.bs.modal", () => scanInput.focus());

    importModal.addEventListener("hidden.bs.modal", () => {
        inventoryVariable.importItem = null;
        scanInput.value = "";
        quantityInput.value = 1;
        ui.setImportReady(false);
        ui.setScanResult("importScanResult", "");
    });
}

// =====================================================
// EXPORT MATERIAL
// =====================================================
function initExportEvents() {
    const exportModal = document.getElementById("exportModal");
    const scanInput = document.getElementById("exportScanInput");
    const exportTable = document.getElementById("exportTable");

    let isLookingUp = false;

    const render = () => ui.renderExportTable(inventoryVariable.exportList);

    const findRow = itemID =>
        inventoryVariable.exportList.find(row => row.item.id === itemID);

    // ---------- Quét code → thêm vào bảng ----------
    const addScannedCode = async () => {
        const code = service.normalizeCode(scanInput.value);
        scanInput.value = "";
        if (!code || isLookingUp) return;

        // Quét lại vật tư đã có trong bảng → tăng số lượng
        const existing = inventoryVariable.exportList.find(row => row.item.code === code);
        if (existing) {
            existing.quantity = (existing.quantity || 0) + 1;
            ui.setScanResult("exportScanResult", `<b>${ui.escapeHtml(existing.item.name)}</b>: quantity ${existing.quantity}`, "success");
            render();
            return;
        }

        isLookingUp = true;
        try {
            const item = await service.findItemByCode(code);
            if (!item) {
                ui.setScanResult("exportScanResult", `Code <b>${ui.escapeHtml(code)}</b> is not in the inventory.`, "error");
                return;
            }
            if (!(Number(item.stock) > 0)) {
                ui.setScanResult("exportScanResult", `<b>${ui.escapeHtml(item.name)}</b> is out of stock.`, "error");
                return;
            }

            inventoryVariable.exportList.push({ item, quantity: 1 });
            ui.setScanResult("exportScanResult", `Added <b>${ui.escapeHtml(item.name)}</b>`, "success");
            render();
        } catch (error) {
            console.error(error);
            ui.setScanResult("exportScanResult", inventoryItemPageMessage.lookupFailed, "error");
        } finally {
            isLookingUp = false;
            scanInput.focus();
        }
    };

    onEnter(scanInput, addScannedCode);

    // ---------- Sửa số lượng / xóa dòng ----------
    exportTable.addEventListener("input", event => {
        if (!event.target.matches(".export-quantity")) return;

        const row = findRow(event.target.closest("tr").dataset.itemId);
        if (!row) return;

        row.quantity = service.parseQuantity(event.target.value);
        ui.updateExportQuantityInput(event.target, row);
        ui.updateExportSaveButton(inventoryVariable.exportList);
    });

    exportTable.addEventListener("click", event => {
        if (!event.target.closest(".export-remove")) return;

        const itemID = event.target.closest("tr").dataset.itemId;
        inventoryVariable.exportList = inventoryVariable.exportList.filter(row => row.item.id !== itemID);
        render();
        scanInput.focus();
    });

    document.getElementById("exportClearBtn").addEventListener("click", () => {
        inventoryVariable.exportList = [];
        ui.setScanResult("exportScanResult", "");
        render();
        scanInput.focus();
    });

    // ---------- Lưu → trừ kho ----------
    document.getElementById("exportSaveBtn").addEventListener("click", async () => {
        const exportList = inventoryVariable.exportList;
        if (!exportList.length) {
            utils.showError(inventoryItemPageMessage.exportEmpty);
            return;
        }
        if (!exportList.every(ui.isExportRowValid)) {
            utils.showError(inventoryItemPageMessage.invalidQuantity);
            return;
        }

        const total = exportList.reduce((sum, row) => sum + row.quantity, 0);
        const confirmed = await utils.showConfirm(
            "Export materials?",
            `${exportList.length} material(s), ${total} unit(s) will be removed from stock.`,
            "Export"
        );
        if (!confirmed) return;

        ui.setExportSaving(true);
        try {
            const { exportedIDs, errors } = await service.exportItems(exportList);

            // Giữ lại các dòng lỗi để người dùng sửa và lưu lại
            inventoryVariable.exportList = exportList.filter(row => !exportedIDs.includes(row.item.id));

            if (errors.length) {
                utils.showError(`${inventoryItemPageMessage.exportFailed}: ${errors.join("; ")}`);
            } else {
                utils.showSuccess(inventoryItemPageMessage.exportSuccess);
                getModal("exportModal").hide();
            }

            await service.reloadInventory();

            // Cập nhật tồn kho mới nhất cho các dòng còn lại
            inventoryVariable.exportList.forEach(row => {
                row.item = inventoryVariable.inventoryItemFull.find(item => item.id === row.item.id) ?? row.item;
            });
            render();
        } finally {
            ui.setExportSaving(false, inventoryVariable.exportList);
        }
    });

    // ---------- Mở / đóng popup ----------
    exportModal.addEventListener("show.bs.modal", render);
    exportModal.addEventListener("shown.bs.modal", () => scanInput.focus());
    exportModal.addEventListener("hidden.bs.modal", () => {
        ui.setScanResult("exportScanResult", "");
    });
}
