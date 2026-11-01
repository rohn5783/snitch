import axios from "axios";

const ordersApiInstance = axios.create({
    baseURL: "/api/orders",
    withCredentials: true,
});

export const getUserOrders = async () => {
    const response = await ordersApiInstance.get("/");
    return response.data;
};

export const getSellerOrders = async () => {
    const response = await ordersApiInstance.get("/seller");
    return response.data;
};

export const updateSellerOrderStatus = async ({ orderId, status }) => {
    const response = await ordersApiInstance.patch(`/seller/${orderId}/fulfillment`, { status });
    return response.data;
};

