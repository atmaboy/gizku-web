/**
 * GET /api/footer-content
 * Public endpoint — dikonsumsi landing page footer.
 * Mengembalikan semua item footer yang aktif.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { landingContent } from '@/drizzle/schema'
import { eq, and, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(landingContent)
      .where(
        and(
          eq(landingContent.section, 'footer'),
          eq(landingContent.isActive, true),
        )
      )
      .orderBy(asc(landingContent.sortOrder))

    // Kelompokkan per slug agar mudah diakses di frontend
    const bySlug: Record<string, typeof rows[0]> = {}
    for (const row of rows) {
      bySlug[row.slug] = row
    }

    return NextResponse.json({ data: rows, bySlug }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (e) {
    console.error('[footer-content GET]', e)
    return NextResponse.json({ error: 'Gagal memuat footer' }, { status: 500 })
  }
}
