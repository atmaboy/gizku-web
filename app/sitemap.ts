import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { legalDocuments } from '@/drizzle/schema'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gizku.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/login`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  try {
    const docs = await db
      .select({ slug: legalDocuments.slug, updatedAt: legalDocuments.updatedAt })
      .from(legalDocuments)

    const legalRoutes: MetadataRoute.Sitemap = docs.map(d => ({
      url: `${SITE_URL}/legal/${d.slug}`,
      lastModified: d.updatedAt,
      changeFrequency: 'yearly',
      priority: 0.3,
    }))

    return [...staticRoutes, ...legalRoutes]
  } catch (e) {
    console.error('[sitemap] gagal memuat daftar dokumen legal', e)
    return staticRoutes
  }
}
