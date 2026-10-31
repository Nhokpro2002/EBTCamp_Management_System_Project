// =====================================================
// POCKETBASE SERVER
// Chỉ cần đổi ACTIVE_URL sang URL_PRODUCTION hoặc URL_TEST,
// mọi request API và đường dẫn ảnh đều dùng URL này.
// =====================================================
const URL_PRODUCTION = "http://127.0.0.1:8090"; // TODO: thay bằng địa chỉ server thật
const URL_TEST = "http://127.0.0.1:8090";

const ACTIVE_URL = URL_TEST;

// Bỏ dấu "/" ở cuối để không tạo ra đường dẫn dạng "...8090//api/..."
export const URL_LOCAL = ACTIVE_URL.trim().replace(/\/+$/, "");
