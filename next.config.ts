import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 480, 750, 1080],
    imageSizes: [64, 128, 256, 384],
  },

  async redirects() {
    return [
      // Short URL aliases → full authenticated routes
      {
        source: '/settings',
        destination: '/main/settings',
        permanent: false,
      },
      {
        source: '/catat',
        destination: '/main/catat',
        permanent: false,
      },
      {
        source: '/riwayat',
        destination: '/main/riwayat',
        permanent: false,
      },
    ]
  },

  async headers() {
    return [
      // ── Next.js static assets (hashed filenames) → immutable forever ──
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // ── Public root files (favicon.svg, manifest.json, robots.txt, etc.) ──
      {
        source: '/:file.:ext',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      // ── Public subdir assets (icons/, images/, etc.) ──
      {
        source: '/:folder/:file.:ext',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      // ── API routes: always fresh ──
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      // ── Security headers on all routes ──
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
}

export default nextConfig
