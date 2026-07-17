import { inventoryVariable } from "./state.js";
import * as ui from "./ui.js";
import * as service from "./service.js";

export function initEvent() {
    const pagination = document.getElementById("pagination");
    pagination.addEventListener(
        "click",
        (e) => {
            const btn =
                e.target.closest(".page-btn");
            if (!btn) return;
            service.changePage(
                Number(btn.dataset.page)
            );
        });


    const bindFilter = (id, event, key, transform = value => value) => {
        const element = document.getElementById(id);

        element.addEventListener(event, () => {
            inventoryVariable[key] = transform(element.value);
            ui.applyFilter();
        });
    };

    bindFilter(
        "searchInput",
        "input",
        "searchKeyword",
        value => value.toLowerCase().trim()
    );

    bindFilter("brandFilter", "change", "selectedBrand");
    bindFilter("typeFilter", "change", "selectedType");

    document
        .getElementById("saveProductBtn")
        .addEventListener("click", () => {
            if (!ui.validateProductForm()) return;
            const inventoryItemData = ui.createPayload();
            service.saveItem(inventoryItemData);
        });

    document
        .getElementById("addProductModal")
        .addEventListener("hidden.bs.modal", () => {
            ui.resetProductForm();
        });

    document.querySelector(".container-fluid").style.display = "block";

}