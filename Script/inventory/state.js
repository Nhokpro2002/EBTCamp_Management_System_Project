export const inventoryVariable = {
    inventoryItemFull: [],
    inventoryItemFiltered: [],
    currentInventoryPage: 1,
    pageSize: 10,
    totalPages: null,

    searchKeyword: "",
    selectedBrand: "",

    // Lọc bằng quét QR trên trang: code vừa quét và các vật tư tìm được trong database
    // (scanItems = null nghĩa là đang không lọc theo QR)
    scanCode: "",
    scanItems: null
}
