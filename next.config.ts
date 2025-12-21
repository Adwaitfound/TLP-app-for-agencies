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
  // On Vercel, omit standalone output to use platform defaults

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

  async redirects() {
    return [
      {
        source: '/work',
        destination: 'https://www.thelostproject.in/work',
        permanent: false,
      },
      {
        source: '/collections/video-production',
        destination: 'https://www.thelostproject.in/collections/video-production',
        permanent: false,
      },
      {
        source: '/collections/social-media',
        destination: 'https://www.thelostproject.in/collections/social-media',
        permanent: false,
      },
      {
        source: '/collections/design',
        destination: 'https://www.thelostproject.in/collections/design',
        permanent: false,
      },
      {
        source: '/contact',
        destination: 'https://www.thelostproject.in/pages/contact',
        permanent: false,
      },
      {
        source: '/shop',
        destination: 'https://www.thelostproject.in/collections/all',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;

