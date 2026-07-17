import { URL_LOCAL } from "../config.js";

const USERS = "users";

let touched = {
    employee_id: false,
    employee_name: false,
    email: false,
    password: false,
    passwordConfirm: false,
    department: false

};

function validateForm() {
    let valid = true;

    // EMPLOYEE ID
    const emp = $("#employee_id").val().trim();

    const onlyValidChars = /^[a-z0-9]{10,255}$/.test(emp);
    const hasLetter = /[a-z]/.test(emp);
    const hasNumber = /[0-9]/.test(emp);

    if (touched.employee_id) {

        if (!onlyValidChars || !hasLetter || !hasNumber) {

            $("#error_employee_id").text(
                "10-255 chars, must contain lowercase letters and numbers"
            );

            $("#employee_id")
                .addClass("is-invalid")
                .removeClass("is-valid");

            valid = false;

        } else {

            $("#error_employee_id").text("");

            $("#employee_id")
                .addClass("is-valid")
                .removeClass("is-invalid");
        }
    }


    const employeeName = $("#employee_name").val().trim();
    if (touched.employee_name) {
        if (employeeName === "") {
            $("#error_employee_name").text("Employee name required");
            $("#employee_name")
                .addClass("is-invalid")
                .removeClass("is-valid");
            valid = false;
        } else {
            $("#error_employee_name").text("");
            $("#employee_name")
                .addClass("is-valid")
                .removeClass("is-invalid");
        }
    }

    // DEPARTMENT
    const department = $("#department").val();

    if (touched.department) {

        if (department === "") {

            $("#errorDepartment").text(
                "Please select your department"
            );

            $("#department")
                .addClass("is-invalid")
                .removeClass("is-valid");

            valid = false;

        } else {

            $("#errorDepartment").text("");

            $("#department")
                .addClass("is-valid")
                .removeClass("is-invalid");
        }
    }

    // EMAIL
    const email = $("#email").val().trim();
    const emailRegex = /^[A-Za-z0-9._%+-]+@lgdisplay\.com$/;
    if (touched.email) {
        if (!emailRegex.test(email)) {
            $("#errorEmail").text("Must contain @lgdisplay.com");
            $("#email").addClass("is-invalid").removeClass("is-valid");
            valid = false;
        } else {
            $("#errorEmail").text("");
            $("#email").addClass("is-valid").removeClass("is-invalid");
        }
    }

    // PASSWORD
    const password = $("#password").val();
    const okPassword =
        /^.{8,30}$/.test(password) &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (touched.password) {
        if (!okPassword) {
            $("#errorPassword").text("8-30 chars, uppercase, number, special character required");
            $("#password").addClass("is-invalid").removeClass("is-valid");
            valid = false;
        } else {
            $("#errorPassword").text("");
            $("#password").addClass("is-valid").removeClass("is-invalid");
        }
    }

    // CONFIRM PASSWORD
    const confirm = $("#passwordConfirm").val();
    if (touched.passwordConfirm) {
        if (confirm !== password || confirm === "") {
            $("#errorPasswordConfirm").text("Not match password");
            $("#passwordConfirm").addClass("is-invalid").removeClass("is-valid");
            valid = false;
        } else {
            $("#errorPasswordConfirm").text("");
            $("#passwordConfirm").addClass("is-valid").removeClass("is-invalid");
        }
    }

    $("#register-btn").prop("disabled", !valid);
    return valid;
}

function setupTouchEvents() {
    $("#employee_id, #employee_name, #email, #password, #passwordConfirm, #department").on("blur", function () {
        const id = $(this).attr("id");
        touched[id] = true;
        validateForm();
    });

    $("input").on("input", function () {
        validateForm();
    });
}

async function registerNewUser() {
    Object.keys(touched).forEach(k => touched[k] = true);

    if (!validateForm()) {
        Swal.fire("Error", "Please fix validation errors", "error");
        return;
    }

    const newUserData = {
        employee_id: $("#employee_id").val().trim(),
        employee_name: $("#employee_name").val().trim(),
        email: $("#email").val().trim(),
        department: $("#department").val(),
        password: $("#password").val(),
        passwordConfirm: $("#passwordConfirm").val()
    };

    try {
        const res = await fetch(`${URL_LOCAL}/api/collections/${USERS}/records`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUserData)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Create failed");

        Swal.fire({
            icon: "success",
            title: "Success",
            text: "Register account successfully",
            confirmButtonText: "OK"
        }).then((result) => {

            if (result.isConfirmed) {

                Swal.showLoading();

                setTimeout(() => {
                    window.location.href =
                        "login.html";
                }, 1000);
            }
        });
    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: error.message,
            showConfirmButton: true

            // Ở đây có thể thêm tính năng, khi nhấn button "OK" thì sẽ reset toàn bộ các field input ở form
        });
    }
}

$(document).ready(function () {
    setupTouchEvents();
    validateForm();
});

$("#register-btn").on("click", function () {
    registerNewUser();
});