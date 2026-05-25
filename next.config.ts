// next.config.ts — MPG Finance v2
// FIXED from v1:
//   - Removed ignoreBuildErrors: true (TypeScript errors now block build = intentional)
//   - Removed ignoreDuringBuilds: true (ESLint errors now surface = intentional)
//   - Removed --turbopack flag from build (stable webpack for production)
import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Allow uploads folder to be served
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default config;
