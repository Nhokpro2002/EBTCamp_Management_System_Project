export const exportPageMessage = {
    lookupFailed: "Không tra cứu được mã này. Vui lòng thử lại.",
    notFound: "không có trong kho.",
    outOfStock: "đã hết hàng.",
    overStock: stock => `vượt tồn kho (đang tồn ${stock}).`,

    listEmpty: "Hãy quét ít nhất một vật tư trước.",
    invalidQuantity: "Số lượng phải là số nguyên lớn hơn 0 và không vượt quá tồn kho.",

    confirmTitle: "Xuất kho?",
    confirmText: (count, total) => `${count} vật tư, tổng ${total} cái sẽ bị trừ khỏi tồn kho.`,
    exportSuccess: "Xuất kho thành công",
    exportFailed: "Một số vật tư xuất kho không thành công",

    leaveWarning: "Danh sách xuất kho chưa được lưu. Rời trang?"
};
