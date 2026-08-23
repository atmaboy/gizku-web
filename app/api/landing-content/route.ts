/**
 * GET /api/landing-content
 * Public endpoint — dikonsumsi landing page.
 * Mengembalikan semua konten aktif, dikelompokkan per section.
 */
import { NextResponse } from 'next/server'
import { getLandingContentGrouped } from '@/lib/landingContent'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const grouped = await getLandingContentGrouped()

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
