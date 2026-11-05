"use client";

import { useEffect, useState } from "react";
import { api, formatPrice, jsonBody } from "@/lib/api";
import type { Order } from "@/types/store";

export function SellerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");

  async function loadOrders() {
    try {
      const response = await api<{ orders: Order[] }>("/orders/seller");
      setOrders(response.orders ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void Promise.resolve().then(loadOrders); }, []);

  async function update(orderId: string, status: "pending" | "complete") {
    setUpdating(orderId);
    try {
      await api(`/orders/seller/${orderId}/fulfillment`, { method: "PATCH", body: jsonBody({ status }) });
      await loadOrders();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Order status could not be updated.");
    } finally {
      setUpdating("");
    }
  }

  return (
    <section className="seller-orders">
      <div className="seller-section-heading"><div><span className="eyebrow">THE SHIPPING DESK</span><h2>Orders to send.</h2></div><span className="seller-order-count">{orders.length} ORDER{orders.length === 1 ? "" : "S"}</span></div>
      {loading ? <div className="inline-loading"><span className="loading-mark" /></div> : error ? <p className="form-error" role="alert">{error}</p> : orders.length ? (
        <div className="seller-orders__grid">{orders.map((order) => <article className="seller-order" key={order._id}>
          <div className="seller-order__head"><div><span className="eyebrow">ORDER / {order.razorpay?.orderId ?? order._id}</span><p>{order.buyer?.fullname ?? "SNITCH customer"} · {order.buyer?.email ?? ""}</p></div><span className={`status-pill status-pill--${order.fulfillmentStatus ?? "pending"}`}>{order.fulfillmentStatus ?? "pending"}</span></div>
          <div className="seller-order__items">{order.orderItems.map((item) => <div key={item._id ?? item.productId}><strong>{item.title}</strong><span>× {item.quantity} · {formatPrice((item.price?.amount ?? 0) * item.quantity, item.price?.currency)}</span></div>)}</div>
          <div className="seller-order__foot"><strong>{formatPrice(order.sellerTotal ?? 0, order.currency)}</strong><button className="outline-button" disabled={updating === order._id} onClick={() => update(order._id, order.fulfillmentStatus === "complete" ? "pending" : "complete")}>{updating === order._id ? "SAVING…" : order.fulfillmentStatus === "complete" ? "MARK PENDING" : "MARK COMPLETE"}</button></div>
        </article>)}</div>
      ) : <div className="seller-orders__empty"><p>No orders to ship just yet.</p><span>The good ones are on their way.</span></div>}
    </section>
  );
}
