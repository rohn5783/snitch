import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Windows / OneDrive concurrent file-lock contention during static generation
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
