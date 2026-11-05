import * as events from "./events.js";

// =====================================================
// TRANG XUẤT KHO: quét vật tư vào danh sách → sửa số lượng → lưu (trừ kho)
// (chặn truy cập khi chưa đăng nhập: Script/auth/auth.js trong <head>)
// =====================================================
events.bindEvents();
events.render();
