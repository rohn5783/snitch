"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { ProductImage } from "@/types/store";
import { ThreeErrorBoundary } from "@/components/three/three-error-boundary";

const ProductViewerCanvas = dynamic(
  () => import("@/components/three/product-viewer-canvas").then((module) => module.ProductViewerCanvas),
  { ssr: false, loading: () => <div className="product-viewer__unavailable">Preparing 3D preview</div> },
);

const swatches = [
  { label: "Carbon", value: "#282724" },
  { label: "Chalk", value: "#d8d3c8" },
  { label: "Olive", value: "#59604d" },
  { label: "Oxblood", value: "#673c3d" },
];

export function Product3DViewer({
  images,
  modelUrl,
  title,
}: {
  images: ProductImage[];
  modelUrl?: string;
  title: string;
}) {
  const [active, setActive] = useState(0);
  const [tint, setTint] = useState(swatches[0].value);
  const [view, setView] = useState<"3d" | "gallery">("3d");
  const startX = useRef<number | null>(null);
  const gallery = images.length ? images : [{ url: "/snitch_editorial.png" }];
  const showModel = Boolean(modelUrl) && view === "3d";

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    const change = startX.current - event.clientX;
    if (Math.abs(change) > 40 && gallery.length > 1) {
      setActive((index) => (index + (change > 0 ? 1 : -1) + gallery.length) % gallery.length);
    }
    startX.current = null;
  }

  return (
    <section className="product-viewer">
      <div
        className={`product-viewer__stage ${showModel ? "product-viewer__stage--3d" : "product-viewer__stage--photo"}`}
        onPointerDown={showModel ? undefined : startDrag}
        onPointerUp={showModel ? undefined : endDrag}
        onPointerCancel={showModel ? undefined : endDrag}
      >
        {showModel && modelUrl ? (
          <ThreeErrorBoundary fallback={<div className="product-viewer__canvas-fallback"><Image src={gallery[active].url} alt={title} fill sizes="(max-width: 760px) 100vw, 55vw" unoptimized /><span>3D PREVIEW UNAVAILABLE · EDITORIAL PHOTOGRAPHY SHOWN</span></div>}>
            <ProductViewerCanvas src={modelUrl} tint={tint} image={gallery[active].url} title={title} />
          </ThreeErrorBoundary>
        ) : (
          <Image src={gallery[active].url} alt={title} fill sizes="(max-width: 760px) 100vw, 55vw" className="product-viewer__image" draggable={false} unoptimized />
        )}
        {modelUrl && <div className="product-viewer__mode"><button className={view === "3d" ? "product-viewer__mode-active" : ""} onClick={() => setView("3d")}>3D MODEL</button><button className={view === "gallery" ? "product-viewer__mode-active" : ""} onClick={() => setView("gallery")}>PHOTOGRAPHS</button></div>}
        {gallery.length > 1 && view === "gallery" && (
          <div className="product-viewer__gallery-controls">
            <button aria-label="Previous product image" onClick={() => setActive((index) => (index - 1 + gallery.length) % gallery.length)}>←</button>
            <span>{String(active + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}</span>
            <button aria-label="Next product image" onClick={() => setActive((index) => (index + 1) % gallery.length)}>→</button>
          </div>
        )}
        <span className="product-viewer__badge">{showModel ? "INTERACTIVE 3D · DRAG TO ROTATE" : modelUrl ? "EDITORIAL PHOTOGRAPHY" : gallery.length > 1 ? "PHOTOGRAPHY · DRAG TO BROWSE" : "EDITORIAL PHOTOGRAPHY"}</span>
      </div>
      {modelUrl && view === "3d" && (
        <div className="product-viewer__colorways" aria-label="Change model garment colour">
          <span>MODEL COLOUR</span>
          <div>
            {swatches.map((swatch) => (
              <button
                key={swatch.label}
                className={`product-swatch ${tint === swatch.value ? "product-swatch--active" : ""}`}
                style={{ backgroundColor: swatch.value }}
                aria-label={swatch.label}
                aria-pressed={tint === swatch.value}
                onClick={() => setTint(swatch.value)}
              />
            ))}
          </div>
        </div>
      )}
      {!modelUrl && <p className="product-viewer__note">Product photography shown. Add a GLB model URL to enable 360° viewing and colour controls.</p>}
    </section>
  );
}
