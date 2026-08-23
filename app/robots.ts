import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gizku.com'
const IS_PRODUCTION = (process.env.NEXT_PUBLIC_APP_ENV ?? 'production') === 'production'

// Non-production deployments (staging/preview) shouldn't show up in search
// results at all — they share content with production and would just create
// duplicate-content noise.
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/main'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
