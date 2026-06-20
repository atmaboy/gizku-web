/**
 * Public API untuk mengambil landing_content per section.
 * Digunakan oleh komponen frontend (Footer, dll) untuk fetch data dinamis.
 *
 * GET /api/landing?section=footer
 * GET /api/landing?section=hero
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { landingContent } from '@/drizzle/schema'
import { eq, asc, and } from 'drizzle-orm'

export const revalidate = 60 // ISR: revalidate setiap 60 detik

export async function GET(req: NextRequest) {
  try {
    const section = req.nextUrl.searchParams.get('section')

    const conditions = [
      eq(landingContent.isActive, true),
      ...(section ? [eq(landingContent.section, section)] : []),
    ]

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
