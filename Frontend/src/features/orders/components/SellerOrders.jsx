import React from "react";
import { useSellerOrders } from "../hook/useSellerOrders";

const formatCurrency = (amount, currency = "INR") =>
    `${currency} ${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDate = value => value
    ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "—";

const SellerOrders = () => {
    const { orders, loading, updatingOrderId, error, handleUpdateStatus, loadOrders } = useSellerOrders();

    return (
        <section className="pb-16" aria-labelledby="seller-orders-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="text-[10px] uppercase tracking-[0.24em] font-medium" style={{ color: "#C9A96E" }}>
                        Buyer activity
                    </span>
                    <h2
                        id="seller-orders-heading"
                        className="mt-2 text-3xl md:text-4xl font-light"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b1c1a" }}
                    >
                        Incoming Orders
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => loadOrders()}
                    className="px-4 py-2 border text-[10px] uppercase tracking-[0.18em]"
                    style={{ borderColor: "#d0c5b5", color: "#7A6E63" }}
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border px-4 py-3 text-sm" style={{ borderColor: "#e8caca", color: "#9b4545", backgroundColor: "#fffafa" }}>
                    <span>{error}</span>
                    <button type="button" onClick={() => loadOrders()} className="underline">Retry</button>
                </div>
            )}

            {loading ? (
                <div className="border p-8 text-sm" style={{ backgroundColor: "#f5f3f0", borderColor: "#e4e2df", color: "#7A6E63" }}>
                    Loading orders…
                </div>
            ) : orders.length === 0 ? (
                <div className="border px-6 py-10 text-center" style={{ backgroundColor: "#f5f3f0", borderColor: "#e4e2df" }}>
                    <p className="text-xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b1c1a" }}>
                        No paid orders for your listings yet.
                    </p>
                    <p className="mt-2 text-xs" style={{ color: "#7A6E63" }}>
                        New orders refresh automatically while this dashboard is open.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {orders.map(order => {
                        const isComplete = order.fulfillmentStatus === "complete";
                        const isUpdating = updatingOrderId === order._id;

                        return (
                            <article key={order._id} className="border p-5 md:p-7" style={{ backgroundColor: "#f5f3f0", borderColor: "#e4e2df" }}>
                                <header className="mb-5 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between" style={{ borderColor: "#e4e2df" }}>
                                    <div>
                                        <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "#B5ADA3" }}>Order reference</p>
                                        <p className="mt-1 break-all text-base" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b1c1a" }}>
                                            #{order.razorpay?.orderId || order._id}
                                        </p>
                                        <p className="mt-1 text-[10px]" style={{ color: "#7A6E63" }}>{formatDate(order.createdAt)}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                                        <span className="px-3 py-1 text-[9px] uppercase tracking-[0.16em]" style={{ backgroundColor: "#f0f5f0", color: "#4a7a4a" }}>
                                            Payment paid
                                        </span>
                                        <span className="px-3 py-1 text-[9px] uppercase tracking-[0.16em]" style={{ backgroundColor: isComplete ? "#f0f5f0" : "#fff8e9", color: isComplete ? "#4a7a4a" : "#8a6a2c" }}>
                                            {isComplete ? "Complete" : "Pending"}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() => handleUpdateStatus(order._id, isComplete ? "pending" : "complete")}
                                            className="px-4 py-2 text-[9px] uppercase tracking-[0.15em] disabled:cursor-wait disabled:opacity-50"
                                            style={{ backgroundColor: "#1b1c1a", color: "#fbf9f6" }}
                                        >
                                            {isUpdating ? "Saving…" : isComplete ? "Mark pending" : "Mark complete"}
                                        </button>
                                    </div>
                                </header>

                                <div className="mb-5 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="mb-1 text-[9px] uppercase tracking-[0.18em]" style={{ color: "#B5ADA3" }}>Buyer</p>
                                        <p className="text-sm" style={{ color: "#1b1c1a" }}>{order.buyer?.fullname || "Buyer account unavailable"}</p>
                                        {order.buyer?.email && <p className="mt-1 break-all text-xs" style={{ color: "#7A6E63" }}>{order.buyer.email}</p>}
                                        {order.buyer?.contact && <p className="mt-1 text-xs" style={{ color: "#7A6E63" }}>{order.buyer.contact}</p>}
                                    </div>
                                    {order.razorpay?.paymentId && (
                                        <div>
                                            <p className="mb-1 text-[9px] uppercase tracking-[0.18em]" style={{ color: "#B5ADA3" }}>Payment reference</p>
                                            <p className="break-all text-xs" style={{ color: "#7A6E63" }}>{order.razorpay.paymentId}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="divide-y" style={{ borderColor: "#e4e2df" }}>
                                    {order.orderItems.map((item, index) => (
                                        <div key={`${item.productId}-${item.variantId}-${index}`} className="flex gap-4 py-4 first:pt-0 last:pb-0" style={{ borderColor: "#e4e2df" }}>
                                            <div className="h-20 w-16 flex-shrink-0 overflow-hidden" style={{ backgroundColor: "#e4e2df" }}>
                                                {item.images?.[0]?.url && <img src={item.images[0].url} alt={item.title} className="h-full w-full object-cover" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-lg leading-snug" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b1c1a" }}>{item.title}</p>
                                                <p className="mt-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: "#7A6E63" }}>Quantity: {item.quantity}</p>
                                                {item.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed" style={{ color: "#7A6E63" }}>{item.description}</p>}
                                            </div>
                                            <p className="whitespace-nowrap text-xs font-medium" style={{ color: "#1b1c1a" }}>
                                                {formatCurrency((Number(item.price?.amount) || 0) * (Number(item.quantity) || 0), item.price?.currency || order.currency)}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <footer className="mt-5 flex justify-between border-t pt-4" style={{ borderColor: "#d0c5b5" }}>
                                    <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "#7A6E63" }}>Your items total</span>
                                    <span className="text-sm font-medium" style={{ color: "#1b1c1a" }}>{formatCurrency(order.sellerTotal, order.currency)}</span>
                                </footer>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default SellerOrders;
