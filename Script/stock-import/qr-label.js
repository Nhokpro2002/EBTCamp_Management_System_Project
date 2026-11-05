import { escapeHtml } from "../services/inventory.api.js";

// =====================================================
// TEM QR: xem trước + in (mỗi tem một mã QR riêng, VD AAAA-51, AAAA-52, ...)
// =====================================================

const QR_SIZE = 256;
// Kích thước tem in (mm) — chỉnh theo khổ giấy của máy in tem
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 30;
const LABEL_QR_MM = 22;

export function isQrLibraryReady() {
    return typeof QRCode !== "undefined";
}

const QR_OPTIONS = () => ({
    width: QR_SIZE,
    height: QR_SIZE,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
});

/**
 * Tạo ảnh QR (data URL) cho một nội dung, vẽ ngoài màn hình.
 */
function createQrDataUrl(text) {
    const container = document.createElement("div");
    new QRCode(container, { text, ...QR_OPTIONS() });
    const canvas = container.querySelector("canvas");
    return canvas
        ? canvas.toDataURL("image/png")
        : container.querySelector("img")?.src || "";
}

/**
 * Xem trước tem đầu tiên của lượt in + dải số sẽ được cấp.
 * @param {{ firstLabel: string, lastLabel: string, count: number, itemName: string }} preview
 */
export function renderQrPreview({ firstLabel, lastLabel, count, itemName }) {
    const container = document.getElementById("qrPreviewCode");
    container.innerHTML = "";
    new QRCode(container, { text: firstLabel, ...QR_OPTIONS() });

    document.getElementById("qrPreviewText").innerHTML = `
        <div>${escapeHtml(firstLabel)}${count > 1 ? ` → ${escapeHtml(lastLabel)}` : ""}</div>
        <small class="qr-preview-sub">${escapeHtml(itemName)} · ${count} tem</small>`;
    document.getElementById("qrPreview").hidden = false;
}

export function clearQrPreview() {
    document.getElementById("qrPreview").hidden = true;
    document.getElementById("qrPreviewCode").innerHTML = "";
    document.getElementById("qrPreviewText").textContent = "";
}

/**
 * Mở cửa sổ in NGAY khi bấm nút (để trình duyệt không chặn pop-up),
 * nội dung tem được đổ vào sau khi cấp số xong.
 * @returns {Window|null} null nếu trình duyệt chặn pop-up
 */
export function openPrintWindow() {
    const printWindow = window.open("", "_blank", "width=480,height=640");
    if (!printWindow) return null;

    printWindow.document.write(
        '<!DOCTYPE html><meta charset="UTF-8"><title>Tem QR</title>' +
        '<p style="font-family:Arial,sans-serif;padding:16px">Đang chuẩn bị tem...</p>'
    );
    printWindow.document.close();
    return printWindow;
}

/**
 * In danh sách tem, mỗi tem một trang đúng khổ LABEL_WIDTH × LABEL_HEIGHT.
 * @param {Window} printWindow cửa sổ đã mở bằng openPrintWindow()
 * @param {string[]} labelTexts
 */
export function printQrLabels(printWindow, labelTexts) {
    const title = labelTexts.length > 1
        ? `${labelTexts[0]} → ${labelTexts[labelTexts.length - 1]}`
        : labelTexts[0];

    const labels = labelTexts.map(text => {
        const safeText = escapeHtml(text);
        return `
        <div class="label">
            <img src="${createQrDataUrl(text)}" alt="QR ${safeText}">
            <div class="code">${safeText}</div>
        </div>`;
    }).join("");

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Tem QR - ${escapeHtml(title)}</title>
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
<body>${labels}</body>
</html>`);
    printWindow.document.close();

    // Chờ ảnh QR (data URL) hiển thị xong rồi mới in
    const images = [...printWindow.document.images];
    Promise.all(images.map(image => image.complete
        ? Promise.resolve()
        : new Promise(resolve => { image.onload = image.onerror = resolve; })
    )).then(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    });
}
