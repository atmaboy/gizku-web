/**
 * Admin backoffice — Whitelist Domain untuk tautan web di blast push.
 *
 * GET    — daftar domain (default dulu)
 * POST   { domain, includeSubdomains } — tambah domain (dinormalisasi: tanpa skema/path/www)
 * DELETE { id } — hapus domain; domain default (gizku.com) tidak bisa dihapus
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { linkWhitelist } from '@/drizzle/schema'
import { requireAdmin } from '@/lib/admin'
import { ok, err, setCors } from '@/lib/utils'
import { normalizeDomain } from '@/lib/notificationLinks'
import { asc, desc, eq } from 'drizzle-orm'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError
  try {
    const domains = await db.select().from(linkWhitelist).orderBy(desc(linkWhitelist.isDefault), asc(linkWhitelist.domain))
    return ok({ domains })
  } catch (e) {
    console.error('[admin/link-whitelist GET]', e)
    return err('Gagal memuat whitelist. Pastikan migration sql/019_notification_inbox.sql sudah dijalankan di database ini.', 500)
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError
  try {
    const body = await req.json().catch(() => ({}))
    const domain = normalizeDomain(String(body.domain ?? ''))
    if (!domain) return err('Format domain belum benar. Contoh: partner.co.id')

    const [dup] = await db.select({ id: linkWhitelist.id }).from(linkWhitelist).where(eq(linkWhitelist.domain, domain)).limit(1)
    if (dup) return err(`${domain} sudah ada di whitelist.`, 409)

    const [row] = await db.insert(linkWhitelist)
      .values({ domain, includeSubdomains: body.includeSubdomains !== false, isDefault: false, createdBy: 'admin' })
      .returning()
    return ok({ domain: row })
  } catch (e) {
    console.error('[admin/link-whitelist POST]', e)
    return err('Gagal menambah domain', 500)
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError
  try {
    const body = await req.json().catch(() => ({}))
    const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id : null
    if (!id) return err('id diperlukan')

    const [row] = await db.select().from(linkWhitelist).where(eq(linkWhitelist.id, id)).limit(1)
    if (!row) return err('Domain tidak ditemukan', 404)
    if (row.isDefault) return err('Domain default tidak bisa dihapus', 409)

    await db.delete(linkWhitelist).where(eq(linkWhitelist.id, id))
    return ok({ message: 'Domain dihapus' })
  } catch (e) {
    console.error('[admin/link-whitelist DELETE]', e)
    return err('Gagal menghapus domain', 500)
  }
}
