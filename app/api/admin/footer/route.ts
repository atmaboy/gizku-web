/**
 * Admin API untuk konfigurasi footer landing page.
 * Memanfaatkan tabel landing_content dengan section = 'footer'.
 *
 * GET    — ambil semua row section footer
 * POST   ?action=upsert   body: FooterPayload
 * POST   ?action=toggle_active  body: { id, isActive }
 * DELETE — hapus satu row  body: { id }
 */
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { landingContent } from '@/drizzle/schema'
import { eq, asc } from 'drizzle-orm'
import { ok, err, setCors } from '@/lib/utils'

const SECTION = 'footer'

function invalidateFooterCache() {
  revalidateTag('footer-content')   // bust unstable_cache tag di footer-content API
  revalidatePath('/')               // revalidate landing page (SSR/ISR)
}

export async function OPTIONS() {
  const h = new Headers()
  setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(landingContent)
      .where(eq(landingContent.section, SECTION))
      .orderBy(asc(landingContent.sortOrder))
    return ok({ data: rows })
  } catch (e) {
    console.error('[admin/footer GET]', e)
    return err('Gagal mengambil data footer')
  }
}

export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action') ?? 'upsert'

    if (action === 'upsert') {
      const body = await req.json()
      const { id, slug, title, subtitle, body: bodyText, meta, isActive, sortOrder } = body

      if (!slug || !title) return err('slug dan title wajib diisi', 400)

      if (id) {
        await db.update(landingContent).set({
          section:   SECTION,
          slug,
          title,
          subtitle:  subtitle  ?? null,
          body:      bodyText  ?? null,
          meta:      meta      ?? null,
          isActive:  isActive  ?? true,
          sortOrder: sortOrder ?? 0,
          updatedAt: new Date(),
        }).where(eq(landingContent.id, id))
      } else {
        await db.insert(landingContent).values({
          section:   SECTION,
          slug,
          title,
          subtitle:  subtitle  ?? null,
          body:      bodyText  ?? null,
          meta:      meta      ?? null,
          isActive:  isActive  ?? true,
          sortOrder: sortOrder ?? 0,
        })
      }

      invalidateFooterCache()
      return ok({ message: id ? 'Footer diperbarui' : 'Item footer ditambahkan' })
    }

    if (action === 'toggle_active') {
      const { id, isActive } = await req.json()
      if (!id) return err('id diperlukan', 400)
      await db.update(landingContent)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(landingContent.id, id))
      invalidateFooterCache()
      return ok({ message: `Item ${isActive ? 'diaktifkan' : 'dinonaktifkan'}` })
    }

    return err('Action tidak dikenal', 400)
  } catch (e: unknown) {
    console.error('[admin/footer POST]', e)
    if (e instanceof Error && e.message.includes('unique')) {
      return err('Slug sudah digunakan', 409)
    }
    return err('Gagal menyimpan konfigurasi footer')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return err('id diperlukan', 400)
    await db.delete(landingContent).where(eq(landingContent.id, id))
    invalidateFooterCache()
    return ok({ message: 'Item footer dihapus' })
  } catch (e) {
    console.error('[admin/footer DELETE]', e)
    return err('Gagal menghapus item footer')
  }
}

export { NextResponse }
