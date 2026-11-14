// =====================================================
// STATE DÙNG CHUNG cho 2 trang:
//   - order.html          (Tạo đơn hàng: đơn của tháng hiện tại, sửa được)
//   - order-tracking.html (Theo dõi đơn hàng: mọi đơn, chỉ xem)
//
// Orders      = "thùng chứa": mỗi tháng 1 đơn (field month), mua chung cho nhiều dự án
// Order_Items = từng vật tư trong đơn (relation order → Orders)
// =====================================================
export const orderPageState = {
    // true = bảng cho sửa / chọn dòng (trang Tạo đơn hàng)
    editable: true,

    // Đơn hàng (Orders) đang làm việc ở trang Tạo đơn hàng
    monthOrder: null,
    // Tất cả đơn hàng (Orders) - trang Theo dõi
    monthOrders: [],

    // Vật tư trong đơn (Order_Items), kèm expand requester / project / order
    items: [],
    // Danh sách sau khi lọc (đang hiển thị, có phân trang)
    filtered: [],

    users: [],
    projects: [],
    inventory: [],

    filters: {
        order: "",   // id của Orders ("" = tất cả) - trang Theo dõi
        project: "",
        name: "",    // viết thường
        code: ""     // viết thường
    },

    currentPage: 1,
    pageSize: 10
};
