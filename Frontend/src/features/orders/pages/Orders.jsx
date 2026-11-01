import React, { useEffect } from 'react';
import { useOrders } from '../hook/useOrders';
import { Link } from 'react-router';

const tokens = {
    surface: '#fbf9f6',
    surfaceLow: '#f5f3f0',
    onSurface: '#1b1c1a',
    secondary: '#7A6E63',
    muted: '#B5ADA3',
    primary: '#C9A96E',
    primaryDark: '#745a27',
    outlineVariant: '#d0c5b5',
    outline: '#e4e2df',
};

const statusStyles = {
    pending: { label: 'Pending', color: '#7A6E63', bg: '#f5f3f0' },
    paid:    { label: 'Paid',    color: '#4a7a4a', bg: '#f0f5f0' },
    failed:  { label: 'Failed',  color: '#b94a4a', bg: '#f5f0f0' },
};

const Orders = () => {
    const { orders, loading, error, handleGetOrders } = useOrders();

    useEffect(() => {
        handleGetOrders();
    }, []);

    const formatCurrency = (amount, currency = 'INR') =>
        `${currency} ${Number(amount).toLocaleString('en-IN')}`;

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
                rel="stylesheet"
            />
            <div
                className="min-h-screen selection:bg-[#C9A96E]/30 pb-24"
                style={{ backgroundColor: tokens.surface, fontFamily: "'Inter', sans-serif" }}
            >
                <div className="max-w-4xl mx-auto px-8 lg:px-16 pt-16 lg:pt-24">

                    {/* Header */}
                    <div className="mb-16">
                        <span className="text-[10px] uppercase tracking-[0.24em] font-medium" style={{ color: tokens.primary }}>
                            Order History
                        </span>
                        <h1
                            className="text-5xl lg:text-6xl font-light leading-tight mt-4"
                            style={{ fontFamily: "'Cormorant Garamond', serif", color: tokens.onSurface }}
                        >
                            Your Orders
                        </h1>
                    </div>

                    {/* States */}
                    {loading && (
                        <p className="text-[10px] uppercase tracking-[0.2em] animate-pulse" style={{ color: tokens.muted }}>
                            Retrieving orders...
                        </p>
                    )}

                    {error && (
                        <p className="text-sm" style={{ color: '#b94a4a' }}>{error}</p>
                    )}

                    {!loading && !error && orders.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-6">
                            <h2
                                className="text-3xl font-light"
                                style={{ fontFamily: "'Cormorant Garamond', serif", color: tokens.onSurface }}
                            >
                                No orders yet.
                            </h2>
                            <p className="text-sm leading-relaxed" style={{ color: tokens.secondary }}>
                                Your order history will appear here once you make a purchase.
                            </p>
                            <Link
                                to="/"
                                className="mt-4 px-10 py-4 text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-300"
                                style={{ backgroundColor: tokens.onSurface, color: tokens.surface }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = tokens.primary;
                                    e.currentTarget.style.color = tokens.onSurface;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = tokens.onSurface;
                                    e.currentTarget.style.color = tokens.surface;
                                }}
                            >
                                Explore the Archive
                            </Link>
                        </div>
                    )}

                    {/* Orders List */}
                    {!loading && orders.length > 0 && (
                        <div className="flex flex-col gap-10">
                            {orders.map(order => {
                                const st = statusStyles[order.status] || statusStyles.pending;
                                return (
                                    <div
                                        key={order._id}
                                        className="p-8"
                                        style={{ backgroundColor: tokens.surfaceLow }}
                                    >
                                        {/* Order header */}
                                        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-6" style={{ borderBottom: `1px solid ${tokens.outline}` }}>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-[0.2em] font-medium mb-1" style={{ color: tokens.muted }}>
                                                    Order Reference
                                                </p>
                                                <p
                                                    className="text-lg"
                                                    style={{ fontFamily: "'Cormorant Garamond', serif", color: tokens.onSurface }}
                                                >
                                                    #{order.razorpay?.orderId || order._id}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span
                                                    className="px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-medium"
                                                    style={{ backgroundColor: st.bg, color: st.color }}
                                                >
                                                    {st.label}
                                                </span>
                                                <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: tokens.muted }}>
                                                    {formatDate(order.createdAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Order items */}
                                        <div className="flex flex-col gap-5 mb-6">
                                            {(order.orderItems || []).map((item, idx) => {
                                                const imgUrl = item.images?.[0]?.url;
                                                return (
                                                    <div key={idx} className="flex gap-5 items-start">
                                                        {imgUrl ? (
                                                            <div
                                                                className="flex-shrink-0 overflow-hidden"
                                                                style={{ width: '72px', aspectRatio: '4/5', backgroundColor: tokens.outline }}
                                                            >
                                                                <img src={imgUrl} alt={item.title} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className="flex-shrink-0"
                                                                style={{ width: '72px', aspectRatio: '4/5', backgroundColor: tokens.outline }}
                                                            />
                                                        )}
                                                        <div className="flex-1">
                                                            <p
                                                                className="text-base leading-snug mb-1"
                                                                style={{ fontFamily: "'Cormorant Garamond', serif", color: tokens.onSurface }}
                                                            >
                                                                {item.title}
                                                            </p>
                                                            <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: tokens.muted }}>
                                                                Qty: {item.quantity}
                                                            </p>
                                                            {item.price && (
                                                                <p className="text-[11px] uppercase tracking-[0.15em] font-medium mt-1" style={{ color: tokens.onSurface }}>
                                                                    {formatCurrency(item.price.amount, item.price.currency)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Order total */}
                                        <div className="flex justify-between items-baseline pt-4" style={{ borderTop: `1px solid ${tokens.outline}` }}>
                                            <span className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: tokens.secondary }}>
                                                Total
                                            </span>
                                            <span className="text-sm uppercase tracking-[0.15em] font-medium" style={{ color: tokens.onSurface }}>
                                                {order.price ? formatCurrency(order.price.amount, order.price.currency) : '—'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="border-t mt-24 py-12 text-center" style={{ borderColor: '#e4e2df' }}>
                    <span
                        className="text-[10px] uppercase tracking-[0.35em]"
                        style={{ fontFamily: "'Cormorant Garamond', serif", color: tokens.primary }}
                    >
                        Snitch. © {new Date().getFullYear()}
                    </span>
                </footer>
            </div>
        </>
    );
};

export default Orders;

