/**
 * GET /api/footer-content
 * Public endpoint — kept for other clients (e.g. gizku-mobile).
 *
 * Built from the published Landing Builder document (footer section) in the
 * exact old shape: { data: rows[], bySlug: { 'footer-brand': row, ... } }.
 */
import { NextResponse } from 'next/server'
import { getPublishedLanding } from '@/lib/landing/repo'
import { toLegacyFooter } from '@/lib/landing/legacy'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { content, publishedAt, legalDocs } = await getPublishedLanding()
    const bySlug = toLegacyFooter(
      content,
      publishedAt ? new Date(publishedAt) : undefined,
      1000,
      legalDocs.length ? legalDocs.map(d => ({ label: d.title, url: `/legal/${d.slug}` })) : undefined,
    )
    const rows = Object.values(bySlug)

    return NextResponse.json({ data: rows, bySlug }, {
      headers: {
        // no-store: browser/CDN tidak boleh cache, selalu ambil dari server
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (e) {
    console.error('[footer-content GET]', e)
    return NextResponse.json({ error: 'Gagal memuat footer' }, { status: 500 })
  }
}
