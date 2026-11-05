import * as api from "../services/generic.api.js";
import * as utils from "../utils/utils.js";

const COLLECTION_USERS = "Users";

export async function loginUser(data) {
    try {
        const res = await api.login(COLLECTION_USERS, data);

        const text = await res.text();
        const result = text ? JSON.parse(text) : {};

        if (!res.ok) {
            throw new Error("Email hoặc mật khẩu không đúng.");
        }

        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.record));

        // Quay lại trang đang mở trước khi bị chuyển về login (auth.js), mặc định là Inventory
        const target = window.EBTAuth?.getRedirectTarget() ?? "inventory.html";
        setTimeout(() => {
            window.location.replace(target);
        }, 500);

    } catch (error) {
        console.error("Login error:", error.message);

        await utils.showPopup(
            "Đăng nhập thất bại",
            error.message || "Email hoặc mật khẩu không đúng.",
            "error"
        );
    }
}