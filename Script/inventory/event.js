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


    document.getElementById("addProductModal").addEventListener("hidden.bs.modal", function () {
        ui.resetProductForm();
    });

    const btnDeleteSelected = document.getElementById("btnDeleteSelected");

    document.getElementById("btnDeleteSelected").addEventListener("click", async () => {
        const IDList = Array.from(
            document.querySelectorAll(".row-checkbox:checked")
        ).map(checkbox => checkbox.value);

        if (IDList.length === 0) {
            alert("Please select at least one item.");
            return;
        }

        const confirmed = confirm(`Delete ${IDList.length} selected item(s)?`);
        if (!confirmed) return;

        await service.deleteItem(IDList);


        inventoryVariable.inventoryItemFiltered =
            inventoryVariable.inventoryItemFiltered.filter(
                item => !IDList.includes(item.id)
            );

        ui.renderTable(inventoryVariable.inventoryItemFiltered);
    });


}