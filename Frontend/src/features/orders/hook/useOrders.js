import { useState } from "react";
import { getUserOrders } from "../service/orders.api";

export const useOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleGetOrders() {
        try {
            setLoading(true);
            setError(null);
            const data = await getUserOrders();
            setOrders(data.orders || []);
            return data.orders;
        } catch (err) {
            console.error("Failed to fetch orders", err);
            setError("Failed to load orders.");
        } finally {
            setLoading(false);
        }
    }

    return { orders, loading, error, handleGetOrders };
};

