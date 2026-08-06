/**
 * Admin API — Legal Document Configuration (Dokumen Legal + Tentang Aplikasi).
 *
 * GET  — semua data yang dibutuhkan halaman admin: document types (dengan
 *        usedCount), documents, dan about content singleton.
 *
 * POST ?action=upsert_document   body: DocumentPayload
 * POST ?action=delete_document   body: { id }
 * POST ?action=create_type       body: { label }
 * POST ?action=delete_type       body: { key }
 * POST ?action=upsert_about      body: AboutPayload
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { legalDocumentTypes, legalDocuments, aboutContent } from '@/drizzle/schema'
import { eq, asc } from 'drizzle-orm'
import { ok, err, setCors } from '@/lib/utils'
import { requireAdmin } from '@/lib/admin'
import { slugify, sanitizeHtml } from '@/lib/legal'

export async function OPTIONS() {
  const h = new Headers()
  setCors(h)
  return new Response(null, { status: 204, headers: h })
}

function shapeDocument(d: typeof legalDocuments.$inferSelect) {
  return {
    id: d.id,
    typeKey: d.typeKey,
    slug: d.slug,
    updatedAt: d.updatedAt,
    langs: {
      id: { title: d.titleId, bodyHtml: d.bodyHtmlId },
      en: { title: d.titleEn, bodyHtml: d.bodyHtmlEn },
    },
  }
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  try {
    const [types, documents, aboutRows] = await Promise.all([
      db.select().from(legalDocumentTypes).orderBy(asc(legalDocumentTypes.createdAt)),
      db.select().from(legalDocuments).orderBy(asc(legalDocuments.createdAt)),
      db.select().from(aboutContent).limit(1),
    ])

    const documentTypes = types.map(t => ({
      key: t.key,
      label: t.label,
      builtin: t.builtin,
      usedCount: documents.filter(d => d.typeKey === t.key).length,
    }))

    const about = aboutRows[0]
      ? {
          id: { description: aboutRows[0].descriptionId, disclaimer: aboutRows[0].disclaimerId },
          en: { description: aboutRows[0].descriptionEn, disclaimer: aboutRows[0].disclaimerEn },
        }
      : { id: { description: '', disclaimer: '' }, en: { description: '', disclaimer: '' } }

    return ok({
      documentTypes,
      documents: documents.map(shapeDocument),
      about,
    })
  } catch (e) {
    console.error('[admin/legal GET]', e)
    return err('Gagal mengambil data dokumen legal')
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  try {
    const action = req.nextUrl.searchParams.get('action')

    if (action === 'upsert_document') {
      const body = await req.json()
      const { id, typeKey, langs } = body ?? {}
      const idTitle = (langs?.id?.title ?? '').trim()
      if (!idTitle) return err('Judul (Bahasa Indonesia) wajib diisi', 400)
      if (!typeKey) return err('Jenis dokumen wajib dipilih', 400)

      const typeExists = await db.select().from(legalDocumentTypes).where(eq(legalDocumentTypes.key, typeKey)).limit(1)
      if (typeExists.length === 0) return err('Jenis dokumen tidak ditemukan', 400)

      const titleId = idTitle
      const bodyHtmlId = sanitizeHtml(langs?.id?.bodyHtml ?? '')
      const titleEn = (langs?.en?.title ?? '').trim()
      const bodyHtmlEn = sanitizeHtml(langs?.en?.bodyHtml ?? '')

      if (id) {
        const existing = await db.select().from(legalDocuments).where(eq(legalDocuments.id, id)).limit(1)
        if (existing.length === 0) return err('Dokumen tidak ditemukan', 404)

        await db.update(legalDocuments).set({
          typeKey, titleId, bodyHtmlId, titleEn, bodyHtmlEn, updatedAt: new Date(),
        }).where(eq(legalDocuments.id, id))

        const [saved] = await db.select().from(legalDocuments).where(eq(legalDocuments.id, id)).limit(1)
        return ok({ message: 'Dokumen tersimpan', document: shapeDocument(saved) })
      }

      // New document — derive a unique slug from the Indonesian title.
      const base = slugify(idTitle)
      let slug = base
      let suffix = 1
      while (true) {
        const clash = await db.select().from(legalDocuments).where(eq(legalDocuments.slug, slug)).limit(1)
        if (clash.length === 0) break
        suffix += 1
        slug = `${base}-${suffix}`
      }

      const [saved] = await db.insert(legalDocuments).values({
        typeKey, slug, titleId, bodyHtmlId, titleEn, bodyHtmlEn,
      }).returning()

      return ok({ message: 'Dokumen tersimpan', document: shapeDocument(saved) })
    }

    if (action === 'delete_document') {
      const { id } = await req.json()
      if (!id) return err('id diperlukan', 400)
      await db.delete(legalDocuments).where(eq(legalDocuments.id, id))
      return ok({ message: 'Dokumen dihapus' })
    }

    if (action === 'create_type') {
      const { label } = await req.json()
      const name = (label ?? '').trim()
      if (!name) return err('Nama jenis dokumen wajib diisi', 400)
      const key = `custom-${Date.now()}`
      await db.insert(legalDocumentTypes).values({ key, label: name, builtin: false })
      return ok({ message: 'Jenis dokumen ditambahkan', type: { key, label: name, builtin: false, usedCount: 0 } })
    }

    if (action === 'delete_type') {
      const { key } = await req.json()
      if (!key) return err('key diperlukan', 400)

      const type = await db.select().from(legalDocumentTypes).where(eq(legalDocumentTypes.key, key)).limit(1)
      if (type.length === 0) return err('Jenis dokumen tidak ditemukan', 404)
      if (type[0].builtin) return err('Jenis dokumen bawaan sistem tidak dapat dihapus', 400)

      const usage = await db.select().from(legalDocuments).where(eq(legalDocuments.typeKey, key)).limit(1)
      if (usage.length > 0) return err('Jenis dokumen masih digunakan oleh dokumen lain', 400)

      await db.delete(legalDocumentTypes).where(eq(legalDocumentTypes.key, key))
      return ok({ message: 'Jenis dokumen dihapus' })
    }

    if (action === 'upsert_about') {
      const body = await req.json()
      const descriptionId = (body?.id?.description ?? '').trim()
      const disclaimerId = (body?.id?.disclaimer ?? '').trim()
      const descriptionEn = (body?.en?.description ?? '').trim()
      const disclaimerEn = (body?.en?.disclaimer ?? '').trim()

      const existing = await db.select().from(aboutContent).limit(1)
      if (existing.length > 0) {
        await db.update(aboutContent).set({
          descriptionId, disclaimerId, descriptionEn, disclaimerEn, updatedAt: new Date(),
        }).where(eq(aboutContent.id, existing[0].id))
      } else {
        await db.insert(aboutContent).values({ descriptionId, disclaimerId, descriptionEn, disclaimerEn })
      }

      return ok({ message: 'Konten Tentang Aplikasi tersimpan' })
    }

    return err('Action tidak dikenal', 400)
  } catch (e: unknown) {
    console.error('[admin/legal POST]', e)
    if (e instanceof Error && e.message.includes('unique')) {
      return err('Data duplikat — slug atau key sudah digunakan', 409)
    }
    return err('Gagal menyimpan konfigurasi dokumen legal')
  }
}
