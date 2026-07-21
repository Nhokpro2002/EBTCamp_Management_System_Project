// ===============================
// Dashboard Data
// ===============================


const dashboardData = {

    counters: {
        products: 1280,
        revenue: 86500,
        orders: 358,
        lowStock: 19
    },


    revenue: {
        labels: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec"
        ],

        values: [
            12000,
            18000,
            15000,
            24000,
            30000,
            36000,
            42000,
            39000,
            48000,
            56000,
            62000,
            70000
        ]
    },


    categories: {
        labels: [
            "Electronics",
            "Furniture",
            "Food",
            "Fashion"
        ],

        values: [
            40,
            25,
            20,
            15
        ]
    },


    products: {
        labels: [
            "Laptop",
            "Keyboard",
            "Mouse",
            "Monitor",
            "Headphone"
        ],

        values: [
            540,
            470,
            430,
            310,
            260
        ]
    },


    warehouse: {
        labels: [
            "Quality",
            "Price",
            "Delivery",
            "Support",
            "Speed"
        ],

        values: [
            90,
            75,
            85,
            80,
            70
        ]
    }


};



// ===============================
// Counter Animation
// ===============================


function animateCounter(
    element,
    target
) {

    let current = 0;


    const increment =
        target / 80;


    const timer =
        setInterval(() => {


            current += increment;


            if (current >= target) {

                current = target;

                clearInterval(timer);

            }


            element.innerText =
                Math.floor(current)
                    .toLocaleString();


        }, 20);

}




document.addEventListener(
    "DOMContentLoaded",
    () => {


        animateCounter(
            document.getElementById(
                "productCounter"
            ),
            dashboardData.counters.products
        );


        animateCounter(
            document.getElementById(
                "revenueCounter"
            ),
            dashboardData.counters.revenue
        );


        animateCounter(
            document.getElementById(
                "orderCounter"
            ),
            dashboardData.counters.orders
        );


        animateCounter(
            document.getElementById(
                "stockCounter"
            ),
            dashboardData.counters.lowStock
        );



        createRevenueChart();

        createCategoryChart();

        createProductChart();

        createWarehouseChart();


        renderOrders();

        renderLowStock();


    });



// ===============================
// Revenue Chart
// ===============================


function createRevenueChart() {


    const ctx =
        document
            .getElementById(
                "revenueChart"
            );


    const gradient =
        ctx
            .getContext("2d")
            .createLinearGradient(
                0,
                0,
                0,
                350
            );


    gradient.addColorStop(
        0,
        "rgba(37,99,235,.45)"
    );


    gradient.addColorStop(
        1,
        "rgba(37,99,235,0)"
    );



    new Chart(
        ctx,
        {

            type: "line",


            data: {


                labels:
                    dashboardData.revenue.labels,


                datasets: [

                    {

                        label:
                            "Revenue",


                        data:
                            dashboardData.revenue.values,


                        borderColor:
                            "#2563eb",


                        backgroundColor:
                            gradient,


                        fill: true,


                        tension: .45,


                        pointRadius: 5,


                        pointHoverRadius: 8

                    }

                ]

            },


            options: {


                responsive: true,


                plugins: {


                    legend: {


                        display: true


                    }


                }

            }


        }
    );

}




// ===============================
// Category Chart
// ===============================


function createCategoryChart() {


    new Chart(

        document.getElementById(
            "categoryChart"
        ),


        {


            type: "doughnut",


            data: {


                labels:
                    dashboardData.categories.labels,


                datasets: [

                    {

                        data:
                            dashboardData.categories.values,


                        backgroundColor: [

                            "#2563eb",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444"

                        ]


                    }

                ]

            },


            options: {


                cutout: "65%",


                plugins: {


                    legend: {


                        position: "bottom"


                    }


                }


            }


        }

    );

}




// ===============================
// Product Chart
// ===============================


function createProductChart() {


    new Chart(

        document.getElementById(
            "topProductChart"
        ),


        {


            type: "bar",


            data: {


                labels:
                    dashboardData.products.labels,


                datasets: [

                    {


                        label: "Sold",


                        data:
                            dashboardData.products.values,


                        backgroundColor:
                            "#10b981",


                        borderRadius: 10


                    }

                ]

            },


            options: {


                indexAxis: "y",


                plugins: {


                    legend: {
                        display: false
                    }

                }


            }


        }

    );


}




// ===============================
// Warehouse Radar
// ===============================


function createWarehouseChart() {


    new Chart(

        document.getElementById(
            "warehouseChart"
        ),


        {


            type: "radar",


            data: {


                labels:
                    dashboardData.warehouse.labels,


                datasets: [


                    {


                        label:
                            "Warehouse A",


                        data:
                            dashboardData.warehouse.values,


                        backgroundColor:
                            "rgba(37,99,235,.2)",


                        borderColor:
                            "#2563eb",


                        pointBackgroundColor:
                            "#2563eb"


                    }


                ]

            },


            options: {


                scales: {


                    r: {


                        beginAtZero: true,


                        max: 100


                    }


                }


            }


        }

    );

}




// ===============================
// Recent Orders
// ===============================


function renderOrders() {


    const orders = [


        {
            id: "#1001",
            customer: "John",
            total: "$520",
            status: "Delivered"
        },


        {
            id: "#1002",
            customer: "Anna",
            total: "$230",
            status: "Pending"
        },


        {
            id: "#1003",
            customer: "Mike",
            total: "$890",
            status: "Shipping"
        },


        {
            id: "#1004",
            customer: "Alex",
            total: "$180",
            status: "Cancelled"
        }


    ];



    const table =
        document.getElementById(
            "recentOrderTable"
        );



    table.innerHTML =
        orders.map(
            order => {


                let color =
                    "success";


                if (order.status === "Pending")
                    color = "warning";


                if (order.status === "Cancelled")
                    color = "danger";


                if (order.status === "Shipping")
                    color = "info";



                return `

                <tr>

                    <td>${order.id}</td>

                    <td>${order.customer}</td>

                    <td>${order.total}</td>


                    <td>

                    <span class="badge bg-${color}">
                    ${order.status}
                    </span>

                    </td>


                </tr>

                `;


            }

        ).join("");

}




// ===============================
// Low Stock
// ===============================


function renderLowStock() {


    const items = [

        {
            name: "Keyboard",
            percent: 20
        },


        {
            name: "SSD 1TB",
            percent: 35
        },


        {
            name: "Mouse",
            percent: 45
        },


        {
            name: "RAM 16GB",
            percent: 70
        }

    ];



    const container =
        document.getElementById(
            "lowStockList"
        );



    container.innerHTML =

        items.map(item => `


        <div class="stock-item">


            <div class="stock-header">

                <span>
                ${item.name}
                </span>


                <span>
                ${item.percent}%
                </span>


            </div>



            <div class="progress">


                <div

                class="progress-bar bg-danger"

                style="
                width:${item.percent}%
                "

                ></div>


            </div>


        </div>


    `).join("");

    /*
    lập trình website chạy local với sự giúp đỡ của các công cụ ai, bên cạnh đó là sử dụng thư viện hỗ trợ xây dựng giao diện và vẽ biểu đồ 
    2. tận dụng tính năng datarealtime của thư viện để thông báo cho user các thay đổi của dự án
    trang web hỗ trợ thêm sửa xóa data => các thành viên dễ quản lý tiến độ 

    viết lại đoạn này để trả lời các câu hỏi sau 
    1. Giải thích ý tưởng cải tiến 
    + mong muốn tháo gỡ khó khăn bằng ai như nào 
    + điểm mấu chốt cần cải tiến
    + process hiện tại có điểm nào chưa tối ưu và đưa ra ý tưởng cải tiến 
    + cải tiến giúp nâng cao hiệu quả định lương (hay định tính)
    ứng dụng ai nào hỗ tợ 
    tự động hóa công việc / phân tích / thiết bị như nào 
    sử dụng công cụ gì 
    time line kế hoạch
     */

}