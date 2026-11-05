"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { SellerOrders } from "@/components/seller-orders";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { api, formatPrice, productImage } from "@/lib/api";
import type { Product } from "@/types/store";

export default function SellerDashboardPage() {
  const { ready, user } = useProtectedRoute("seller");
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    api<{ products: Product[] }>("/products/seller")
      .then((response) => setProducts(response.products ?? []))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Your listings could not be loaded."))
      .finally(() => setLoading(false));
  }, [ready]);

  if (!ready) return <div className="center-state"><span className="loading-mark" /></div>;
  return (
    <div className="account-page page-gutter seller-dashboard">
      <header className="seller-dashboard__hero"><div><span className="eyebrow">THE INDEPENDENT STUDIO / {user?.fullname.toUpperCase()}</span><h1>Your collection.<br /><em>Your call.</em></h1><p>You&apos;re building something worth finding.</p></div><Link className="solid-button" href="/seller/create-product">LIST A NEW PIECE <span aria-hidden="true">↗</span></Link></header>
      <SellerOrders />
      <section className="seller-listings">
        <div className="seller-section-heading"><div><span className="eyebrow">YOUR COLLECTION</span><h2>Pieces on the floor.</h2></div><span className="seller-order-count">{products.length} LISTING{products.length === 1 ? "" : "S"}</span></div>
        {loading ? <div className="center-state"><span className="loading-mark" /></div> : error ? <p className="form-error" role="alert">{error}</p> : products.length ? (
          <div className="seller-listing-grid">{products.map((product) => <Link className="seller-listing" key={product._id} href={`/seller/product/${product._id}`}><div className="seller-listing__image"><Image src={productImage(product)} alt={product.title} fill sizes="(max-width: 760px) 66px, 88px" unoptimized /></div><div><span className="eyebrow">{product.variants.length} OPTION{product.variants.length === 1 ? "" : "S"}</span><h3>{product.title}</h3><span>{formatPrice(product.price.amount, product.price.currency)}</span></div><span className="seller-listing__arrow" aria-hidden="true">↗</span></Link>)}</div>
        ) : <div className="seller-orders__empty"><p>Nothing on the floor.</p><Link className="text-link" href="/seller/create-product">LIST YOUR FIRST PIECE <span aria-hidden="true">↗</span></Link></div>}
      </section>
    </div>
  );
}
