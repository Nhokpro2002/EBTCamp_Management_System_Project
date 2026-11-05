import { escapeHtml, getItemImageUrl } from "../services/inventory.api.js";

export { escapeHtml };

const tbody = document.getElementById("exportTable");
const saveButton = document.getElementById("exportSaveBtn");

// =====================================================
// KẾT QUẢ QUÉT
// =====================================================

/**
 * @param {"success"|"error"|""} type
 */
export function setScanResult(html, type = "") {
    const element = document.getElementById("exportScanResult");
    element.className = `scan-result ${type ? `is-${type}` : ""}`;
    element.innerHTML = html;
}

// =====================================================
// BẢNG VẬT TƯ XUẤT
// =====================================================

/**
 * @param {Array<{ item: Object, quantity: number }>} list
 * @param {(row) => boolean} isRowValid
 * @param {string} [highlightItemID] dòng vừa quét → nháy sáng để dễ thấy
 */
export function renderExportTable(list, isRowValid, highlightItemID = "") {
    if (!list.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-upc-scan"></i> Quét mã QR để thêm vật tư
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = list.map(row => {
        const { item, quantity } = row;
        const imageUrl = getItemImageUrl(item);
        const stock = Number(item.stock) || 0;
        const name = escapeHtml(item.name);

        return `
        <tr data-item-id="${escapeHtml(item.id)}" class="${item.id === highlightItemID ? "is-just-scanned" : ""}">
            <td>${imageUrl ? `<img src="${imageUrl}" class="product-img" alt="">` : ""}</td>
            <td><div class="product-name">${name}</div></td>
            <td>${escapeHtml(item.model)}</td>
            <td>${escapeHtml(item.code)}</td>
            <td>${escapeHtml(item.brand)}</td>
            <td>${stock}</td>
            <td>
                <input type="number" class="form-control form-control-sm stock-quantity ${isRowValid(row) ? "" : "is-invalid"}"
                    min="1" max="${stock}" value="${quantity ?? ""}"
                    aria-label="Số lượng xuất cho ${name}">
                <div class="invalid-feedback">1 – ${stock}</div>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger stock-remove"
                    aria-label="Bỏ ${name}">
                    <i class="bi bi-x-lg"></i>
                </button>
            </td>
        </tr>`;
    }).join("");
}

/**
 * Cập nhật trạng thái 1 ô số lượng mà không vẽ lại cả bảng (giữ focus khi đang gõ).
 */
export function setQuantityInputValid(input, isValid) {
    input.classList.toggle("is-invalid", !isValid);
}

// =====================================================
// TỔNG + NÚT LƯU
// =====================================================
export function renderSummary(list, totalQuantity) {
    document.getElementById("exportItemCount").textContent = list.length;
    document.getElementById("exportTotalQuantity").textContent = totalQuantity;
}

export function setSaveEnabled(isEnabled) {
    saveButton.disabled = !isEnabled;
}

export function setSaving(isSaving) {
    saveButton.disabled = isSaving;
    saveButton.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang lưu...'
        : '<i class="bi bi-check-lg"></i> Lưu xuất kho';
}
