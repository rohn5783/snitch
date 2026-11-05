"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { useStore } from "@/components/store-provider";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { api, formatPrice, jsonBody, productImage } from "@/lib/api";
import { loadRazorpay } from "@/lib/razorpay";

type CreatedOrder = {
  keyId: string;
  order: { id: string; amount: number; currency: string };
};

type ShippingAddress = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export default function CartPage() {
  const { ready, user } = useProtectedRoute("buyer");
  const { cart, cartLoading, incrementCartItem, removeCartItem, notify, refreshCart } = useStore();
  const [busyItem, setBusyItem] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState("");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const router = useRouter();

  async function mutateItem(key: string, action: () => Promise<void>, success: string) {
    setBusyItem(key);
    setError("");
    try {
      await action();
      notify(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The bag could not be updated.");
    } finally {
      setBusyItem("");
    }
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutBusy(true);
    setError("");
    try {
      await loadRazorpay();
      const { keyId, order } = await api<CreatedOrder>("/cart/payment/create/order", {
        method: "POST",
        body: jsonBody({
          shippingAddress: {
            ...shippingAddress,
            fullName: shippingAddress.fullName || user?.fullname || "",
            phone: shippingAddress.phone || user?.contact || "",
          },
        }),
      });
      if (!window.Razorpay) throw new Error("Secure checkout is unavailable. Please try again.");
      const instance = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "SNITCH",
        description: "Independent fashion, chosen by you.",
        order_id: order.id,
        prefill: { name: user?.fullname, email: user?.email, contact: user?.contact },
        theme: { color: "#b89162" },
        modal: { ondismiss: () => setCheckoutBusy(false) },
        handler: async (payment) => {
          try {
            await api<{ success: boolean }>("/cart/payment/verify/order", { method: "POST", body: jsonBody(payment) });
            await refreshCart();
            router.push(`/order-success?order_id=${encodeURIComponent(payment.razorpay_order_id)}`);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Payment verification failed. Contact support before retrying.");
          } finally {
            setCheckoutBusy(false);
          }
        },
      });
      instance.open();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout could not be started.");
      setCheckoutBusy(false);
    }
  }

  if (!ready) return <div className="center-state"><span className="loading-mark" /></div>;

  return (
    <div className="account-page page-gutter">
      <PageHeading label="YOUR EDIT / 01" title="The bag." description="Considered pieces, collected in one place." />
      {cartLoading ? <div className="center-state"><span className="loading-mark" /></div> : cart.items.length ? (
        <div className="cart-layout">
          <section className="cart-lines" aria-label="Items in your shopping bag">
            {cart.items.map((item) => {
              const product = item.product;
              const key = `${product?._id}-${item.variant?._id}`;
              const selectedOptions = Object.entries(item.variant?.attributes ?? {}).map(([name, value]) => `${name}: ${value}`).join(" · ");
              return (
                <article className="cart-line" key={key}>
                  <Link href={`/product/${product?._id}`} className="cart-line__image"><Image src={product ? productImage({ images: item.variant?.images?.length ? item.variant.images : product.images }) : "/snitch_editorial.png"} alt={product?.title ?? "Fashion piece"} fill sizes="(max-width: 760px) 92px, 145px" unoptimized /></Link>
                  <div className="cart-line__details">
                    <span className="eyebrow">IN YOUR EDIT</span>
                    <h2>{product?.title ?? "Fashion piece"}</h2>
                    <p>{selectedOptions || "One of a kind"}</p>
                    <strong>{formatPrice(item.variant?.price?.amount ?? item.price?.amount, item.variant?.price?.currency ?? item.price?.currency)}</strong>
                    <div className="cart-line__actions">
                      <button disabled={busyItem === key} onClick={() => mutateItem(key, () => incrementCartItem(product._id, item.variant._id), "Quantity updated.")}>ADD ONE MORE</button>
                      <button disabled={busyItem === key} onClick={() => mutateItem(key, () => removeCartItem(product._id, item.variant._id), "Removed from your bag.")}>REMOVE</button>
                    </div>
                  </div>
                  <span className="cart-line__quantity">QTY {item.quantity}</span>
                </article>
              );
            })}
          </section>
          <form className="order-summary" onSubmit={checkout}>
            <span className="eyebrow">THE SUMMARY</span>
            <div className="checkout-address">
              <span className="eyebrow">DELIVERY ADDRESS</span>
              <label>FULL NAME<input autoComplete="name" value={shippingAddress.fullName || user?.fullname || ""} onChange={(event) => setShippingAddress({ ...shippingAddress, fullName: event.target.value })} maxLength={120} required /></label>
              <label>PHONE<input type="tel" autoComplete="tel" value={shippingAddress.phone || user?.contact || ""} onChange={(event) => setShippingAddress({ ...shippingAddress, phone: event.target.value })} minLength={7} maxLength={20} required /></label>
              <label>ADDRESS LINE 1<input autoComplete="address-line1" value={shippingAddress.addressLine1} onChange={(event) => setShippingAddress({ ...shippingAddress, addressLine1: event.target.value })} maxLength={200} required /></label>
              <label>ADDRESS LINE 2 <small>OPTIONAL</small><input autoComplete="address-line2" value={shippingAddress.addressLine2} onChange={(event) => setShippingAddress({ ...shippingAddress, addressLine2: event.target.value })} maxLength={200} /></label>
              <div className="checkout-address__city"><label>CITY<input autoComplete="address-level2" value={shippingAddress.city} onChange={(event) => setShippingAddress({ ...shippingAddress, city: event.target.value })} maxLength={80} required /></label><label>POSTAL CODE<input autoComplete="postal-code" value={shippingAddress.postalCode} onChange={(event) => setShippingAddress({ ...shippingAddress, postalCode: event.target.value })} minLength={3} maxLength={12} required /></label></div>
              <div className="checkout-address__city"><label>STATE / REGION<input autoComplete="address-level1" value={shippingAddress.state} onChange={(event) => setShippingAddress({ ...shippingAddress, state: event.target.value })} maxLength={80} required /></label><label>COUNTRY<input autoComplete="country-name" value={shippingAddress.country} onChange={(event) => setShippingAddress({ ...shippingAddress, country: event.target.value })} maxLength={80} required /></label></div>
            </div>
            <div className="order-summary__row"><span>Subtotal</span><strong>{formatPrice(cart.totalPrice, cart.currency)}</strong></div>
            <div className="order-summary__row"><span>Shipping</span><span>Calculated at checkout</span></div>
            <p className="order-summary__note">Razorpay secure checkout · Test-mode keys are recommended while testing. Shipping fees and taxes are not included.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="solid-button" type="submit" disabled={checkoutBusy || cartLoading}>{checkoutBusy ? "PREPARING SECURE CHECKOUT…" : "CONTINUE TO PAYMENT"} <span aria-hidden="true">↗</span></button>
            <Link href="/#collection" className="text-link">CONTINUE EXPLORING <span aria-hidden="true">↗</span></Link>
          </form>
        </div>
      ) : (
        <div className="empty-state"><span className="eyebrow">A CLEAN SLATE</span><h2>Nothing in the bag.<br /><em>For now.</em></h2><p>The good ones have a way of finding their way here.</p><Link className="solid-button" href="/#collection">EXPLORE THE EDIT <span aria-hidden="true">↗</span></Link></div>
      )}
    </div>
  );
}
