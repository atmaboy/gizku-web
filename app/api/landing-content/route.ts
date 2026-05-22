/**
 * GET /api/landing-content
 * Public endpoint — dikonsumsi landing page.
 * Mengembalikan semua konten aktif, dikelompokkan per section.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { landingContent } from '@/drizzle/schema'
import { eq, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(landingContent)
      .where(eq(landingContent.isActive, true))
      .orderBy(asc(landingContent.sortOrder))

    // Kelompokkan per section
    const grouped: Record<string, typeof rows> = {}
    for (const row of rows) {
      if (!grouped[row.section]) grouped[row.section] = []
      grouped[row.section].push(row)
    }

    return NextResponse.json({ data: grouped }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (e) {
    console.error('[landing-content GET]', e)
    return NextResponse.json({ error: 'Gagal memuat konten' }, { status: 500 })
  }
}
