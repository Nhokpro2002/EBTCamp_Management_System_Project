// =====================================================
// ĐỌC FILE EXCEL NHẬP KHO (thư viện ExcelJS — Libs/ExcelJS/exceljs.min.js)
// Không đụng DOM, không gọi API: chỉ đọc file → danh sách dòng.
//
// Cột trong sheet          → dùng cho
//   Tên sản phẩm            → name
//   QCode/XCode             → code
//   Mô tả                   → description (không bắt buộc)
//   Số lượng                → số lượng nhập
//   Đơn vị đóng gói         → số chiếc / 1 gói (không bắt buộc)
// =====================================================

// Số dòng đầu tiên được dò để tìm dòng tiêu đề (sheet có thể có tiêu đề lớn / logo phía trên)
const HEADER_SEARCH_ROWS = 15;

/**
 * Tên cột chấp nhận cho từng field (đã chuẩn hóa: bỏ dấu, bỏ khoảng trắng / ký tự đặc biệt).
 */
const COLUMN_ALIASES = {
    name: ["tensanpham", "tenvattu", "tenhang", "name"],
    code: ["qcodexcode", "xcodeqcode", "qcode", "xcode", "code", "mavattu"],
    description: ["mota", "description"],
    quantity: ["soluong", "sl", "quantity", "qty"],
    packSize: ["donvidonggoi", "dvdonggoi", "quycachdonggoi", "donggoi", "packsize", "packing"]
};

// Cột bắt buộc phải có trong dòng tiêu đề
const REQUIRED_COLUMNS = ["name", "code", "quantity"];

export const COLUMN_LABELS = {
    name: "Tên sản phẩm",
    code: "QCode/XCode",
    description: "Mô tả",
    quantity: "Số lượng",
    packSize: "Đơn vị đóng gói"
};

export function isExcelLibraryReady() {
    return Boolean(window.ExcelJS);
}

/**
 * "Tên sản phẩm" → "tensanpham", "QCode / XCode" → "qcodexcode".
 */
function normalizeHeader(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/gi, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

/**
 * Giá trị chữ của 1 ô (ô có thể là rich text, công thức, hyperlink, số, ngày...).
 */
function getCellText(cell) {
    const value = cell?.value;
    if (value == null) return "";

    if (typeof value === "object") {
        if (Array.isArray(value.richText)) {
            return value.richText.map(part => part.text).join("").trim();
        }
        if ("result" in value) return String(value.result ?? "").trim();   // công thức
        if ("text" in value) return String(value.text ?? "").trim();       // hyperlink
        if (value instanceof Date) return value.toLocaleDateString("vi-VN");
    }
    return String(value).trim();
}

/**
 * Tìm dòng tiêu đề: dòng đầu tiên có đủ các cột bắt buộc.
 * @returns {{ headerRow: number, columns: Record<string, number|null> } | null}
 */
function findHeader(worksheet) {
    const lastRow = Math.min(worksheet.rowCount, HEADER_SEARCH_ROWS);

    for (let rowNumber = 1; rowNumber <= lastRow; rowNumber++) {
        const columns = Object.fromEntries(Object.keys(COLUMN_ALIASES).map(key => [key, null]));

        worksheet.getRow(rowNumber).eachCell((cell, columnNumber) => {
            const header = normalizeHeader(getCellText(cell));
            Object.entries(COLUMN_ALIASES).forEach(([key, aliases]) => {
                if (columns[key] === null && aliases.includes(header)) {
                    columns[key] = columnNumber;
                }
            });
        });

        if (REQUIRED_COLUMNS.every(key => columns[key] !== null)) {
            return { headerRow: rowNumber, columns };
        }
    }
    return null;
}

/**
 * Đọc file Excel (.xlsx) → các dòng nhập kho, GIỮ ĐÚNG THỨ TỰ trong sheet.
 * Dò lần lượt các sheet, lấy sheet đầu tiên có đủ cột bắt buộc.
 * Dòng trống hoàn toàn bị bỏ qua. Số lượng / Đơn vị đóng gói trả về dạng chữ thô,
 * việc kiểm tra + tính toán nằm ở service.js.
 * @param {File} file
 * @returns {Promise<{ sheetName: string, hasDescription: boolean, hasPackSize: boolean,
 *   rows: Array<{ rowNumber: number, name: string, code: string, description: string,
 *                 quantity: string, packSize: string }> }>}
 */
export async function readStockSheet(file) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());

    for (const worksheet of workbook.worksheets) {
        const header = findHeader(worksheet);
        if (!header) continue;

        const { headerRow, columns } = header;
        const readCell = (row, key) => columns[key] ? getCellText(row.getCell(columns[key])) : "";
        const rows = [];

        for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const data = { rowNumber };
            Object.keys(COLUMN_ALIASES).forEach(key => { data[key] = readCell(row, key); });

            if (Object.keys(COLUMN_ALIASES).some(key => data[key])) rows.push(data);
        }

        return {
            sheetName: worksheet.name,
            hasDescription: columns.description !== null,
            hasPackSize: columns.packSize !== null,
            rows
        };
    }

    const required = REQUIRED_COLUMNS.map(key => `"${COLUMN_LABELS[key]}"`).join(", ");
    throw new Error(`Không tìm thấy đủ các cột ${required} trong file Excel.`);
}

/**
 * File mẫu: dòng tiêu đề đúng tên cột + 2 dòng ví dụ (theo chiếc / theo gói).
 * @returns {Promise<Blob>}
 */
export async function createTemplateBlob() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Nhap kho");

    sheet.columns = [
        { header: COLUMN_LABELS.name, width: 32 },
        { header: COLUMN_LABELS.code, width: 18 },
        { header: COLUMN_LABELS.description, width: 40 },
        { header: COLUMN_LABELS.quantity, width: 12 },
        { header: COLUMN_LABELS.packSize, width: 18 }
    ];
    sheet.addRow(["Relay 24VDC", "AAAA", "Tính theo chiếc: 5 chiếc → 5 tem", 5, null]);
    sheet.addRow(["Terminal Block 2.5mm", "BBBB", "Tính theo gói: 100 / 10 → 10 tem", 100, 10]);

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
}
