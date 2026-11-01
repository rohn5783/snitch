import axios from "axios";

const wishlistApiInstance = axios.create({
    baseURL: "/api/wishlist",
    withCredentials: true,
});

export const getWishlist = async () => {
    const response = await wishlistApiInstance.get("/");
    return response.data;
};

export const addToWishlistApi = async (productId) => {
    const response = await wishlistApiInstance.post(`/add/${productId}`);
    return response.data;
};

export const removeFromWishlistApi = async (productId) => {
    const response = await wishlistApiInstance.delete(`/remove/${productId}`);
    return response.data;
};

