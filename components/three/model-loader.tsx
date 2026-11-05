"use client";

import { Html, useProgress } from "@react-three/drei";

export function ModelLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="model-loader" role="status">
        <span className="model-loader__ring" />
        <span>Preparing the piece</span>
        <span className="model-loader__progress">{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}
