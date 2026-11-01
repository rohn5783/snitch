import { createSlice } from "@reduxjs/toolkit";

const wishlistSlice = createSlice({
    name: "wishlist",
    initialState: {
        items: [], // array of productIds (strings)
    },
    reducers: {
        setWishlist: (state, action) => {
            state.items = action.payload;
        },
        addToWishlist: (state, action) => {
            const productId = action.payload;
            if (!state.items.includes(productId)) {
                state.items.push(productId);
            }
        },
        removeFromWishlist: (state, action) => {
            const productId = action.payload;
            state.items = state.items.filter(id => id !== productId);
        },
    },
});

export const { setWishlist, addToWishlist, removeFromWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;

