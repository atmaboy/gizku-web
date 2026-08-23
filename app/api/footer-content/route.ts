/**
 * GET /api/footer-content
 * Public endpoint — dikonsumsi landing page footer.
 * Mengembalikan semua item footer yang aktif.
 */
import { NextResponse } from 'next/server'
import { getFooterContentBySlug } from '@/lib/landingContent'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const bySlug = await getFooterContentBySlug()
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
