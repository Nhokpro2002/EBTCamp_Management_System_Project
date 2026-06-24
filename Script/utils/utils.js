const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000
});


export function formatDateInput(dateStr) {
    if (!dateStr) return "";

    // yyyy-MM-dd hoặc yyyy-MM-dd HH:mm:ss...
    const datePart = dateStr.split(" ")[0];
    const [year, month, day] = datePart.split("-");

    if (!year || !month || !day) return "";

    return `${month}/${day}/${year}`;
}

export function formatDateDisplay(dateStr) {
    if (!dateStr) return "";
    return dateStr.split(" ")[0];
}


export function showSuccess(message) {
    Toast.fire({
        icon: "success",
        title: message
    });
}

export function showError(message) {
    Toast.fire({
        icon: "error",
        title: message
    });
}

export function showWarning(message) {
    Toast.fire({
        icon: "error",
        title: message
    });
}

export function showPopup(title, text = "", icon = "info") {
    return Swal.fire({
        title,
        text,
        icon,
        confirmButtonText: "OK"
    });
}
