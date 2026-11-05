"use client";

import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { CameraControls } from "@/components/three/camera-controls";
import { ModelLoader } from "@/components/three/model-loader";
import { ProductLighting } from "@/components/three/product-lighting";
import { ProductModel } from "@/components/three/product-model";

export function ProductViewerCanvas({ src, tint, image, title }: { src: string; tint: string; image: string; title: string }) {
  return (
    <Canvas
      aria-label="Interactive three-dimensional product viewer. Drag to rotate; scroll to zoom."
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.2, 3.8], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback={<div className="product-viewer__canvas-fallback"><Image src={image} alt={title} fill sizes="(max-width: 760px) 100vw, 55vw" unoptimized /><span>3D PREVIEW UNAVAILABLE · EDITORIAL PHOTOGRAPHY SHOWN</span></div>}
    >
      <ProductLighting />
      <Suspense fallback={<ModelLoader />}>
        <group scale={1.65}>
          <ProductModel src={src} tint={tint} />
        </group>
      </Suspense>
      <CameraControls />
    </Canvas>
  );
}
