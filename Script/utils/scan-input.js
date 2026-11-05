// =====================================================
// MÁY QUÉT QR CẦM TAY (USB HID)
// Máy quét "gõ" từng ký tự rất nhanh rồi gửi Enter; người gõ tay chậm hơn nhiều
// → dựa vào khoảng cách giữa các phím để nhận ra một lần quét.
// Dùng chung cho Lưu kho (quét để lọc) / Nhập kho / Xuất kho.
// =====================================================

// Các phím cách nhau dưới mức này → đang quét
export const SCAN_MAX_KEY_GAP_MS = 60;
// Mã ngắn hơn mức này không coi là một lần quét
export const SCAN_MIN_LENGTH = 3;
// Ngừng gõ lâu hơn mức này sau một loạt ký tự nhanh → coi như đã quét xong một mã
export const SCAN_END_GAP_MS = 300;

/**
 * Ô "Mã đã quét": lần quét mới tự THAY nội dung của lần quét trước (không nối thêm).
 *
 * Một lần quét được coi là xong khi:
 *  - đã nhấn Enter (gọi markDone), hoặc
 *  - máy quét vừa "gõ" một loạt ký tự rất nhanh rồi dừng (máy không gửi Enter).
 * Phím đầu tiên sau đó sẽ xóa nội dung cũ. Gõ tay (chậm) thì vẫn gõ nối bình thường.
 *
 * @returns {{ markDone: () => void }}
 */
export function setupScanInput(input) {
    let isDone = false;
    let lastKeyTime = 0;
    let fastKeyCount = 0;

    // Click / focus vào ô → bôi đen sẵn, quét hay gõ là thay luôn
    input.addEventListener("focus", () => input.select());

    input.addEventListener("keydown", event => {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;

        const now = performance.now();
        const gap = now - lastKeyTime;
        const previousWasScan = fastKeyCount >= SCAN_MIN_LENGTH;

        if (input.value && (isDone || (previousWasScan && gap > SCAN_END_GAP_MS))) {
            input.value = "";
            fastKeyCount = 0;
        }
        isDone = false;

        fastKeyCount = gap <= SCAN_MAX_KEY_GAP_MS ? fastKeyCount + 1 : 1;
        lastKeyTime = now;
    });

    return {
        markDone() {
            isDone = true;
            fastKeyCount = 0;
        }
    };
}

/**
 * Máy quét gửi Enter sau mỗi mã → gọi handler.
 */
export function onEnter(element, handler) {
    element.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        handler();
    });
}

/**
 * Đang gõ vào một ô nhập (để bộ nhận quét toàn trang không chen vào).
 */
export function isTypingTarget(element) {
    return element instanceof HTMLElement && (
        element.isContentEditable ||
        element.matches("textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=button])")
    );
}
