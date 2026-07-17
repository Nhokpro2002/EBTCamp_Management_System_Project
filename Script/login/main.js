import { loginUser } from "./service.js";

$("#loginForm").on("submit", async function (e) {
    e.preventDefault(); // chặn reload trang

    const loginData = {
        identity: $("#email").val().trim(),
        password: $("#password").val().trim()
    };

    await loginUser(loginData);
});

