"use client";

import { useCallback, useEffect, useState } from "react";
import { api, formatPrice, jsonBody } from "@/lib/api";
import type { Order } from "@/types/store";

export function SellerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const response = await api<{ orders: Order[] }>("/orders/seller");
      setOrders(response.orders ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadOrders);
    const timer = window.setInterval(() => { void loadOrders(); }, 20000);
    return () => window.clearInterval(timer);
  }, [loadOrders]);

  async function update(orderId: string, itemId: string, status: "processing" | "ready" | "dispatched" | "delivered") {
    const key = `${orderId}:${itemId}`;
    setUpdating(key);
    try {
      await api(`/orders/seller/${orderId}/fulfillment`, { method: "PATCH", body: jsonBody({ itemId, status }) });
      await loadOrders();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Order status could not be updated.");
    } finally {
      setUpdating("");
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }

  const nextStatus: Record<string, "processing" | "ready" | "dispatched" | "delivered" | null> = {
    pending: "processing",
    processing: "ready",
    ready: "dispatched",
    dispatched: "delivered",
    delivered: null,
    complete: null,
  };
  const nextLabel: Record<string, string> = {
    pending: "START PREPARING",
    processing: "MARK READY",
    ready: "DISPATCH ORDER",
    dispatched: "MARK DELIVERED",
  };

  return (
    <section className="seller-orders">
      <div className="seller-section-heading"><div><span className="eyebrow">THE SHIPPING DESK</span><h2>Orders to send.</h2></div><div className="seller-order-tools"><span className="seller-order-count">{orders.length} ORDER{orders.length === 1 ? "" : "S"}</span><button className="text-link" type="button" onClick={refresh} disabled={refreshing}>{refreshing ? "REFRESHING…" : "REFRESH ORDERS ↻"}</button></div></div>
      {loading ? <div className="inline-loading"><span className="loading-mark" /></div> : error ? <p className="form-error" role="alert">{error}</p> : orders.length ? (
        <div className="seller-orders__grid">{orders.map((order) => <article className="seller-order" key={order._id}>
          <div className="seller-order__head"><div><span className="eyebrow">ORDER / {order.razorpay?.orderId ?? order._id}</span><p>{order.buyer?.fullname ?? "SNITCH customer"} · {order.buyer?.email ?? ""}</p></div><span className={`status-pill status-pill--${order.fulfillmentStatus ?? "pending"}`}>{order.fulfillmentStatus ?? "pending"}</span></div>
          {order.shippingAddress && <address className="seller-order__address"><strong>SHIP TO {order.shippingAddress.fullName}</strong><span>{order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}</span><span>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}, {order.shippingAddress.country}</span><span>PHONE {order.shippingAddress.phone}</span></address>}
          <div className="seller-order__items">{order.orderItems.map((item) => {
            const status = item.fulfillmentStatus === "complete" ? "delivered" : item.fulfillmentStatus ?? "pending";
            const next = nextStatus[status];
            const key = `${order._id}:${item._id ?? item.productId}`;
            return <div className="seller-order__item" key={item._id ?? item.productId}><div><strong>{item.title}</strong><span>× {item.quantity} · {formatPrice((item.price?.amount ?? 0) * item.quantity, item.price?.currency)}</span></div><span className={`status-pill status-pill--${status}`}>{status}</span>{next && item._id && <button className="outline-button" disabled={updating === key} onClick={() => update(order._id, item._id, next)}>{updating === key ? "SAVING…" : nextLabel[status]}</button>}</div>;
          })}</div>
          <div className="seller-order__foot"><span>PAYMENT {order.paymentStatus?.toUpperCase() ?? "PAID"}</span><strong>{formatPrice(order.sellerTotal ?? 0, order.currency)}</strong></div>
        </article>)}</div>
      ) : <div className="seller-orders__empty"><p>No orders to ship just yet.</p><span>The good ones are on their way.</span></div>}
    </section>
  );
}
