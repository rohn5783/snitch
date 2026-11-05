"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { ProductCard } from "@/components/product-card";
import { useStore } from "@/components/store-provider";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { api } from "@/lib/api";
import type { Product } from "@/types/store";

export default function WishlistPage() {
  const { ready } = useProtectedRoute("buyer");
  const { wishlist } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    api<{ wishlist: { products: Product[] } }>("/wishlist")
      .then((response) => setProducts(response.wishlist?.products ?? []))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Your wishlist could not be loaded."))
      .finally(() => setLoading(false));
  }, [ready, wishlist]);

  if (!ready) return <div className="center-state"><span className="loading-mark" /></div>;
  return (
    <div className="account-page page-gutter">
      <PageHeading label="YOUR EDIT / 02" title="The keepers." description="The things you can't stop thinking about." />
      {loading ? <div className="center-state"><span className="loading-mark" /></div> : error ? <div className="center-state"><p className="form-error">{error}</p></div> : products.length ? <div className="product-grid product-grid--light">{products.map((product, index) => <ProductCard key={product._id} product={product} index={index} />)}</div> : <div className="empty-state"><span className="eyebrow">A LITTLE INSPIRATION</span><h2>Nothing saved.<br /><em>Yet.</em></h2><p>The pieces worth keeping will find you.</p><Link className="solid-button" href="/#collection">DISCOVER YOUR EDIT <span aria-hidden="true">↗</span></Link></div>}
    </div>
  );
}
