import * as service from "./service.js";
import * as ui from "./ui.js";
import * as events from "./events.js";
import * as utils from "../utils/utils.js";

import { importPageMessage as message } from "./messages.js";

// =====================================================
// TRANG NHẬP KHO: tạo / in tem QR + quét để cộng kho
// (chặn truy cập khi chưa đăng nhập: Script/auth/auth.js trong <head>)
// =====================================================
events.bindEvents();

try {
    ui.renderMaterialCodeOptions(await service.loadMaterials());
} catch (error) {
    console.error(error);
    utils.showError(message.loadFailed);
}
