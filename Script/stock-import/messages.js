export const MAX_LABELS = 200;
// Tổng số tem tối đa cho một lần nhập từ Excel (tạo QR cho quá nhiều tem làm treo trình duyệt)
export const MAX_EXCEL_LABELS = 2000;

export const importPageMessage = {
    loadFailed: "Không tải được danh sách vật tư.",

    codeRequired: "Vui lòng nhập mã vật tư.",
    labelCountInvalid: `Số tem phải từ 1 đến ${MAX_LABELS}.`,
    qrLibraryMissing: "Không tải được thư viện tạo QR.",
    printBlocked: "Vui lòng cho phép cửa sổ bật lên (pop-up) để in tem QR.",
    printFailed: "Không thể in tem và cập nhật tồn kho. Vui lòng thử lại.",
    lookupFailed: "Không tra cứu được mã này. Vui lòng thử lại.",
    printed: (labels, stock) =>
        `Đã in ${labels.length} tem (${labels[0]} → ${labels[labels.length - 1]}) · tồn kho mới: ${stock}`,

    saveSuccess: "Đã thêm vật tư mới — có thể in tem ngay",
    saveFailed: "Không thể thêm vật tư mới"
};

export const excelImportMessage = {
    libraryMissing: "Không tải được thư viện đọc Excel (ExcelJS).",
    invalidFile: "Vui lòng chọn file Excel định dạng .xlsx.",
    readFailed: "Không đọc được file Excel.",
    nothingToImport: "Không có dòng hợp lệ nào để nhập kho.",
    tooManyLabels: count =>
        `Tổng ${count} tem vượt quá giới hạn ${MAX_EXCEL_LABELS} tem / lần. Vui lòng chia nhỏ file.`,
    confirmTitle: (rows, labels) => `Nhập kho ${rows} vật tư và in ${labels} tem?`,
    confirmText: create =>
        (create ? `${create} mã chưa có sẽ được tạo mới. ` : "") +
        "Tồn kho và số tem được cập nhật ngay khi bấm, trước khi in.",
    confirmButton: "Nhập kho & in tem",
    imported: (rows, labels) => `Đã nhập kho ${rows} vật tư · ${labels} tem`,
    partialFailed: (done, errors) =>
        `Đã nhập kho ${done} vật tư, ${errors.length} dòng lỗi. ${errors.slice(0, 3).join(" · ")}${errors.length > 3 ? " · ..." : ""}`,
    allFailed: errors =>
        `Không nhập kho được dòng nào. ${errors.slice(0, 3).join(" · ")}${errors.length > 3 ? " · ..." : ""}`
};
