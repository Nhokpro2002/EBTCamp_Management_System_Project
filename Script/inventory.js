

const COLLECTION_ORDER_ITEMS = "Order_Items";
const COLLECTION_ORDERS = "Orders";
const COLLECTION_USERS = "Users";
const POCKETBASE_URL = "http://127.0.0.1:8090";
const COLLECTION_ITEMS = "Items";

function checkAuthentication() {
    const token = localStorage.getItem("token");
    if (!token || token.trim() === "") {
        Swal.fire({
            icon: 'warning',      // icon của popup: 'warning', 'error', 'success', 'info', 'question'
            title: 'Access Denied',
            text: 'You must log in to access this page',
            confirmButtonText: 'Go to Login'
        }).then(() => {
            window.location.href = "http://127.0.0.1:5500/Page/login.html"; // chuyển hướng sau khi user bấm OK
        });

        return false;

        // ngăn chặn load tiếp các script
    }
    return true;
}

$(document).ready(function () {

    if (!checkAuthentication()) return;

    document.querySelector(".container-fluid").style.display = "block";

    // window.alert(window.innerWidth + " x " + window.innerHeight);
    // Spec: 1528 * 732;

    const currentPage = window.location.pathname;

    if (currentPage.includes('dashboard')) {
        document.getElementById('dashboard-link').classList.add('active');
    } else if (currentPage.includes('order')) {
        document.getElementById('order-link').classList.add('active');
    } else if (currentPage.includes('user')) {
        document.getElementById('user-link').classList.add('active');
    } else if (currentPage.includes('setting')) {
        document.getElementById('setting-link').classList.add('active');
    } else if (currentPage.includes('inventory')) {
        document.getElementById('inventory-link').classList.add('active');
    } else if (currentPage.includes('project')) {
        document.getElementById('project-link').classList.add('active');
    }

    async function fetchData() {
        try {

            const token = localStorage.getItem('token');
            const response = await fetch(`${POCKETBASE_URL}/api/collections/${COLLECTION_ITEMS}/records`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();

            console.log('Fetched records:', result);

            const tableData = result.items.map(item => ({
                image: item.image ? POCKETBASE_URL + '/api/files/' + COLLECTION_ITEMS + '/' + item.id + '/' + item.image : '',
                name: item.name || '',
                code: item.code || '',
                qr_code: item.qr_code || '',
                brand: item.brand || '',
                description: item.description || '',
                remain: item.remain || 0,
                model: item.model || '',
                total_import: item.total_import || '',
                order: item.order || '',
                reuse: item.reuse || '',
                type: item.type || ''
            }));

            $('#my_table').DataTable({
                data: tableData,
                scrollY: '500px',
                scrollX: true,
                paging: true,
                sort: false,
                select: true,
                scrollCollapse: true,
                columnDefs: [
                    { targets: 0, width: "100px" },
                    { targets: 1, width: "100px" },
                    { targets: 2, width: "150px" },
                    { targets: 3, width: "100px" },
                    { targets: 4, width: "100px" },
                    { targets: 5, width: "120px" },
                    { targets: 6, width: "150px", className: "dt-left" },
                    { targets: 7, width: "150px" },
                    { targets: 8, width: "150px", className: "dt-left" },
                    { targets: 9, width: "100px", className: "dt-left" },
                    { targets: 10, width: "100px", className: "dt-left" },
                    { targets: 11, width: "100px" },
                ],

                columns: [
                    {
                        title: "Image",
                        data: "image",
                        render: function (data) {
                            return `<img class="item_img_cell" src="${data}" width="50" title="Click to see more">`;

                        }
                    },
                    {
                        title: "Name", data: "name", render: function (data) {
                            return `<div class="name-cell" title="${data}">${data}</div>`;
                        }
                    },
                    { title: "XCode/QCode", data: "code" },
                    { title: "QRCode", data: "qr_code" },
                    { title: "Brand", data: "brand" },
                    {
                        title: "Description", data: "description", render: function (data) {
                            return ` <div class="description-cell" title="${data}">${data} </div> `;
                        }
                    },
                    {
                        title: "Remain",
                        data: "remain",
                        render: function (data) {
                            if (data <= 0) {
                                return `0 <span style="color:red; font-weight:bold; font-size: 14.5px"> &nbsp; Out of stock</span>`;
                            } else if (data < 20) {
                                return `${data} <span style="color:orange; font-weight:bold; font-size: 14.5px"> &nbsp; Low stock</span>`;
                            }
                            return data;
                        }
                    },
                    {
                        title: "Model", data: "model", render: function (data) {
                            return `<div class="model-cell" title="${data}">${data} </div>`;
                        }
                    },
                    { title: "Total Import", data: "total_import" },
                    { title: "Order", data: "order" },
                    { title: "Reuse", data: "reuse" },
                    { title: "Type", data: "type" }
                ]
            });

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    fetchData();

    changeIconAvatar();

    changeTopbarText();
});

/*

*/
async function getItemOrderHistory(itemModel) {

    try {

        const token = localStorage.getItem('token');
        const filter = encodeURIComponent(`model="${itemModel}"`);
        const response = await fetch(`${POCKETBASE_URL}/api/collections/${COLLECTION_ORDER_ITEMS}/records?filter=${filter}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Fetched records:', result);

        const itemOrderHistoryData = result.items.map(item => ({
            status: item.status || '',
            code: item.code || '',
            unit_price: item.unit_price ? "$" + item.unit_price : "$0",
            quantity: item.quantity || '',
            total_price: "$" + (item.unit_price * item.quantity),
            order_date: item.order_date,
            requested_date: item.requested_date,
            receive_date: item.receive_date
        }));

        if ($.fn.DataTable.isDataTable('#order_history_table')) {
            $('#order_history_table').DataTable().destroy();
        }

        $('#order_history_table').DataTable({
            data: itemOrderHistoryData,
            autoWidth: false,
            scrollY: '300px',
            scrollX: true,
            paging: true,
            select: true,
            ordering: true,
            order: [[7, 'desc'], [6, 'desc'], [5, 'desc']],
            columnDefs: [
                { targets: [0, 1, 2, 3, 4, 5], orderable: false },
                { targets: 0, width: "160px" },
                { targets: 1, width: "120px" },
                { targets: 2, width: "100px", className: "dt-left" },
                { targets: 3, width: "100px", className: "dt-left" },
                { targets: 4, width: "140px", className: "dt-left" },
                { targets: 5, width: "160px", className: "dt-left" },
                { targets: 6, width: "160px", className: "dt-left", orderable: true },
                { targets: 7, width: "160px", className: "dt-left", orderable: true },
            ],

            columns: [

                {
                    title: "Status",
                    data: "status",
                    render: function (data) {

                        let bgColor = "#6C757D";

                        switch (data) {

                            case "Request Code":
                                bgColor = "#6C757D";
                                break;

                            case "Wait Pur Process":
                                bgColor = "#FD7E14";
                                break;

                            case "Request PO":
                                bgColor = "#0D6EFD";
                                break;

                            case "Pending Delivery":
                                bgColor = "#6F42C1";
                                break;

                            case "Completed":
                                bgColor = "#198754";
                                break;
                        }

                        return `
            <span style="
                background-color: ${bgColor};
                color: white;
                padding: 5px 10px;
                border-radius: 8px;
                font-weight: bold;
                display: inline-block;
                min-width: 100px;
                text-align: center;
            ">
                ${data}
            </span>
        `;
                    }
                },
                { title: "XCode/QCode", data: "code" },
                { title: "Unit Price", data: "unit_price" },
                { title: "Quantity", data: "quantity" },
                { title: "Total Price", data: "total_price" },
                {
                    title: "Order Date",
                    data: "order_date",
                    render: function (data) {
                        if (!data) return '';
                        const d = new Date(data);
                        return d.toLocaleDateString('vi-VN');
                    }
                },
                {
                    title: "Requested Date",
                    data: "requested_date",
                    render: function (data) {
                        if (!data) return '';
                        const d = new Date(data);
                        return d.toLocaleDateString('vi-VN');
                    }
                },
                {
                    title: "Receive Date",
                    data: "receive_date",
                    render: function (data) {
                        if (!data) return '';
                        const d = new Date(data);
                        return d.toLocaleDateString('vi-VN');
                    }
                }
            ]
        });


    } catch (error) {
        console.error('Error fetching data:', error);
    }
}


$(document).on('click', '.item_img_cell', function () {

    const table = $('#my_table').DataTable();

    // get current row in table 
    const row = $(this).closest('tr');

    // get full object data
    const data = table.row(row).data();

    $('#modalImage').attr('src', data.image);
    $('#modalName').text(data.name);
    $('#modalCode').text(data.code);
    $('#modalQRCode').text(data.qr_code);
    $('#modalBrand').text(data.brand);
    $('#modalDescription')
        .text(data.description)
        .attr('title', data.description);
    $('#modalRemain').text(data.remain);
    $('#modalModel').text(data.model);
    $('#modalTotalImport').text(data.total_import);
    $('#modalOrder').text(data.order);
    $('#modalReuse').text(data.reuse);

    $('#itemModal').css('display', 'flex');
    $('body').css('overflow', 'hidden');


    getItemOrderHistory(data.model);

});


// Close modal
$('#modalClose').on('click', function () {
    $('#itemModal').hide();
    $('body').css('overflow', 'auto');
});

function changeIconAvatar() {
    const dropdownAvatar = document.querySelector('.dropdown img');
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!dropdownAvatar || !userData) return;

    dropdownAvatar.src =
        `${POCKETBASE_URL}/api/files/${COLLECTION_USERS}/${userData.id}/${userData.avatar}?t=${Date.now()}`;
}

function changeTopbarText() {
    const topbarText = document.querySelector('.topbar .text-muted');
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!topbarText || !userData) return;

    topbarText.textContent = `Welcome back, ${userData.employee_id} 👋`;
}
