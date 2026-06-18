const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000
});


function formatDate(dateStr) {
    const d = new Date(dateStr);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");

    return `${day}/${month}`;
}


function showSuccess(message) {
    Toast.fire({
        icon: "success",
        title: message
    });
}

function showError(message) {
    Toast.fire({
        icon: "error",
        title: message
    });
}
