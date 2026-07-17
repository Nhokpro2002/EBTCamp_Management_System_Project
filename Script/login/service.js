import * as api from "../services/generic.api.js";
import * as utils from "../utils/utils.js";

const COLLECTION_USERS = "Users";

export async function loginUser(data) {
    try {
        const res = await api.login(COLLECTION_USERS, data);

        const text = await res.text();
        const result = text ? JSON.parse(text) : {};

        if (!res.ok) {
            throw new Error(result.message || "Invalid email or password");
        }

        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.record));

        setTimeout(() => {
            window.location.href = "inventory.html";
        }, 500);

    } catch (error) {
        console.error("Login error:", error.message);

        await utils.showPopup(
            "Login failed",
            error.message || "Invalid email or password",
            "error"
        );
    }
}