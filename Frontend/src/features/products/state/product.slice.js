import { createSlice } from "@reduxjs/toolkit";


const productSlice = createSlice({
    name: "product",
    initialState: {
        sellerProducts: [],
        products: [],
        searchQuery: "",
        selectedCategory: "",
        priceRange: { min: "", max: "" },
    },
    reducers: {
        setSellerProducts: (state, action) => {
            state.sellerProducts = action.payload;
        },
        setProducts: (state, action) => {
            state.products = action.payload;
        },
        setSearchQuery: (state, action) => {
            state.searchQuery = action.payload;
        },
        setSelectedCategory: (state, action) => {
            state.selectedCategory = action.payload;
        },
        setPriceRange: (state, action) => {
            state.priceRange = action.payload;
        },
        resetFilters: (state) => {
            state.searchQuery = "";
            state.selectedCategory = "";
            state.priceRange = { min: "", max: "" };
        },
    },
})


export const {
    setSellerProducts,
    setProducts,
    setSearchQuery,
    setSelectedCategory,
    setPriceRange,
    resetFilters,
} = productSlice.actions;

export default productSlice.reducer;
