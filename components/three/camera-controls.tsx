"use client";

import { OrbitControls } from "@react-three/drei";

export function CameraControls() {
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableDamping={false}
      minDistance={2.2}
      maxDistance={5.5}
      minPolarAngle={Math.PI * 0.3}
      maxPolarAngle={Math.PI * 0.72}
      rotateSpeed={0.75}
    />
  );
}
