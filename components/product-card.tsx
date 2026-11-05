"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice, productImage } from "@/lib/api";
import { useStore } from "@/components/store-provider";
import type { Product } from "@/types/store";

const editorialColors: Record<string, string> = {
  black: "#282724",
  white: "#e7e2d9",
  cream: "#d8d0bf",
  olive: "#59604d",
  grey: "#96948f",
  gray: "#96948f",
  blue: "#58697b",
  brown: "#705744",
  red: "#673c3d",
  beige: "#d6c6ab",
};

function colorValue(value: string) {
  const key = value.toLowerCase();
  return editorialColors[key] ?? `hsl(${[...key].reduce((total, char) => total + char.charCodeAt(0), 0) % 360} 18% 55%)`;
}

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { user, wishlist, toggleWishlist, addToCart, notify } = useStore();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const variant = product.variants?.find((item) => item.stock > 0) ?? product.variants?.[0];
  const colorOptions = [...new Set(
    (product.variants ?? [])
      .map((item) => Object.entries(item.attributes ?? {}).find(([name]) => name.toLowerCase() === "color")?.[1])
      .filter((value): value is string => Boolean(value)),
  )].slice(0, 4);
  const saved = wishlist.includes(product._id);
  const price = variant?.price ?? product.price;

  async function handleWishlist() {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      setBusy(true);
      await toggleWishlist(product._id);
      notify(saved ? "Removed from your wishlist." : "Saved to your wishlist.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update your wishlist.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!variant?._id || variant.stock < 1) {
      notify("This piece is currently out of stock.", "error");
      return;
    }
    try {
      setBusy(true);
      await addToCart(product._id, variant._id);
      notify("Added to your bag.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not add this piece.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.article
      className="product-card"
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -35px 0px" }}
      transition={{ duration: 0.55, delay: Math.min(index % 4, 3) * 0.07, ease: [0.2, 0.75, 0.2, 1] }}
    >
      <div className="product-card__media">
        <Link href={`/product/${product._id}`} className="product-card__image-link" aria-label={`View ${product.title}`}>
          <Image src={productImage(product)} alt={product.title} fill sizes="(max-width: 760px) 48vw, (max-width: 1100px) 32vw, 24vw" loading={index < 4 ? "eager" : "lazy"} unoptimized />
        </Link>
        <span className="product-card__edition">{String(index + 1).padStart(2, "0")} / SN.</span>
        <button className={`product-card__wishlist ${saved ? "product-card__wishlist--saved" : ""}`} onClick={handleWishlist} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={saved} disabled={busy}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.45" aria-hidden="true"><path d="M20.2 4.9a5.2 5.2 0 0 0-7.4 0L12 5.7l-.8-.8a5.2 5.2 0 1 0-7.4 7.4L12 20.5l8.2-8.2a5.2 5.2 0 0 0 0-7.4Z" /></svg>
        </button>
        <button className="product-card__quick-add" onClick={handleAdd} disabled={busy || !variant || variant.stock < 1} aria-label={`Add ${product.title} to bag`}>
          {busy ? "ADDING…" : variant?.stock ? "QUICK ADD  +" : "SOLD OUT"}
        </button>
      </div>
      <div className="product-card__meta">
        <div className="product-card__title-row">
          <Link href={`/product/${product._id}`}><h3>{product.title}</h3></Link>
          <span>{formatPrice(price?.amount ?? 0, price?.currency ?? "INR")}</span>
        </div>
        <p>{product.description}</p>
        <div className="product-card__swatches" aria-label={colorOptions.length ? `${colorOptions.length} available colours` : undefined}>
          {colorOptions.map((color) => <span key={color} title={color} style={{ backgroundColor: colorValue(color) }} />)}
          {colorOptions.length > 0 && <small>{colorOptions.length} colour{colorOptions.length > 1 ? "s" : ""}</small>}
        </div>
      </div>
    </motion.article>
  );
}
