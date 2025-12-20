import type { NextConfig } from "next";
const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: isProd,
  turbopack: {},
  images: {
    unoptimized: true,
    formats: ['image/webp'],
  },
  // Suppress hydration warnings from Radix UI dynamic IDs
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,

  // Optimize bundle for faster loading
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-popover',
      'lucide-react',
      'recharts',
    ],
    webpackBuildWorker: true,
  },

  // Static page generation where possible
  output: 'standalone',

  // Headers for performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
        ],
      },
    ];
  },
};

export default nextConfig;

