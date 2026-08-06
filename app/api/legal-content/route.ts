/**
 * GET /api/legal-content
 * Public endpoint — dikonsumsi halaman "Tentang Aplikasi" di web & mobile app.
 * Tidak memerlukan autentikasi. Mengembalikan seluruh dokumen legal (dengan
 * bodyHtml, agar detail dokumen bisa ditampilkan tanpa fetch tambahan) dan
 * konten About singleton, untuk kedua bahasa sekaligus — client memilih
 * bahasa mana yang dipakai.
 */
import { db } from '@/lib/db'
import { legalDocuments, legalDocumentTypes, aboutContent } from '@/drizzle/schema'
import { asc } from 'drizzle-orm'
import { ok, err, setCors } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  const h = new Headers()
  setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET() {
  try {
    const [documents, types, aboutRows] = await Promise.all([
      db.select().from(legalDocuments).orderBy(asc(legalDocuments.createdAt)),
      db.select().from(legalDocumentTypes),
      db.select().from(aboutContent).limit(1),
    ])

    const typeLabel = (key: string) => types.find(t => t.key === key)?.label ?? key

    const about = aboutRows[0]
      ? {
          id: { description: aboutRows[0].descriptionId, disclaimer: aboutRows[0].disclaimerId },
          en: { description: aboutRows[0].descriptionEn, disclaimer: aboutRows[0].disclaimerEn },
        }
      : { id: { description: '', disclaimer: '' }, en: { description: '', disclaimer: '' } }

    return ok({
      documents: documents.map(d => ({
        slug: d.slug,
        typeKey: d.typeKey,
        typeLabel: typeLabel(d.typeKey),
        updatedAt: d.updatedAt,
        langs: {
          id: { title: d.titleId, bodyHtml: d.bodyHtmlId },
          en: { title: d.titleEn, bodyHtml: d.bodyHtmlEn },
        },
      })),
      about,
    })
  } catch (e) {
    console.error('[legal-content GET]', e)
    return err('Gagal memuat konten dokumen legal', 500)
  }
}
