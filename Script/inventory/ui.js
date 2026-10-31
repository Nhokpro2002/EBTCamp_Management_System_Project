import { inventoryVariable } from "./state.js";
import { URL_LOCAL } from "../config.js";

const COLLECTION_USERS = "Users";

const tbody = document.getElementById("inventoryTable");


export function changeIconAvatar() {
    const dropdownAvatar = document.querySelector('.dropdown img');
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!dropdownAvatar || !userData) return;
    dropdownAvatar.src =
        `${URL_LOCAL}/api/files/${COLLECTION_USERS}/${userData.id}/${userData.avatar}?t=${Date.now()}`;
}

export function changeTopbarText() {
    const topbarText = document.querySelector('.topbar .text-muted');
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!topbarText || !userData) return;
    topbarText.textContent = `Welcome back, ${userData.employee_id} 👋`;
}

export function renderTable(filteredList) {
    tbody.innerHTML = "";

    filteredList.forEach(item => {
        let stockClass = "high";

        if (item.stock < 10)
            stockClass = "low";
        else if (item.stock < 30)
            stockClass = "medium";

        const imageUrl = `${URL_LOCAL}/api/files/Inventory_Items/${item.id}/${item.image}`;

        tbody.innerHTML += `
        <tr style="font-size:14px">
            <td>
                <input
                    type="checkbox"
                    class="row-checkbox"
                    value="${item.id}">
            </td>

            <td>
                <img src="${imageUrl}" class="product-img" alt="${item.name}">
            </td>

            <td>
                <div class="product-name">${item.name}</div>
            </td>

            <td>${item.model}</td>
            <td>${item.code}</td>
            <td>${item.brand}</td>

            <td>
                <span class="stock ${stockClass}">
                    ${item.stock}
                </span>
            </td>           
        </tr>
        `;
    });

    renderPagination();

    bindCheckboxEvent();
}

function bindCheckboxEvent() {
    const checkboxes = document.querySelectorAll(
        ".row-checkbox"
    );

    const selectionBar = document.getElementById(
        "selectionBar"
    );

    checkboxes.forEach(cb => {
        cb.addEventListener(
            "change",
            function () {
                const checkedCount =
                    document.querySelectorAll(
                        ".row-checkbox:checked"
                    ).length;


                if (checkedCount > 0) {
                    selectionBar.classList.add("show");
                }
                else {
                    selectionBar.classList.remove("show");
                }
            }
        );
    });
}


export function renderPagination() {
    pagination.innerHTML = "";

    // Previous
    pagination.innerHTML += `
    <li class="page-item ${inventoryVariable.currentInventoryPage === 1 ? "disabled" : ""}">
        <button class="page-link page-btn" data-page="${inventoryVariable.currentInventoryPage - 1}">
            <i class="bi bi-chevron-left"></i>
        </button>
    </li>
    `;

    // Các nút số trang
    for (let i = 1; i <= inventoryVariable.totalPages; i++) {
        pagination.innerHTML += `
        <li class="page-item ${inventoryVariable.currentInventoryPage === i ? "active" : ""}">
            <button class="page-link page-btn" data-page="${i}">
                ${i}
            </button> 
        </li>
        `;
    }

    // Next
    pagination.innerHTML += `
    <li class="page-item ${inventoryVariable.currentInventoryPage === inventoryVariable.totalPages ? "disabled" : ""}">
        <button class="page-link page-btn" data-page="${inventoryVariable.currentInventoryPage + 1}">
            <i class="bi bi-chevron-right"></i>
        </button>
    </li>
    `;
}

export function validateProductForm() {
    let isValid = true;
    const fields = [
        "#productImage",
        "#productName",
        "#productCode",
        "#productBrand",
        "#productModel",
        "#productType",
        "#productStock",
        "#productDescription"
    ];

    fields.forEach(selector => {
        const element = $(selector);
        let value;
        if (element.attr("type") === "file") {
            value = element[0].files.length;
        } else {
            value = element.val().trim();
        }

        if (!value) {
            element.addClass("is-invalid");
            isValid = false;
        } else {
            element.removeClass("is-invalid");
        }

    });

    return isValid;

}

export function resetProductForm() {
    const form = $("#addProductForm")[0];

    form.reset();

    $("#addProductForm")
        .find(".is-invalid, .is-valid")
        .removeClass("is-invalid is-valid");
}

export function applyFilter() {
    inventoryVariable.inventoryItemFiltered =
        inventoryVariable.inventoryItemFull.filter(item => {
            const matchSearch =
                inventoryVariable.searchKeyword == "" ||
                item.name.toLowerCase().includes(inventoryVariable.searchKeyword) ||
                item.model.toLowerCase().includes(inventoryVariable.searchKeyword);

            const matchBrand =
                inventoryVariable.selectedBrand == "" ||
                item.brand == inventoryVariable.selectedBrand;

            return matchSearch && matchBrand;
        });

    inventoryVariable.currentInventoryPage = 1;

    renderTable(
        inventoryVariable.inventoryItemFiltered.slice(
            0,
            inventoryVariable.pageSize
        )
    );
}

export function createPayload() {
    const formData = new FormData();

    formData.append(
        "name",
        $("#productName").val().trim()
    );

    formData.append(
        "code",
        $("#productCode").val().trim()
    );

    formData.append(
        "brand",
        $("#productBrand").val()
    );

    formData.append(
        "model",
        $("#productModel").val().trim()
    );

    formData.append(
        "type",
        $("#productType").val()
    );

    formData.append(
        "stock",
        $("#productStock").val()
    );

    formData.append(
        "description",
        $("#productDescription").val().trim()
    );
    const image = $("#productImage")[0].files[0];
    if (image) {
        formData.append("image", image);
    }
    return formData;
}

/**
 * Mở form thêm vật tư mới với code (và số lượng) điền sẵn,
 * dùng khi quét một code chưa có trong kho.
 */
export function prefillProductForm({ code = "", stock = "" } = {}) {
    resetProductForm();
    $("#productCode").val(code);
    $("#productStock").val(stock);
}

// =====================================================
// IMPORT / EXPORT
// =====================================================

const QR_SIZE = 256;
// Kích thước tem in (mm) — chỉnh theo khổ giấy của máy in tem
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 30;
const LABEL_QR_MM = 22;

export function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

function getItemImageUrl(item) {
    return item.image
        ? `${URL_LOCAL}/api/files/Inventory_Items/${item.id}/${item.image}`
        : "";
}

/**
 * Gợi ý code cho ô tạo QR (code — tên vật tư).
 */
export function renderMaterialCodeOptions(items) {
    const datalist = document.getElementById("materialCodeList");
    if (!datalist) return;

    datalist.innerHTML = items
        .filter(item => item.code)
        .map(item => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.name)}</option>`)
        .join("");
}

// ---------- QR ----------

/**
 * Vẽ QR vào phần preview của popup Import.
 * @returns {boolean} false nếu thư viện QR chưa load
 */
export function renderQrPreview(code) {
    if (typeof QRCode === "undefined") {
        return false;
    }

    const container = document.getElementById("qrPreviewCode");
    container.innerHTML = "";
    new QRCode(container, {
        text: code,
        width: QR_SIZE,
        height: QR_SIZE,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });

    document.getElementById("qrPreviewText").textContent = code;
    document.getElementById("qrPreview").hidden = false;
    return true;
}

export function clearQrPreview() {
    document.getElementById("qrPreview").hidden = true;
    document.getElementById("qrPreviewCode").innerHTML = "";
    document.getElementById("qrPreviewText").textContent = "";
}

function getQrPreviewDataUrl() {
    const canvas = document.querySelector("#qrPreviewCode canvas");
    if (canvas) {
        return canvas.toDataURL("image/png");
    }
    return document.querySelector("#qrPreviewCode img")?.src || "";
}

/**
 * Mở cửa sổ in với `count` tem, mỗi tem một trang đúng khổ LABEL_WIDTH × LABEL_HEIGHT.
 * @returns {boolean} false nếu trình duyệt chặn pop-up
 */
export function printQrLabels(code, count) {
    const imageUrl = getQrPreviewDataUrl();
    const printWindow = window.open("", "_blank", "width=480,height=640");
    if (!printWindow) {
        return false;
    }

    const safeCode = escapeHtml(code);
    const label = `
        <div class="label">
            <img src="${imageUrl}" alt="QR ${safeCode}">
            <div class="code">${safeCode}</div>
        </div>`;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>QR labels - ${safeCode}</title>
<style>
    @page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; }
    .label {
        width: ${LABEL_WIDTH_MM}mm;
        height: ${LABEL_HEIGHT_MM}mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1mm;
        break-after: page;
    }
    .label:last-child { break-after: auto; }
    .label img {
        width: ${LABEL_QR_MM}mm;
        height: ${LABEL_QR_MM}mm;
        image-rendering: pixelated;
    }
    .code {
        max-width: ${LABEL_WIDTH_MM - 2}mm;
        font-size: 7pt;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
</head>
<body>${label.repeat(count)}</body>
</html>`);
    printWindow.document.close();

    // Chờ ảnh QR load xong rồi mới in
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
    return true;
}

// ---------- Scan result ----------

/**
 * @param {"importScanResult"|"exportScanResult"} id
 * @param {"success"|"error"|""} type
 */
export function setScanResult(id, html, type = "") {
    const element = document.getElementById(id);
    element.className = `scan-result ${type ? `is-${type}` : ""}`;
    element.innerHTML = html;
}

export function renderImportItem(item) {
    const imageUrl = getItemImageUrl(item);
    setScanResult("importScanResult", `
        <div class="scan-item">
            ${imageUrl ? `<img src="${imageUrl}" class="product-img" alt="">` : ""}
            <div>
                <div class="product-name">${escapeHtml(item.name)}</div>
                <small class="text-muted">
                    ${escapeHtml(item.model)} • ${escapeHtml(item.code)} • ${escapeHtml(item.brand)}
                </small>
            </div>
            <span class="scan-item-stock">In stock: <b>${escapeHtml(item.stock ?? 0)}</b></span>
        </div>
    `, "success");
}

export function renderImportNotFound(code) {
    setScanResult("importScanResult", `
        <i class="bi bi-exclamation-circle"></i>
        Code <b>${escapeHtml(code)}</b> is not in the inventory yet.
        <button type="button" class="btn btn-sm btn-outline-primary ms-2" id="createFromScanBtn">
            <i class="bi bi-plus-lg"></i> Create new material
        </button>
    `, "error");
}

export function setImportReady(isReady) {
    document.getElementById("importSaveBtn").disabled = !isReady;
}

export function setImportSaving(isSaving) {
    const button = document.getElementById("importSaveBtn");
    button.disabled = isSaving;
    button.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Saving...'
        : '<i class="bi bi-plus-lg"></i> Add to stock';
}

// ---------- Export table ----------

export function isExportRowValid({ item, quantity }) {
    return Boolean(quantity) && quantity <= (Number(item.stock) || 0);
}

export function renderExportTable(exportList) {
    const tbody = document.getElementById("exportTable");
    const saveButton = document.getElementById("exportSaveBtn");

    if (!exportList.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-upc-scan"></i> Scan a QR code to add materials
                </td>
            </tr>`;
        saveButton.disabled = true;
        return;
    }

    tbody.innerHTML = exportList.map(row => {
        const { item, quantity } = row;
        const imageUrl = getItemImageUrl(item);
        const stock = Number(item.stock) || 0;

        return `
        <tr data-item-id="${escapeHtml(item.id)}">
            <td>${imageUrl ? `<img src="${imageUrl}" class="product-img" alt="">` : ""}</td>
            <td><div class="product-name">${escapeHtml(item.name)}</div></td>
            <td>${escapeHtml(item.model)}</td>
            <td>${escapeHtml(item.code)}</td>
            <td>${escapeHtml(item.brand)}</td>
            <td>${stock}</td>
            <td>
                <input type="number" class="form-control form-control-sm export-quantity ${isExportRowValid(row) ? "" : "is-invalid"}"
                    min="1" max="${stock}" value="${quantity ?? ""}"
                    aria-label="Quantity out for ${escapeHtml(item.name)}">
                <div class="invalid-feedback">1 – ${stock}</div>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger export-remove"
                    aria-label="Remove ${escapeHtml(item.name)}">
                    <i class="bi bi-x-lg"></i>
                </button>
            </td>
        </tr>`;
    }).join("");

    updateExportSaveButton(exportList);
}

/**
 * Cập nhật trạng thái 1 ô số lượng mà không vẽ lại cả bảng (giữ focus khi đang gõ).
 */
export function updateExportQuantityInput(input, row) {
    input.classList.toggle("is-invalid", !isExportRowValid(row));
}

export function updateExportSaveButton(exportList) {
    document.getElementById("exportSaveBtn").disabled =
        !exportList.length || !exportList.every(isExportRowValid);
}

export function setExportSaving(isSaving, exportList = []) {
    const button = document.getElementById("exportSaveBtn");
    button.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Saving...'
        : '<i class="bi bi-check-lg"></i> Save';

    if (isSaving) {
        button.disabled = true;
    } else {
        updateExportSaveButton(exportList);
    }
}

