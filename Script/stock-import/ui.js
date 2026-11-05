import { escapeHtml, getItemImageUrl } from "../services/inventory.api.js";

export { escapeHtml };

// =====================================================
// GỢI Ý MÃ VẬT TƯ (ô tạo tem)
// =====================================================
export function renderMaterialCodeOptions(items) {
    document.getElementById("materialCodeList").innerHTML = items
        .filter(item => item.code)
        .map(item => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.name)}</option>`)
        .join("");
}

export function setPrintEnabled(isEnabled) {
    document.getElementById("printQrBtn").disabled = !isEnabled;
}

// =====================================================
// KẾT QUẢ TRA MÃ (ô tạo tem)
// =====================================================

/**
 * @param {"success"|"error"|""} type
 */
export function setLookupResult(html, type = "") {
    const element = document.getElementById("labelLookupResult");
    element.className = `scan-result ${type ? `is-${type}` : ""}`;
    element.innerHTML = html;
}

/**
 * Mã chưa có trong kho → nút tạo vật tư mới.
 */
export function renderMissingCode(code) {
    setLookupResult(`
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        Mã <b>${escapeHtml(code)}</b> chưa có trong kho.
        <button type="button" class="btn btn-sm btn-outline-primary ms-2" id="createFromCodeBtn">
            <i class="bi bi-plus-lg" aria-hidden="true"></i> Tạo vật tư mới
        </button>`, "error");
}

// =====================================================
// LỊCH SỬ IN TEM (= các lần nhập kho trong phiên làm việc này)
// =====================================================
const PRINT_LOG_LIMIT = 30;

/**
 * Thêm 1 dòng lên đầu: vật tư, dải tem đã in, số lượng cộng vào kho, tồn kho mới.
 */
export function addPrintLogEntry(item, labels) {
    const log = document.getElementById("printLog");
    const imageUrl = getItemImageUrl(item);
    const range = labels.length > 1
        ? `${labels[0]} → ${labels[labels.length - 1]}`
        : labels[0];

    log.insertAdjacentHTML("afterbegin", `
        <li class="import-log-item">
            <div class="material-thumb">
                <i class="bi bi-box-seam" aria-hidden="true"></i>
                ${imageUrl ? `<img src="${imageUrl}" alt="" loading="lazy" onerror="this.remove()">` : ""}
            </div>
            <div class="import-log-info">
                <div class="product-name">${escapeHtml(item.name)}</div>
                <small class="text-muted">${escapeHtml(range)}</small>
            </div>
            <span class="import-log-added">+${labels.length}</span>
            <span class="import-log-stock">Tồn <b>${escapeHtml(item.stock ?? 0)}</b></span>
        </li>`);

    [...log.children].slice(PRINT_LOG_LIMIT).forEach(row => row.remove());
    document.getElementById("printLogEmpty").hidden = true;
}

// =====================================================
// FORM TẠO VẬT TƯ MỚI (popup)
// =====================================================
const PRODUCT_FIELDS = {
    image: "productImage",
    name: "productName",
    code: "productCode",
    brand: "productBrand",
    model: "productModel",
    type: "productType",
    stock: "productStock",
    description: "productDescription"
};

const field = key => document.getElementById(PRODUCT_FIELDS[key]);

/**
 * Tất cả các ô là bắt buộc; ô trống được tô đỏ.
 */
export function validateProductForm() {
    let isValid = true;

    Object.keys(PRODUCT_FIELDS).forEach(key => {
        const element = field(key);
        const value = element.type === "file"
            ? element.files.length
            : element.value.trim();

        element.classList.toggle("is-invalid", !value);
        if (!value) isValid = false;
    });

    return isValid;
}

export function createProductPayload() {
    const formData = new FormData();
    ["name", "code", "model", "description"].forEach(key => {
        formData.append(key, field(key).value.trim());
    });
    ["brand", "type", "stock"].forEach(key => {
        formData.append(key, field(key).value);
    });

    const image = field("image").files[0];
    if (image) formData.append("image", image);
    return formData;
}

export function resetProductForm() {
    const form = document.getElementById("addProductForm");
    form.reset();
    form.querySelectorAll(".is-invalid, .is-valid")
        .forEach(element => element.classList.remove("is-invalid", "is-valid"));
}

/**
 * Điền sẵn code (và số lượng) khi quét một mã chưa có trong kho.
 */
export function prefillProductForm({ code = "", stock = "" } = {}) {
    resetProductForm();
    field("code").value = code;
    field("stock").value = stock;
}

export function setProductSaving(isSaving) {
    const button = document.getElementById("saveProductBtn");
    button.disabled = isSaving;
    button.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang lưu...'
        : "Lưu";
}


// =====================================================
// NHẬP KHO + IN TEM TỪ EXCEL
// =====================================================
const formatNumber = value => Number(value).toLocaleString("vi-VN");

const muted = text => `<span class="cell-muted">${text}</span>`;

function renderStatus(row) {
    switch (row.status) {
        case "invalid":
            return `<span class="excel-status is-error">${escapeHtml(row.error)}</span>`;
        case "failed":
            return `<span class="excel-status is-error" title="${escapeHtml(row.error)}">Lỗi khi nhập</span>`;
        case "done":
            return `<span class="excel-status is-done"><i class="bi bi-check2" aria-hidden="true"></i> Đã nhập</span>
                <small class="import-status-sub">Tồn mới <b>${formatNumber(row.stockAfter ?? 0)}</b></small>`;
        default:
            return row.action === "create"
                ? `<span class="excel-status is-new">Tạo mã mới</span>`
                : `<span class="excel-status is-update">Cộng thêm</span>
                   <small class="import-status-sub">${row.isRepeated
                        ? "Mã lặp trong file, tem nối tiếp"
                        : `Tồn hiện tại ${formatNumber(row.currentStock)}`}</small>`;
    }
}

function renderLabelCell(row) {
    if (row.status === "invalid") return muted("-");

    const count = `<b class="import-label-count">${formatNumber(row.labelCount)}</b>`;
    if (row.status === "done" && row.labels?.length) {
        const range = row.labels.length > 1
            ? `${row.labels[0]} → ${row.labels[row.labels.length - 1]}`
            : row.labels[0];
        return `${count}<small class="import-status-sub">${escapeHtml(range)}</small>`;
    }
    return row.remainder
        ? `${count}<small class="import-status-sub">gói cuối ${formatNumber(row.remainder)}</small>`
        : count;
}

function renderExcelRow(row) {
    const quantity = row.status === "invalid" && !Number.isFinite(row.quantity)
        ? (row.quantity ? escapeHtml(row.quantity) : muted("-"))
        : formatNumber(row.quantity);
    const packSize = row.status === "invalid"
        ? (row.packSize ? escapeHtml(row.packSize) : muted("-"))
        : row.packSize ? `${formatNumber(row.packSize)}<small class="cell-muted"> /gói</small>` : muted("Chiếc");

    return `
        <tr class="is-${row.status}">
            <td class="col-row cell-muted">${row.rowNumber}</td>
            <td class="col-item">
                <div class="product-name">${row.name ? escapeHtml(row.name) : muted("Chưa có tên")}</div>
                <div class="import-item-meta">
                    ${row.code ? `<span class="code-chip">${escapeHtml(row.code)}</span>` : ""}
                    ${row.description
                        ? `<span class="import-item-desc" title="${escapeHtml(row.description)}">${escapeHtml(row.description)}</span>`
                        : ""}
                </div>
            </td>
            <td class="text-end">${quantity}</td>
            <td class="text-end">${packSize}</td>
            <td class="text-end">${renderLabelCell(row)}</td>
            <td>${renderStatus(row)}</td>
        </tr>`;
}

function renderStat(icon, label, value, tone = "") {
    return `
        <div class="import-stat ${tone ? `is-${tone}` : ""}">
            <span class="import-stat-icon"><i class="bi ${icon}" aria-hidden="true"></i></span>
            <span>
                <span class="import-stat-value">${value}</span>
                <span class="import-stat-label">${label}</span>
            </span>
        </div>`;
}

function renderStats(totals) {
    const isFinished = totals.done + totals.failed > 0;
    return isFinished
        ? [
            renderStat("bi-check2-circle", "Đã nhập kho", formatNumber(totals.done), "success"),
            renderStat("bi-x-circle", "Lỗi khi nhập", formatNumber(totals.failed), totals.failed ? "danger" : ""),
            renderStat("bi-slash-circle", "Dòng bỏ qua", formatNumber(totals.invalid), totals.invalid ? "warning" : ""),
            renderStat("bi-qr-code", "Tem đã in", formatNumber(totals.printed), "primary")
        ].join("")
        : [
            renderStat("bi-list-check", "Dòng hợp lệ", `${formatNumber(totals.ready)}<small>/${formatNumber(totals.total)}</small>`, "primary"),
            renderStat("bi-plus-square", "Mã mới sẽ tạo", formatNumber(totals.create)),
            renderStat("bi-exclamation-triangle", "Dòng lỗi (bỏ qua)", formatNumber(totals.invalid), totals.invalid ? "warning" : ""),
            renderStat("bi-qr-code", "Tổng số tem", formatNumber(totals.labelCount), totals.tooManyLabels ? "danger" : "success")
        ].join("");
}

function renderActionSummary(totals) {
    if (totals.done + totals.failed > 0) {
        return totals.failed
            ? `<i class="bi bi-exclamation-circle text-danger" aria-hidden="true"></i> ${totals.failed} dòng lỗi — rê chuột vào trạng thái để xem lý do.`
            : `<i class="bi bi-check-circle-fill text-success" aria-hidden="true"></i> Đã nhập kho xong. Chọn file khác để nhập tiếp.`;
    }
    if (totals.tooManyLabels) {
        return `<i class="bi bi-exclamation-octagon text-danger" aria-hidden="true"></i> Tổng số tem vượt giới hạn cho một lần in — hãy chia nhỏ file.`;
    }
    if (!totals.ready) {
        return `<i class="bi bi-info-circle" aria-hidden="true"></i> Không có dòng hợp lệ nào để nhập kho.`;
    }
    return `Sẽ in <b>${formatNumber(totals.labelCount)}</b> tem và nhập kho <b>${formatNumber(totals.ready)}</b> dòng
        ${totals.invalid ? ` · bỏ qua <b>${totals.invalid}</b> dòng lỗi` : ""}`;
}

/**
 * Bảng xem trước + thống kê + nút in.
 * @param {Object|null} data state.excelImport (null → quay về vùng chọn file)
 * @param {Object} totals service.getExcelTotals() (+ printed)
 */
export function renderExcelPreview(data, totals = null) {
    document.getElementById("excelDropzone").hidden = Boolean(data);
    document.getElementById("excelPreview").hidden = !data;
    if (!data) {
        document.getElementById("excelPreviewBody").innerHTML = "";
        return;
    }

    document.getElementById("excelFileName").textContent = data.fileName;
    document.getElementById("excelFileMeta").textContent =
        `Sheet "${data.sheetName}" · ${data.rows.length} dòng dữ liệu` +
        (data.hasPackSize ? "" : " · không có cột Đơn vị đóng gói (tính theo chiếc)");

    document.getElementById("excelStats").innerHTML = renderStats(totals);
    document.getElementById("excelPreviewBody").innerHTML = data.rows.length
        ? data.rows.map(renderExcelRow).join("")
        : `<tr><td colspan="6" class="text-center cell-muted py-4">Sheet không có dòng dữ liệu nào</td></tr>`;
    document.getElementById("excelActionSummary").innerHTML = renderActionSummary(totals);

    const isFinished = totals.done + totals.failed > 0;
    setExcelImportState({
        canImport: !isFinished && totals.ready > 0 && !totals.tooManyLabels,
        labelCount: totals.labelCount
    });
}

/**
 * Nút "In tem & nhập kho": số tem sẽ in / tiến độ đang nhập (done/total).
 */
export function setExcelImportState({ canImport = false, labelCount = 0, progress = null } = {}) {
    const button = document.getElementById("excelImportBtn");
    const isSaving = progress !== null;

    button.disabled = isSaving || !canImport;
    button.innerHTML = isSaving
        ? `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang nhập ${progress.done}/${progress.total}...`
        : `<i class="bi bi-printer" aria-hidden="true"></i> In ${canImport ? `${formatNumber(labelCount)} ` : ""}tem &amp; nhập kho`;

    document.getElementById("excelClearBtn").disabled = isSaving;
}

export function setExcelReading(isReading) {
    document.getElementById("excelFileInput").disabled = isReading;
    document.getElementById("excelDropzone").classList.toggle("is-busy", isReading);
    document.getElementById("excelReadingStatus").innerHTML = isReading
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Đang đọc file...'
        : "";
}

export function setDropzoneActive(isActive) {
    document.getElementById("excelDropzone").classList.toggle("is-dragover", isActive);
}

export function resetExcelFileInput() {
    document.getElementById("excelFileInput").value = "";
}
