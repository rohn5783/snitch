"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Product3DViewer } from "@/components/three/product-3d-viewer";
import { ProductCard } from "@/components/product-card";
import { PageHeading } from "@/components/page-heading";
import { useStore } from "@/components/store-provider";
import { api, formatPrice } from "@/lib/api";
import type { Product, ProductVariant } from "@/types/store";

const modelDirectory = process.env.NEXT_PUBLIC_MODEL_ASSET_DIR?.replace(/\/$/, "");

export default function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const { user, addToCart, notify } = useStore();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    api<{ product: Product }>(`/products/detail/${encodeURIComponent(productId)}`)
      .then(async (response) => {
        if (!active) return;
        setProduct(response.product);
        const first = response.product.variants?.find((variant) => variant.stock > 0) ?? response.product.variants?.[0];
        setSelected(first?.attributes ?? {});
        try {
          const catalog = await api<{ products: Product[] }>("/products");
          if (active) setRelated(catalog.products.filter((item) => item._id !== productId).slice(0, 4));
        } catch (cause) {
          console.error("Could not load related products", cause);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "This piece could not be found.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  const attributes = useMemo(() => {
    const options = new Map<string, Set<string>>();
    for (const variant of product?.variants ?? []) {
      Object.entries(variant.attributes ?? {}).forEach(([name, value]) => {
        if (!options.has(name)) options.set(name, new Set());
        options.get(name)?.add(value);
      });
    }
    return options;
  }, [product]);
  const activeVariant = useMemo<ProductVariant | undefined>(
    () => product?.variants?.find((variant) =>
      Object.entries(selected).every(([name, value]) => variant.attributes?.[name] === value)
      && Object.keys(variant.attributes ?? {}).length === Object.keys(selected).length,
    ),
    [product, selected],
  );

  async function addPiece() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!activeVariant || activeVariant.stock < 1) {
      notify("Choose an available option to add this piece.", "error");
      return;
    }
    try {
      setAdding(true);
      await addToCart(productId, activeVariant._id);
      notify("Added to your bag.");
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Could not add this piece.", "error");
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <div className="center-state"><span className="eyebrow">GATHERING THE DETAILS</span><span className="loading-mark" /></div>;
  if (error || !product) return <div className="center-state"><PageHeading label="THE SNITCH EDIT" title="Piece not found." description={error} /><Link href="/" className="solid-button">BACK TO COLLECTION <span aria-hidden="true">↗</span></Link></div>;
  const price = activeVariant?.price ?? product.price;
  const modelUrl = product.modelUrl || (modelDirectory ? `${modelDirectory}/${product._id}.glb` : undefined);

  return (
    <div className="product-detail page-gutter">
      <nav className="breadcrumbs"><Link href="/">HOME</Link><span>/</span><span>THE COLLECTION</span><span>/</span><span>{product.title.toUpperCase()}</span></nav>
      <div className="product-detail__layout">
        <Product3DViewer images={activeVariant?.images?.length ? activeVariant.images : product.images} modelUrl={modelUrl} title={product.title} />
        <section className="product-info">
          <span className="eyebrow">A PIECE TO KEEP</span>
          <h1>{product.title}</h1>
          <p className="product-info__price">{formatPrice(price?.amount ?? 0, price?.currency ?? "INR")}</p>
          <p className="product-info__description">{product.description}</p>
          {[...attributes].map(([name, values]) => (
            <fieldset className="variant-group" key={name}>
              <legend>{name} <span>— {selected[name] ?? "CHOOSE"}</span></legend>
              <div className="variant-options">
                {[...values].map((value) => {
                  const available = product.variants.some((variant) => variant.stock > 0 && Object.entries({ ...selected, [name]: value }).every(([key, choice]) => variant.attributes?.[key] === choice));
                  return <button key={value} type="button" className={`variant-option ${selected[name] === value ? "variant-option--selected" : ""}`} onClick={() => setSelected((current) => ({ ...current, [name]: value }))} disabled={!available} aria-pressed={selected[name] === value}>{value}</button>;
                })}
              </div>
            </fieldset>
          ))}
          {!product.variants?.length && <p className="form-hint">This piece has no available options yet. Please check back soon.</p>}
          <button className="solid-button product-info__add" onClick={addPiece} disabled={adding || !activeVariant || activeVariant.stock < 1}>{adding ? "ADDING TO BAG…" : activeVariant?.stock ? "ADD TO BAG" : "CURRENTLY UNAVAILABLE"} <span aria-hidden="true">↗</span></button>
          <div className="product-info__fineprint"><span>COMPLIMENTARY SHIPPING OVER ₹5,000</span><span>INDEPENDENTLY LISTED</span><Link href="/orders">VIEW YOUR ORDERS <span aria-hidden="true">↗</span></Link></div>
          <details className="product-accordion"><summary>THE DETAILS <span aria-hidden="true">+</span></summary><p>{product.description}</p></details>
          <details className="product-accordion"><summary>THE SELLER <span aria-hidden="true">+</span></summary><p>Thoughtfully listed by an independent seller in the SNITCH community.</p></details>
        </section>
      </div>
      {related.length > 0 && <section className="related-section"><div className="section-heading"><div><span className="eyebrow">MORE TO DISCOVER</span><h2>In the <em>same mood.</em></h2></div><Link href="/#collection" className="text-link">VIEW ALL <span aria-hidden="true">↗</span></Link></div><div className="product-grid product-grid--light">{related.map((item, index) => <ProductCard key={item._id} product={item} index={index} />)}</div></section>}
    </div>
  );
}
