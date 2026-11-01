import { useCallback, useEffect, useState } from "react";
import { getSellerOrders, updateSellerOrderStatus } from "../service/orders.api";

export const useSellerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [error, setError] = useState(null);

    const loadOrders = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        try {
            const data = await getSellerOrders();
            setOrders(data.orders || []);
            setError(null);
        } catch (err) {
            console.error("Failed to load seller orders", err);
            setError("Could not load orders. Please try again.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
        const intervalId = window.setInterval(() => loadOrders({ silent: true }), 15000);
        const handleFocus = () => loadOrders({ silent: true });
        window.addEventListener("focus", handleFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
        };
    }, [loadOrders]);

    async function handleUpdateStatus(orderId, status) {
        setUpdatingOrderId(orderId);
        setError(null);
        try {
            await updateSellerOrderStatus({ orderId, status });
            await loadOrders({ silent: true });
            return true;
        } catch (err) {
            console.error("Failed to update order status", err);
            setError(err.response?.data?.message || "Could not update this order.");
            return false;
        } finally {
            setUpdatingOrderId(null);
        }
    }

    return { orders, loading, updatingOrderId, error, loadOrders, handleUpdateStatus };
};
