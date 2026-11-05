"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EditorialHeroImage } from "@/components/editorial-hero-image";
import { ProductCard } from "@/components/product-card";
import { useStore } from "@/components/store-provider";
import { useEditorialMotion } from "@/lib/motion";
import { api } from "@/lib/api";
import type { Product } from "@/types/store";

const collections = [
  { index: "01", name: "The modern uniform", filter: "men", note: "Quiet confidence. Every day.", image: "/snitch_editorial.png", tone: "ink" },
  { index: "02", name: "Soft structure", filter: "women", note: "Ease, with intention.", image: "/snitch_editorial_warm.png", tone: "sand" },
  { index: "03", name: "Off the grid", filter: "streetwear", note: "For days without a dress code.", image: "/snitch_editorial.png", tone: "olive" },
];

export function HomeStorefront({ initialSearch, sort }: { initialSearch: string; sort: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search] = useState(initialSearch);
  const [showAll, setShowAll] = useState(false);
  const { user } = useStore();
  const reduceMotion = useReducedMotion();
  useEditorialMotion();

  useEffect(() => {
    api<{ products: Product[] }>("/products")
      .then((response) => setProducts(response.products ?? []))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The collection could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const results = products.filter((product) =>
      !query || `${product.title} ${product.description}`.toLowerCase().includes(query),
    );
    if (sort === "new") {
      return results.toSorted((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }
    return results;
  }, [products, search, sort]);

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <motion.span className="eyebrow hero__eyebrow" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            AN INDEPENDENT POINT OF VIEW
          </motion.span>
          <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.1 }}>
            Dress like
            <br />
            <em>you mean it.</em>
          </motion.h1>
          <motion.div className="hero__bottom" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }}>
            <p>Good style isn&apos;t about keeping up.<br />It&apos;s about knowing what stays.</p>
            <Link href="#collection" className="circle-link" aria-label="Explore the collection"><span aria-hidden="true">↓</span></Link>
          </motion.div>
        </div>
        <div className="hero__visual">
          <EditorialHeroImage />
          <div className="hero__visual-note"><span>THE AUTUMN STUDY</span><span>2025 — 01</span></div>
        </div>
        <span className="hero__vertical" aria-hidden="true">CONSIDERED BY NATURE · WORN YOUR WAY</span>
      </section>

      <section className="manifesto-strip" aria-label="Our point of view">
        <span>STYLE, NOT STATUS</span><i aria-hidden="true">✳</i><span>MADE TO BE WORN</span><i aria-hidden="true">✳</i><span>ALWAYS YOURS</span><i aria-hidden="true">✳</i><span>STYLE, NOT STATUS</span>
      </section>

      <section className="collection-section page-gutter" id="collections">
        <div className="section-heading" data-reveal>
          <div><span className="eyebrow">01 — FIND YOUR POINT OF VIEW</span><h2>Wear it <em>your way.</em></h2></div>
          <Link className="text-link" href="#collection">Explore all collections <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="collection-grid">
          {collections.map((collection) => (
            <Link key={collection.index} href={`/?search=${encodeURIComponent(collection.filter)}#collection`} className={`collection-tile collection-tile--${collection.tone}`} data-reveal>
              <Image src={collection.image} alt="" fill sizes="(max-width: 760px) 50vw, 25vw" unoptimized />
              <span className="collection-tile__number">{collection.index} / 03</span>
              <div><span className="eyebrow">{collection.note}</span><h3>{collection.name}</h3><span className="collection-tile__link">DISCOVER <span aria-hidden="true">↗</span></span></div>
            </Link>
          ))}
          <Link href="#collection" className="collection-tile collection-tile--type" data-reveal>
            <span className="eyebrow">A PERSONAL ARCHIVE</span><span className="collection-tile__mark" aria-hidden="true">SN.</span>
            <div><h3>Your next<br />favourite thing.</h3><span className="collection-tile__link">MEET THE COLLECTION <span aria-hidden="true">↗</span></span></div>
          </Link>
        </div>
      </section>

      <section className="featured-section" id="collection">
        <div className="featured-section__inner page-gutter">
          <div className="section-heading section-heading--light" data-reveal>
            <div><span className="eyebrow">02 — THE PIECES WE KEEP</span><h2>New things.<br /><em>Long stories.</em></h2></div>
            <p>A considered edit from independent sellers. Fewer, better things. All with somewhere to go.</p>
          </div>
          <div className="product-grid">
            {visibleProducts.slice(0, showAll ? visibleProducts.length : 8).map((product, index) => <ProductCard key={product._id} product={product} index={index} />)}
          </div>
          {!loading && visibleProducts.length === 0 && (
            <div className="collection-empty" role="status">
              <span className="eyebrow">{error ? "A MOMENT, PLEASE" : "THE RACK IS QUIET"}</span>
              <h3>{error || (search ? "No pieces found for that search." : "The next edit is on its way.")}</h3>
              {error && <button className="outline-button" onClick={() => window.location.reload()}>TRY AGAIN</button>}
              {!error && search && <Link className="text-link" href="/#collection">See the full collection <span aria-hidden="true">↗</span></Link>}
            </div>
          )}
          {loading && <div className="product-grid product-grid--skeleton" aria-label="Loading collection">{Array.from({ length: 4 }, (_, index) => <div key={index} className="product-skeleton"><span /></div>)}</div>}
          {visibleProducts.length > 8 && <div className="featured-section__more"><button className="outline-button" type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? "SHOW THE EDIT" : "VIEW ALL PIECES"} <span aria-hidden="true">{showAll ? "↑" : "↗"}</span></button></div>}
        </div>
      </section>

      <section className="editorial-band" data-reveal>
        <Image src="/snitch_editorial_warm.png" alt="Soft tailoring in a neutral palette" fill sizes="100vw" unoptimized />
        <div className="editorial-band__wash" />
        <div className="editorial-band__copy"><span className="eyebrow">03 — THOUGHTFULLY, NEVER THOUGHTLESSLY</span><h2>Less, but<br /><em>better.</em></h2><p>Not another thing to own. A piece to reach for — again, and again.</p><Link className="light-button" href="#collection">FIND YOUR PIECE <span aria-hidden="true">↗</span></Link></div>
        <span className="editorial-band__index">THE SNITCH STUDY / 001</span>
      </section>

      <section className="last-word page-gutter" data-reveal>
        <span className="eyebrow">GOOD THINGS, GOOD PEOPLE</span>
        <h2>Find your next<br /><em>favourite thing.</em></h2>
        <p>Discover independent collections. Or let someone else discover yours.</p>
        <div className="last-word__actions">
          <Link className="solid-button" href="#collection">SHOP THE EDIT <span aria-hidden="true">↗</span></Link>
          <Link className="text-link" href={user?.role === "seller" ? "/seller/dashboard" : "/register"}>{user?.role === "seller" ? "Open your studio" : "Sell with us"} <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </>
  );
}
