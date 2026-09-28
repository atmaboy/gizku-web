/**
 * GET /api/landing-content
 * Public endpoint — kept for other clients (e.g. gizku-mobile).
 *
 * Since the Landing Builder (sql/018) the source of truth is the published
 * landing_page document; toLegacySectionMap() rebuilds the exact old response
 * shape ({ data: { hero: [...], how_it_works: [...], ... } }) from it, so
 * existing consumers keep working. Only visible sections are included.
 */
import { NextResponse } from 'next/server'
import { getPublishedLanding } from '@/lib/landing/repo'
import { toLegacySectionMap } from '@/lib/landing/legacy'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { content, publishedAt, legalDocs } = await getPublishedLanding()
    const grouped = toLegacySectionMap(
      content,
      publishedAt ? new Date(publishedAt) : undefined,
      legalDocs.length ? legalDocs.map(d => ({ label: d.title, url: `/legal/${d.slug}` })) : undefined,
    )

    return NextResponse.json({ data: grouped }, {
      headers: {
        // no-store: the admin's revalidatePath() calls don't purge a Route
        // Handler's CDN-level cache, so a shared Cache-Control here can
        // serve stale content for minutes after an admin edit.
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (e) {
    console.error('[landing-content GET]', e)
    return NextResponse.json({ error: 'Gagal memuat konten' }, { status: 500 })
  }
}
