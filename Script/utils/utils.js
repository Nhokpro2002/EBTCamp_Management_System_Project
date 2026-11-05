const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000
});


/**
 * Ngày từ PocketBase ("2026-11-04" / "2026-11-04 00:00:00.000Z") → hiển thị "04/11/2026".
 * Chỉ dùng để HIỂN THỊ; khi lưu xuống database vẫn dùng dạng yyyy-mm-dd.
 */
export function formatDateDisplay(dateStr) {
    const match = String(dateStr ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/**
 * Date (thời điểm) → "04/11/2026" theo giờ Việt Nam.
 */
export function formatDateTimeToDisplay(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).formatToParts(date).map(part => [part.type, part.value])
    );
    return `${parts.day}/${parts.month}/${parts.year}`;
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

/**
 * Popup xác nhận (OK / Cancel).
 * @returns {Promise<boolean>} true nếu người dùng xác nhận
 */
export async function showConfirm(title, text = "", confirmButtonText = "OK") {
    const result = await Swal.fire({
        title,
        text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText,
        confirmButtonColor: "#dc2626",
        cancelButtonText: "Cancel",
        focusCancel: true
    });
    return result.isConfirmed;
}

export function showPopup(title, text = "", icon = "info") {
    return Swal.fire({
        title,
        text,
        icon,
        confirmButtonText: "OK"
    });
}
