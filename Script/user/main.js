import * as service from "./service.js";
import * as ui from "./ui.js";
import * as events from "./events.js";

import { userState as state } from "./state.js";
import { userPageMessage as message } from "./messages.js";

// =====================================================
// INIT
// File này được nạp ở mọi trang có sidebar để hiện tên / avatar người dùng.
// Riêng trang Profile (có #profile-page) thì dựng thêm phần hồ sơ.
// =====================================================
state.user = service.readStoredUser();

if (state.user) {
    ui.renderSidebarUser(state.user);
}

if (document.getElementById("profile-page")) {
    initProfilePage();
}

function initProfilePage() {
    if (!state.user?.id) {
        ui.showAlert("Chưa đăng nhập", message.notSignedIn, "error");
        return;
    }

    ui.renderProfileHeader(state.user);
    ui.renderAbout(state.user);
    ui.renderPositionOptions(state.user);
    events.bindProfileEvents();
}
