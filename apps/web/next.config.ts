import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@rentevent/types', '@rentevent/validators'],
  // Local-only proxy so a dev server can read the production API without
  // tripping its CORS allow-list. Inert unless DEV_API_PROXY_TARGET is set.
  async rewrites() {
    const target = process.env.DEV_API_PROXY_TARGET;
    if (!target) return [];
    return [{ source: '/api-proxy/:path*', destination: `${target}/:path*` }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
