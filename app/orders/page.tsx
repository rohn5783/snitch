"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { api, formatPrice } from "@/lib/api";
import type { Order } from "@/types/store";

export default function OrdersPage() {
  const { ready } = useProtectedRoute("buyer");
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    api<{ orders: Order[] }>("/orders")
      .then((response) => setOrders(response.orders ?? []))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Order history could not be loaded."))
      .finally(() => setLoading(false));
  }, [ready]);

  if (!ready) return <div className="center-state"><span className="loading-mark" /></div>;
  return (
    <div className="account-page page-gutter">
      <PageHeading label="YOUR EDIT / 03" title="The good things." description={"Your orders and everything they're becoming."} />
      {loading ? <div className="center-state"><span className="loading-mark" /></div> : error ? <div className="center-state"><p className="form-error">{error}</p></div> : orders.length ? (
        <div className="orders-list">
          {orders.map((order) => (
            <article className="order-card" key={order._id}>
              <header className="order-card__head"><div><span className="eyebrow">ORDER / {order.razorpay?.orderId ?? order._id}</span><p>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p></div><span className={`status-pill status-pill--${order.status ?? "pending"}`}>{order.status ?? "pending"}</span></header>
              <div className="order-card__items">{order.orderItems?.map((item) => <div className="order-item" key={item._id ?? item.productId}><div><strong>{item.title}</strong><span>Quantity {item.quantity}{item.fulfillmentStatus ? ` · ${item.fulfillmentStatus}` : ""}</span></div><span>{formatPrice((item.price?.amount ?? 0) * item.quantity, item.price?.currency)}</span></div>)}</div>
              <footer className="order-card__foot"><span>TOTAL</span><strong>{formatPrice(order.price?.amount ?? 0, order.price?.currency)}</strong></footer>
            </article>
          ))}
        </div>
      ) : <div className="empty-state"><span className="eyebrow">THE STORY STARTS HERE</span><h2>Good things<br /><em>take time.</em></h2><p>Your first order is waiting to happen.</p><Link className="solid-button" href="/#collection">EXPLORE THE EDIT <span aria-hidden="true">↗</span></Link></div>}
    </div>
  );
}
