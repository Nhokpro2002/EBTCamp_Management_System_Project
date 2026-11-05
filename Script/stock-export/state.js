export const exportState = {
    // Danh sách vật tư đã quét, chờ trừ kho.
    // Mỗi dòng: { item, quantity } — quantity = SL xuất, mỗi lần quét cùng mã +1
    list: [],

    // Đang tra cứu một mã (bỏ qua lần quét chồng lên)
    isLookingUp: false
};
