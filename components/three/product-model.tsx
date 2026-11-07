"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Color, Material, Mesh, Object3D } from "three";

export function ProductModel({ src, tint }: { src: string; tint: string }) {
  const { scene } = useGLTF(src);
  const model = useMemo(() => {
    const copy = clone(scene);
    const meshes: Array<{ mesh: Mesh; material: Material }> = [];
    copy.traverse((object: Object3D) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const materialSet = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const clonedMaterials = materialSet.map((material) => material.clone());
      mesh.material = Array.isArray(mesh.material) ? clonedMaterials : clonedMaterials[0];
      clonedMaterials.forEach((material) => {
        if ((material as Material & { color?: Color }).color) meshes.push({ mesh, material });
      });
    });
    return { copy, meshes };
  }, [scene]);

  useEffect(() => {
    const namedGarments = model.meshes.filter(({ mesh, material }) =>
      /cloth|garment|fabric|shirt|dress|jacket|sweater|apparel/i.test(`${mesh.name} ${material.name}`),
    );
    const tintTargets = namedGarments.length ? namedGarments : model.meshes.slice(0, 1);
    tintTargets.forEach(({ material }) => {
      const target = material as Material & { color?: Color };
      if (!target.color) return;
      target.color.set(tint);
    });
  }, [model, tint]);

  // Clean up WebGL GPU geometries and cloned materials on unmount
  useEffect(() => {
    const root = model.copy;
    return () => {
      root.traverse((object: Object3D) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m?.dispose());
      });
    };
  }, [model]);

  return <primitive object={model.copy} />;
}
