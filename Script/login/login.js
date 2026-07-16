const USERS = "Users";
const POCKETBASE_URL = "http://127.0.0.1:8090";

$("#loginForm").on("submit", function (e) {
    e.preventDefault(); // chặn reload trang
    login();
});

async function login() {
    const loginData = {
        identity: $("#email").val().trim(),
        password: $("#password").val().trim()
    };

    try {
        const res = await fetch(`${POCKETBASE_URL}/api/collections/${USERS}/auth-with-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginData)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Email hoặc mật khẩu không đúng");
        }

        // Save session
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.record));

        Swal.fire({
            icon: "success",
            title: "Success",
            text: "Login successfully",
            confirmButtonText: "OK"
        }).then(() => {
            // Cần sửa đường dẫn 
            // ! Error
            window.location.href = "http://127.0.0.1:5500/Page/inventory.html";
        });

    } catch (error) {

        Swal.fire({
            icon: "error",
            title: "Login Failed",
            text: error.message || "Something went wrong"
        });

        console.error("Login error:", error);
    }
}