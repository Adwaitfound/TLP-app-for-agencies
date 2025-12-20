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
  // Production optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  // Optimize bundle for faster loading
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-avatar', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react'],
  },
  // Static page generation where possible
  output: 'standalone',
};

export default nextConfig;

