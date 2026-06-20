/**
 * Public API — GET /api/landing?section=footer
 * Digunakan oleh LandingFooter (dan section lain) untuk fetch konten secara ISR.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { landingContent } from '@/drizzle/schema'
import { eq, asc, and } from 'drizzle-orm'

export const revalidate = 60

export async function GET(req: NextRequest) {
  try {
    const section = req.nextUrl.searchParams.get('section')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [eq(landingContent.isActive, true)]
    if (section) conditions.push(eq(landingContent.section, section))

    const rows = await db
      .select()
      .from(landingContent)
      .where(and(...conditions))
      .orderBy(asc(landingContent.sortOrder))

    return NextResponse.json({ data: rows })
  } catch (e) {
    console.error('[api/landing GET]', e)
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}
