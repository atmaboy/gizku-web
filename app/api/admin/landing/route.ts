/**
 * Admin API untuk CRUD landing_content.
 * Semua endpoint dilindungi oleh middleware admin auth.
 *
 * GET    ?action=list[&section=hero]
 * POST   ?action=upsert  body: LandingContentPayload
 * DELETE ?action=delete  body: { id: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { landingContent } from '@/drizzle/schema'
import { eq, asc, and } from 'drizzle-orm'
import { ok, err, setCors } from '@/lib/utils'

export async function OPTIONS() {
  const h = new Headers()
  setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET(req: NextRequest) {
  try {
    const section = req.nextUrl.searchParams.get('section')
    const rows = await db
      .select()
      .from(landingContent)
      .where(section ? eq(landingContent.section, section) : undefined)
      .orderBy(asc(landingContent.sortOrder))
    return ok({ data: rows })
  } catch (e) {
    console.error('[admin/landing GET]', e)
    return err('Gagal mengambil data')
  }
}

export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')

    if (action === 'upsert') {
      const body = await req.json()
      const { id, section, slug, title, subtitle, body: bodyText, meta, isActive, sortOrder } = body

      if (!section || !slug || !title) return err('section, slug, dan title wajib diisi', 400)

      if (id) {
        // Update existing
        await db.update(landingContent).set({
          section,
          slug,
          title,
          subtitle:  subtitle  ?? null,
          body:      bodyText  ?? null,
          meta:      meta      ?? null,
          isActive:  isActive  ?? true,
          sortOrder: sortOrder ?? 0,
          updatedAt: new Date(),
        }).where(eq(landingContent.id, id))
        return ok({ message: 'Konten diperbarui' })
      } else {
        // Insert new
        const [inserted] = await db.insert(landingContent).values({
          section,
          slug,
          title,
          subtitle:  subtitle  ?? null,
          body:      bodyText  ?? null,
          meta:      meta      ?? null,
          isActive:  isActive  ?? true,
          sortOrder: sortOrder ?? 0,
        }).returning({ id: landingContent.id })
        return ok({ message: 'Konten ditambahkan', id: inserted.id })
      }
    }

    if (action === 'toggle_active') {
      const { id, isActive } = await req.json()
      if (!id) return err('id diperlukan', 400)
      await db.update(landingContent)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(landingContent.id, id))
      return ok({ message: `Konten ${isActive ? 'diaktifkan' : 'dinonaktifkan'}` })
    }

    return err('Action tidak dikenal', 400)
  } catch (e: unknown) {
    console.error('[admin/landing POST]', e)
    if (e instanceof Error && e.message.includes('unique')) {
      return err('Slug sudah digunakan, pilih slug lain', 409)
    }
    return err('Gagal menyimpan konten')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return err('id diperlukan', 400)
    await db.delete(landingContent).where(eq(landingContent.id, id))
    return ok({ message: 'Konten dihapus' })
  } catch (e) {
    console.error('[admin/landing DELETE]', e)
    return err('Gagal menghapus konten')
  }
}
