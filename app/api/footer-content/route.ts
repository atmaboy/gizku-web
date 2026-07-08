/**
 * GET /api/footer-content
 * Public endpoint — dikonsumsi landing page footer.
 * Mengembalikan semua item footer yang aktif.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { landingContent } from '@/drizzle/schema'
import { eq, and, asc } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

const getFooterRows = unstable_cache(
  async () => {
    return await db
      .select()
      .from(landingContent)
      .where(
        and(
          eq(landingContent.section, 'footer'),
          eq(landingContent.isActive, true),
        )
      )
      .orderBy(asc(landingContent.sortOrder))
  },
  ['footer-content'],
  { tags: ['footer-content'], revalidate: false }
)

export async function GET() {
  try {
    const rows = await getFooterRows()

    // Kelompokkan per slug agar mudah diakses di frontend
    const bySlug: Record<string, typeof rows[0]> = {}
    for (const row of rows) {
      bySlug[row.slug] = row
    }

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
