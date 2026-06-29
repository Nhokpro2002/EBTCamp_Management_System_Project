// tên sản phảm, month, QCode/XCode, Mô tả, số lượng, đơn giá, tổng, người yêu cầu, ngày yêu cầu, dự án
import { variableGlobal } from "../project.state.js";
import { projectElements } from "../project.state.js";

function openDrawer() {
    $("#projectItemDrawer").addClass("show");
    $("#drawerOverlay").addClass("show");
}

function closeDrawer() {
    $("#projectItemDrawer").removeClass("show");
    $("#drawerOverlay").removeClass("show");
}

$("#btn-close-project-items").on("click", closeDrawer);


Sortable.create(document.getElementById("inventory-list"), {
    group: {
        name: "inventory",
        pull: "clone",
        put: false
    },
    sort: false,
    animation: 150
});

Sortable.create(document.getElementById("drop-zone"), {
    group: {
        name: "inventory",
        put: true
    },
    animation: 150,
    onAdd: function (evt) {
        const id = evt.item.dataset.id;
        evt.item.remove();
        addItemToProject(id);
    }
});

function addItemToProject(id) {

    const item = variableGlobal.inventoryItems.find(x => x.id === id);

    if (!item) return;

    if (variableGlobal.projectItemList.some(x => x.id === id)) {
        alert("Item already exists.");
        return;
    }

    variableGlobal.projectItemList.push({ ...item });

    const tbody = $("#project-item-body");

    const descriptionHtml = (item.description ?? "").replace(/\n/g, "<br>");

    const userString = localStorage.getItem("user");

    const user = JSON.parse(userString);

    tbody.append(`
        <tr>
            <td>${item.name}</td>
            <td>${item.model ?? ""}</td>
            <td>${item.code ?? ""}</td>

            <td class="text-center">
                <span class="badge badge-require">
                    ${item.required_quantity ?? 0}
                </span> 
            </td>

            <td class="text-center">
                <span class="badge badge-stock">
                    ${item.stock ?? 0}
                </span>
            </td>

            <td class="text-center">
                <span class="badge badge-order">
                    ${Math.max((item.required_quantity ?? 0) - (item.stock ?? 0), 0)}
                </span>
            </td>

            <td class="text-center">
                ${(item.unit_price ?? 0).toLocaleString()}
            </td>

            <td class="text-center">
                ${((item.required_quantity ?? 0) * (item.unit_price ?? 0)).toLocaleString()}
            </td>

            <td>${user.employee_id ?? ""}</td>
            <td>${item.request_date ?? ""}</td>

            <td>
                <span
                    class="description-text"
                    data-bs-toggle="popover"
                    data-bs-trigger="hover focus"
                    data-bs-html="true"
                    data-bs-placement="left"
                    data-bs-content="${descriptionHtml}">
                    ${item.description}
                </span>
            </td>

            <td>
                <button class="btn btn-sm btn-outline-primary me-1">
                    <i class="bi bi-pencil"></i>
                </button>

                <button class="btn btn-sm btn-outline-danger">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `);

    const popoverElement = tbody.find('[data-bs-toggle="popover"]').last()[0];

    new bootstrap.Popover(popoverElement, {
        html: true
    });
}

$(document).on("click", ".btn-outline-danger", function () {
    const row = $(this).closest("tr");
    const index = row.index();
    projectItems.splice(index, 1);
    ui.renderProjectTable();
});
