import { inventoryVariable } from "./state.js";
import { inventoryItemPageMessage } from "./inventory_items_page_message.js";
import * as ui from "./ui.js";
import * as service from "./service.js";
import * as utils from "../utils/utils.js";
import {
    SCAN_MAX_KEY_GAP_MS,
    SCAN_MIN_LENGTH,
    isTypingTarget
} from "../utils/scan-input.js";

// =====================================================
// TRANG LƯU KHO: bảng tồn kho (lọc, phân trang, quét lọc, chọn / xóa)
// Nhập kho / Xuất kho là 2 trang riêng: stock-import.html, stock-export.html
// =====================================================
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

    initSelectionEvents();
    initScanFilterEvents();
    initPackingUnitEvents();
}

// =====================================================
// SỬA PACKING UNIT TRỰC TIẾP TRÊN BẢNG
// Enter / bấm ra ngoài → lưu (nếu có thay đổi), Esc → trả lại giá trị cũ
// =====================================================
function initPackingUnitEvents() {
    const tbody = document.getElementById("inventoryTable");

    tbody.addEventListener("keydown", event => {
        const input = event.target.closest(".inline-edit-input");
        if (!input) return;

        if (event.key === "Enter") {
            event.preventDefault();
            input.blur();
        } else if (event.key === "Escape") {
            input.value = input.dataset.original;
            input.blur();
        }
    });

    // focusout nổi bọt lên tbody (blur thì không)
    tbody.addEventListener("focusout", async event => {
        const input = event.target.closest(".inline-edit-input");
        if (!input || input.disabled) return;

        const field = input.dataset.field;
        const parsed = service.parseInlineValue(field, input.value);
        if (!parsed.ok) {
            utils.showError(service.getInlineInvalidMessage(field));
            input.value = input.dataset.original;
            return;
        }

        input.value = parsed.value;
        if (String(parsed.value) === input.dataset.original) return;

        const itemID = input.closest("tr")?.dataset.itemId;
        if (!itemID) return;

        input.disabled = true;
        input.classList.add("is-saving");

        const result = await service.updateItemField(itemID, field, parsed.value);

        input.disabled = false;
        input.classList.remove("is-saving");
        if (result.ok) {
            input.value = result.value;
            input.dataset.original = String(result.value);
            if (field === "stock") ui.refreshStockCell(input, result.value);
        } else {
            input.value = input.dataset.original;
        }
    });
}

// =====================================================
// LỌC BẰNG QUÉT QR TRÊN TRANG
// Máy quét gõ rất nhanh rồi gửi Enter → nhận ra lần quét kể cả khi không ô nào đang focus.
// =====================================================
function initScanFilterEvents() {
    let buffer = "";
    let lastKeyTime = 0;

    document.addEventListener("keydown", event => {
        // Đang gõ vào ô nhập thì để ô đó xử lý
        if (event.ctrlKey || event.altKey || event.metaKey || isTypingTarget(event.target)) {
            buffer = "";
            return;
        }

        if (event.key === "Escape" && inventoryVariable.scanItems) {
            service.clearScanFilter();
            return;
        }

        const now = performance.now();
        if (now - lastKeyTime > SCAN_MAX_KEY_GAP_MS) {
            buffer = "";
        }
        lastKeyTime = now;

        if (event.key === "Enter") {
            // "AAAA-51" → lọc theo code "AAAA"
            const { code } = service.parseScannedCode(buffer);
            buffer = "";
            if (code.length >= SCAN_MIN_LENGTH) {
                // Không để Enter bấm nhầm vào nút đang focus
                event.preventDefault();
                filterByScannedCode(code);
            }
            return;
        }

        if (event.key.length === 1) {
            buffer += event.key;
        }
    });

    document.getElementById("scanFilterBar").addEventListener("click", event => {
        if (event.target.closest("#clearScanFilterBtn")) {
            service.clearScanFilter();
        }
    });
}

async function filterByScannedCode(code) {
    // Quét để xem đúng vật tư đó → bỏ search / brand đang chọn để không bị ẩn mất
    inventoryVariable.searchKeyword = "";
    inventoryVariable.selectedBrand = "";
    document.getElementById("searchInput").value = "";
    document.getElementById("brandFilter").value = "";

    try {
        await service.applyScanFilter(code);
    } catch (error) {
        console.error(error);
        service.clearScanFilter();
        utils.showError(inventoryItemPageMessage.lookupFailed);
    }
}

// =====================================================
// CHECKBOX / DELETE
// =====================================================
function initSelectionEvents() {
    const tbody = document.getElementById("inventoryTable");

    // Chọn / bỏ chọn tất cả dòng ở trang hiện tại
    document.getElementById("checkAllItems").addEventListener("change", event => {
        ui.setAllRowsChecked(event.target.checked);
    });

    tbody.addEventListener("change", event => {
        if (event.target.matches(".row-checkbox")) {
            ui.updateSelectionState();
        }
    });

    // Bấm vào bất kỳ chỗ nào trên dòng cũng chọn / bỏ chọn dòng đó
    tbody.addEventListener("click", event => {
        if (event.target.closest("input, button, a, select, textarea, label")) return;

        const checkbox = event.target.closest("tr")?.querySelector(".row-checkbox");
        if (!checkbox) return;

        checkbox.checked = !checkbox.checked;
        ui.updateSelectionState();
    });

    document.getElementById("btnClearSelection").addEventListener("click", () => {
        ui.setAllRowsChecked(false);
    });

    document.getElementById("btnDeleteSelected").addEventListener("click", async () => {
        const IDList = ui.getSelectedItemIDs();
        if (!IDList.length) return;

        const confirmed = await utils.showConfirm(
            `Xóa ${IDList.length} vật tư?`,
            "Thao tác này không thể hoàn tác.",
            "Delete"
        );
        if (!confirmed) return;

        ui.setDeleteSaving(true);
        try {
            await service.deleteItem(IDList);
            await service.reloadInventory();
        } finally {
            ui.setDeleteSaving(false);
        }
    });
}
