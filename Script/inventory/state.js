export const inventoryVariable = {
    inventoryItemFull: [],
    inventoryItemFiltered: [],
    currentInventoryPage: 1,
    pageSize: 7,
    totalPages: null,

    searchKeyword: "",
    selectedBrand: "",

    // Import: vật tư vừa quét, chờ cộng kho
    importItem: null,
    // Export: danh sách vật tư đã quét, mỗi phần tử { item, quantity }
    exportList: []
}
