"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useCallback, useEffect, useState, type FormEvent } from "react";
import { PageHeading } from "@/components/page-heading";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { api, formatPrice, productImage } from "@/lib/api";
import type { Product, ProductVariant } from "@/types/store";

type Attribute = { name: string; value: string };

export default function SellerProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const { ready } = useProtectedRoute("seller");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingVariant, setSavingVariant] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [sku, setSku] = useState("");
  const [priceAmount, setBasePrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [attributes, setAttributes] = useState<Attribute[]>([{ name: "Size", value: "" }]);
  const [stock, setStock] = useState("1");
  const [variantPrice, setVariantPrice] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [variantEdits, setVariantEdits] = useState<Record<string, { stock: string; priceAmount: string }>>({});

  const loadProduct = useCallback(async () => {
    try {
      const response = await api<{ product: Product }>(`/products/seller/${encodeURIComponent(productId)}`);
      setProduct(response.product);
      setTitle(response.product.title);
      setDescription(response.product.description);
      setCategory(response.product.category ?? "Other");
      setSku(response.product.sku ?? "");
      setBasePrice(String(response.product.price.amount));
      setIsActive(response.product.isActive !== false);
      setVariantEdits(Object.fromEntries(response.product.variants.map((variant) => [
        variant._id,
        { stock: String(variant.stock), priceAmount: String(variant.price?.amount ?? response.product.price.amount) },
      ])));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The listing could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (ready) void Promise.resolve().then(loadProduct);
  }, [loadProduct, ready]);

  function updateAttribute(index: number, field: keyof Attribute, value: string) {
    setAttributes((current) => current.map((attribute, position) => position === index ? { ...attribute, [field]: value } : attribute));
  }

  async function submitVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanAttributes = Object.fromEntries(attributes.filter((attribute) => attribute.name.trim() && attribute.value.trim()).map((attribute) => [attribute.name.trim(), attribute.value.trim()]));
    if (!Object.keys(cleanAttributes).length) {
      setError("Add at least one size, colour, or other option.");
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setError("Each variant image must be smaller than 5 MB.");
      return;
    }
    setAdding(true);
    setError("");
    try {
      const data = new FormData();
      files.forEach((file) => data.append("images", file));
      data.append("stock", stock);
      data.append("priceAmount", variantPrice);
      data.append("priceCurrency", product?.price.currency ?? "INR");
      data.append("attributes", JSON.stringify(cleanAttributes));
      await api(`/products/${encodeURIComponent(productId)}/variants`, { method: "POST", body: data });
      setAttributes([{ name: "Size", value: "" }]);
      setStock("1");
      setVariantPrice("");
      setFiles([]);
      await loadProduct();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This option could not be added.");
    } finally {
      setAdding(false);
    }
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProduct(true);
    setError("");
    try {
      const response = await api<{ product: Product }>(`/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ title, description, category, sku, priceAmount: Number(priceAmount), isActive }),
      });
      setProduct(response.product);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The listing could not be updated.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function saveVariant(variantId: string) {
    const values = variantEdits[variantId];
    if (!values) return;
    setSavingVariant(variantId);
    setError("");
    try {
      const response = await api<{ product: Product }>(`/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`, {
        method: "PATCH",
        body: JSON.stringify({ stock: Number(values.stock), priceAmount: Number(values.priceAmount) }),
      });
      setProduct(response.product);
      setVariantEdits(Object.fromEntries(response.product.variants.map((variant) => [
        variant._id,
        { stock: String(variant.stock), priceAmount: String(variant.price?.amount ?? response.product.price.amount) },
      ])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inventory could not be updated.");
    } finally {
      setSavingVariant("");
    }
  }

  if (!ready) return <div className="center-state"><span className="loading-mark" /></div>;
  if (loading) return <div className="center-state"><span className="loading-mark" /></div>;
  if (!product) return <div className="account-page page-gutter"><PageHeading label="YOUR STUDIO" title="Listing not found." description={error} backHref="/seller/dashboard" /></div>;

  return (
    <div className="account-page page-gutter seller-product-page">
      <PageHeading label="YOUR STUDIO / LISTING" title={product.title} description={product.description} backHref="/seller/dashboard" />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="seller-product-summary"><div className="seller-product-summary__image"><Image src={productImage(product)} alt={product.title} fill sizes="100px" unoptimized /></div><div><span className="eyebrow">BASE PRICE · {product.isActive === false ? "HIDDEN" : "LIVE"}</span><strong>{formatPrice(product.price.amount, product.price.currency)}</strong><span>{product.category ?? "Other"}{product.sku ? ` · SKU ${product.sku}` : ""} · {product.variants.length} option{product.variants.length === 1 ? "" : "s"}</span></div><div className="seller-product-summary__actions"><button className="outline-button" type="button" onClick={() => setEditing((current) => !current)}>{editing ? "CLOSE DETAILS" : "EDIT LISTING"}</button><button className="outline-button" type="button" onClick={() => setAdding((current) => !current)}>{adding ? "CLOSE OPTION" : "ADD AN OPTION"}</button></div></div>
      {editing && <form className="variant-editor" onSubmit={submitProduct}><div className="seller-section-heading"><div><span className="eyebrow">LISTING DETAILS</span><h2>Keep it current.</h2></div></div><label>PRODUCT NAME<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={120} required /></label><label>DESCRIPTION<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={3000} required /></label><div className="variant-editor__numbers"><label>CATEGORY<input value={category} onChange={(event) => setCategory(event.target.value)} minLength={2} maxLength={80} required /></label><label>SKU<input value={sku} onChange={(event) => setSku(event.target.value)} maxLength={64} /></label></div><div className="variant-editor__numbers"><label>BASE PRICE ({product.price.currency})<input type="number" min="0.01" step="0.01" value={priceAmount} onChange={(event) => setBasePrice(event.target.value)} required /></label><label className="availability-toggle"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> LISTING AVAILABLE TO BUYERS</label></div><button className="solid-button" type="submit" disabled={savingProduct}>{savingProduct ? "SAVING LISTING…" : "SAVE LISTING DETAILS"} <span aria-hidden="true">↗</span></button></form>}
      <section className="seller-variants">
        <div className="seller-section-heading"><div><span className="eyebrow">SIZES, COLOURS & STOCK</span><h2>Make it available.</h2></div></div>
        {product.variants.length ? <div className="variant-table">{product.variants.map((variant: ProductVariant) => <form className="variant-table__row" key={variant._id} onSubmit={(event) => { event.preventDefault(); void saveVariant(variant._id); }}><strong>{Object.entries(variant.attributes ?? {}).map(([name, value]) => `${name}: ${value}`).join(" · ") || "Standard option"}</strong><label>QUANTITY<input aria-label={`Quantity for ${Object.values(variant.attributes ?? {}).join(" ")}`} type="number" min="0" step="1" value={variantEdits[variant._id]?.stock ?? variant.stock} onChange={(event) => setVariantEdits((current) => ({ ...current, [variant._id]: { ...current[variant._id], stock: event.target.value, priceAmount: current[variant._id]?.priceAmount ?? String(variant.price?.amount ?? product.price.amount) } }))} required /></label><label>PRICE<input aria-label={`Price for ${Object.values(variant.attributes ?? {}).join(" ")}`} type="number" min="0.01" step="0.01" value={variantEdits[variant._id]?.priceAmount ?? String(variant.price?.amount ?? product.price.amount)} onChange={(event) => setVariantEdits((current) => ({ ...current, [variant._id]: { stock: current[variant._id]?.stock ?? String(variant.stock), priceAmount: event.target.value } }))} required /></label><button className="outline-button" type="submit" disabled={savingVariant === variant._id}>{savingVariant === variant._id ? "SAVING…" : "SAVE"}</button></form>)}</div> : <p className="form-hint">No options yet. Add at least one size or colour so shoppers can purchase this piece.</p>}
      </section>
      {adding && <form className="variant-editor" onSubmit={submitVariant}><div className="seller-section-heading"><div><span className="eyebrow">NEW OPTION</span><h2>A detail worth choosing.</h2></div></div><div className="variant-editor__attributes">{attributes.map((attribute, index) => <div className="variant-editor__attribute" key={index}><label>OPTION<input value={attribute.name} onChange={(event) => updateAttribute(index, "name", event.target.value)} placeholder="Size, colour..." required /></label><label>VALUE<input value={attribute.value} onChange={(event) => updateAttribute(index, "value", event.target.value)} placeholder="Small, black..." required /></label><button type="button" aria-label="Remove option" onClick={() => setAttributes((current) => current.filter((_, position) => position !== index))}>×</button></div>)}</div><button type="button" className="text-link" onClick={() => setAttributes((current) => [...current, { name: "", value: "" }])}>+ ADD ANOTHER OPTION</button><div className="variant-editor__numbers"><label>QUANTITY<input type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} required /></label><label>PRICE OVERRIDE <small>Leave blank to use base price</small><input type="number" min="0.01" step="0.01" value={variantPrice} onChange={(event) => setVariantPrice(event.target.value)} placeholder={String(product.price.amount)} /></label></div><label className="variant-editor__upload">PHOTOGRAPHS <input type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 7))} />{files.length > 0 && <span>{files.length} selected</span>}</label><button className="solid-button" type="submit" disabled={adding}>{adding ? "SAVING OPTION…" : "SAVE THIS OPTION"} <span aria-hidden="true">↗</span></button></form>}
      <Link href="/seller/dashboard" className="text-link seller-product-back">← BACK TO YOUR STUDIO</Link>
    </div>
  );
}
