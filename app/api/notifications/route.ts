/**
 * Mobile-facing inbox ("Notifikasi") — hanya baris milik user yang login.
 *
 * GET  ?cursor=&limit=20&filter=all|unread   — daftar inbox (90 hari terakhir), terbaru dulu
 * GET  ?action=unread_count                  — jumlah belum dibaca (badge lonceng)
 * GET  ?action=detail&id=                    — satu notifikasi (layar detail dari push)
 * GET  ?action=whitelist                     — domain yang boleh dibuka di webview app
 * POST ?action=read      { ids, read }       — tandai dibaca / belum dibaca
 * POST ?action=read_all                      — tandai semua dibaca, mengembalikan ids (untuk Urungkan)
 */
import { NextRequest } from 'next/server'
import { verifyToken, extractToken } from '@/lib/auth'
import { ok, err, setCors } from '@/lib/utils'
import { listInbox, getInboxItem, unreadCount, setRead, readAll, validIds, INBOX_PAGE_DEFAULT } from '@/lib/inbox'
import { getWhitelistEntries } from '@/lib/linkWhitelist'

export const runtime = 'nodejs'

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

async function authUser(req: NextRequest) {
  const token = extractToken(req.headers.get('Authorization'))
  if (!token) return null
  try {
    const p = await verifyToken(token)
    if (!p.userId) return null
    return p as { userId: string; username: string; role: string }
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const user = await authUser(req)
  if (!user) return err('Token tidak valid', 401)
  const sp = req.nextUrl.searchParams
  const action = sp.get('action')

  try {
    if (action === 'unread_count') return ok({ unreadCount: await unreadCount(user.userId) })

    if (action === 'detail') {
      const item = await getInboxItem(user.userId, sp.get('id') ?? '')
      return item ? ok({ item }) : err('Notifikasi tidak ditemukan', 404)
    }

    if (action === 'whitelist') {
      return ok({ domains: await getWhitelistEntries() })
    }

    if (action) return err('Action tidak dikenal')

    const limit = parseInt(sp.get('limit') || String(INBOX_PAGE_DEFAULT), 10)
    return ok(await listInbox(user.userId, {
      cursor: sp.get('cursor'),
      limit: Number.isFinite(limit) ? limit : INBOX_PAGE_DEFAULT,
      filter: sp.get('filter') === 'unread' ? 'unread' : 'all',
    }))
  } catch (e) {
    console.error('[notifications GET]', e)
    return err('Gagal memuat notifikasi. Pastikan migration sql/019_notification_inbox.sql sudah dijalankan.', 500)
  }
}

export async function POST(req: NextRequest) {
  const user = await authUser(req)
  if (!user) return err('Token tidak valid', 401)
  const action = req.nextUrl.searchParams.get('action')

  try {
    if (action === 'read') {
      const body = await req.json().catch(() => ({}))
      const ids = validIds(body.ids)
      if (ids.length === 0) return err('ids diperlukan')
      const updated = await setRead(user.userId, ids, body.read !== false)
      return ok({ updated: updated.length, ids: updated })
    }

    if (action === 'read_all') {
      const ids = await readAll(user.userId)
      return ok({ updated: ids.length, ids })
    }

    return err('Action tidak dikenal')
  } catch (e) {
    console.error('[notifications POST]', e)
    return err('Gagal memperbarui notifikasi', 500)
  }
}
