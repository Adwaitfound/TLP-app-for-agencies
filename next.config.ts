import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  turbopack: {},
  images: { unoptimized: true },
  // Suppress hydration warnings from Radix UI dynamic IDs
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;

