// =====================================================
// Ô NGÀY HIỂN THỊ dd/mm/yyyy — giá trị vẫn là yyyy-mm-dd (định dạng PocketBase cần)
//
// <input type="date"> của trình duyệt hiển thị theo ngôn ngữ hệ điều hành (có máy là mm/dd/yyyy).
// Module này gắn vào MỌI <input type="date"> (kể cả ô tạo sau bằng JS):
//   - Thêm 1 ô chữ hiển thị / cho gõ ngày dạng dd/mm/yyyy + nút lịch mở bộ chọn ngày gốc.
//   - Ô date gốc vẫn giữ nguyên id / class / name và vẫn chứa giá trị yyyy-mm-dd,
//     chỉ ẩn đi → mọi code đọc input.value để lưu xuống database KHÔNG phải sửa.
//   - Gán input.value = "yyyy-mm-dd" bằng code thì ô hiển thị tự cập nhật.
//   - Gõ / chọn ngày → ô gốc nhận giá trị mới và phát sự kiện input + change như bình thường.
//
// Được Script/auth/auth.js nạp ở mọi trang cần đăng nhập.
// =====================================================

const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

/**
 * "2026-11-04" (hoặc "2026-11-04 00:00:00.000Z") → "04/11/2026"
 */
export function isoToDisplay(value) {
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/**
 * "4/11/2026" hoặc "04/11/2026" → "2026-11-04"; ngày không có thật → null
 */
export function displayToIso(text) {
    const match = String(text ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Tự chèn dấu "/" khi gõ số: "04112026" → "04/11/2026"
 */
function maskDigits(text) {
    const digits = text.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function getLabelText(input) {
    if (input.getAttribute("aria-label")) return input.getAttribute("aria-label");
    if (input.id) {
        const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (label) return label.textContent.trim();
    }
    return "Ngày";
}

function isOutOfRange(iso, input) {
    return (input.min && iso < input.min) || (input.max && iso > input.max);
}

function enhance(input) {
    if (input.dataset.dmyDate) return;
    input.dataset.dmyDate = "1";

    const wrapper = document.createElement("span");
    wrapper.className = "dmy-date";

    // Chỉ chép class giao diện của Bootstrap; KHÔNG chép class chức năng (VD .deadline-input)
    // để querySelector của code cũ vẫn tìm đúng ô date gốc
    const text = document.createElement("input");
    text.type = "text";
    text.className = [...input.classList]
        .filter(name => name.startsWith("form-control"))
        .concat("dmy-date-text")
        .join(" ");
    text.placeholder = "dd/mm/yyyy";
    text.inputMode = "numeric";
    text.autocomplete = "off";
    text.maxLength = 10;
    text.setAttribute("aria-label", `${getLabelText(input)} (ngày/tháng/năm)`);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "dmy-date-button";
    button.tabIndex = -1;
    button.setAttribute("aria-label", "Mở lịch chọn ngày");
    button.innerHTML = '<i class="bi bi-calendar3" aria-hidden="true"></i>';

    input.replaceWith(wrapper);
    wrapper.append(text, button, input);
    input.classList.add("dmy-date-native");
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");

    const syncDisplay = () => {
        text.value = isoToDisplay(nativeValue.get.call(input));
        text.classList.remove("is-invalid");
    };
    const syncState = () => {
        text.disabled = input.disabled;
        text.readOnly = input.readOnly;
        text.required = input.required;
        button.disabled = input.disabled || input.readOnly;
    };

    // input.value = "yyyy-mm-dd" bằng code → cập nhật luôn ô hiển thị
    Object.defineProperty(input, "value", {
        configurable: true,
        get() {
            return nativeValue.get.call(this);
        },
        set(value) {
            nativeValue.set.call(this, value);
            syncDisplay();
        }
    });

    const commit = iso => {
        if (nativeValue.get.call(input) === iso) return;
        nativeValue.set.call(input, iso);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    // Sự kiện của ô hiển thị không lan ra ngoài (code cũ chỉ nghe ô date gốc)
    text.addEventListener("input", event => {
        event.stopPropagation();
        const masked = maskDigits(text.value);
        if (masked !== text.value) text.value = masked;

        if (!text.value) {
            text.classList.remove("is-invalid");
            commit("");
            return;
        }
        const iso = displayToIso(text.value);
        if (iso && !isOutOfRange(iso, input)) {
            text.classList.remove("is-invalid");
            commit(iso);
        }
    });

    text.addEventListener("change", event => event.stopPropagation());

    // Rời ô mà ngày chưa hợp lệ → báo đỏ rồi trả lại ngày đang lưu
    text.addEventListener("blur", () => {
        if (!text.value) return;
        const iso = displayToIso(text.value);
        if (!iso || isOutOfRange(iso, input)) {
            text.classList.add("is-invalid");
            setTimeout(syncDisplay, 1200);
        } else {
            syncDisplay();
        }
    });

    // Chọn trong lịch → ô gốc phát input/change → cập nhật ô hiển thị
    input.addEventListener("input", syncDisplay);
    input.addEventListener("change", syncDisplay);

    button.addEventListener("click", () => {
        try {
            input.showPicker();
        } catch {
            input.focus();
            input.click();
        }
    });

    // Code cũ bật / tắt disabled, readonly... trên ô gốc → đồng bộ sang ô hiển thị
    new MutationObserver(syncState).observe(input, {
        attributes: true,
        attributeFilter: ["disabled", "readonly", "required"]
    });

    syncState();
    syncDisplay();
}

function enhanceAll(root = document) {
    if (root instanceof HTMLInputElement) {
        if (root.type === "date") enhance(root);
        return;
    }
    root.querySelectorAll?.('input[type="date"]').forEach(enhance);
}

function injectStyles() {
    if (document.getElementById("dmy-date-styles")) return;

    const style = document.createElement("style");
    style.id = "dmy-date-styles";
    style.textContent = `
        .dmy-date { position: relative; display: block; width: 100%; min-width: 0; }
        .dmy-date-text { width: 100%; padding-right: 34px !important; }
        .dmy-date-text.is-invalid { border-color: #dc2626 !important; box-shadow: 0 0 0 3px rgba(220, 38, 38, .12) !important; }
        .dmy-date-button {
            position: absolute; top: 50%; right: 6px; transform: translateY(-50%);
            display: inline-flex; align-items: center; justify-content: center;
            width: 26px; height: 26px; padding: 0; border: 0; border-radius: 6px;
            background: transparent; color: #64748b; cursor: pointer;
        }
        .dmy-date-button:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
        .dmy-date-button:disabled { opacity: .5; cursor: not-allowed; }
        /* Ô date gốc: ẩn nhưng vẫn "được hiển thị" để showPicker() mở lịch ngay dưới ô */
        .dmy-date .dmy-date-native {
            position: absolute !important; right: 0; bottom: 0;
            width: 1px !important; height: 1px !important; min-width: 0 !important;
            padding: 0 !important; border: 0 !important; margin: 0 !important;
            opacity: 0; pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}

injectStyles();
enhanceAll();

// Ô date được tạo sau bằng JS (bảng Đặt hàng, cột Thời hạn của Issues, popup...)
new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) enhanceAll(node);
    }));
}).observe(document.body, { childList: true, subtree: true });
