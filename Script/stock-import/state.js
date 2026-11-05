export const importState = {
    // Toàn bộ vật tư — gợi ý mã ở ô tạo tem
    items: [],

    // Vật tư đang xem trước tem (tính dải số khi đổi số tem mà không gọi lại API)
    previewItem: null,

    // Mã vừa tra mà chưa có trong kho → dùng để điền sẵn form tạo vật tư mới
    missingCode: "",

    // File Excel vừa đọc: { fileName, sheetName, hasDescription, hasPackSize,
    //   rows: [{ rowNumber, name, code, description, quantity, packSize, labelCount, action, status, ... }] }
    excelImport: null
};
