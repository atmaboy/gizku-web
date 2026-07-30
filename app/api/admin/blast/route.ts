/**
 * Admin backoffice — Blast Push Notifikasi.
 *
 * GET  ?action=list&page=&per_page=       — riwayat batch, terbaru dulu
 * GET  ?action=detail&id=                 — detail satu batch + rincian kegagalan
 * GET  ?action=estimate&target_type=&usernames=a,b,c — estimasi penerima saat compose
 * GET  ?action=lookup_username&q=         — cari username aktif (untuk chip target spesifik)
 * POST ?action=create                     — buat + kirim/jadwalkan batch baru
 * POST ?action=cancel                     — batalkan batch yang masih 'scheduled'
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users, notificationBlasts, notificationBlastRecipients } from '@/drizzle/schema'
import { requireAdmin } from '@/lib/admin'
import { ok, err, setCors } from '@/lib/utils'
import { dispatchBlast, estimateRecipients } from '@/lib/push'
import { eq, and, desc, count, ilike, inArray } from 'drizzle-orm'

export const runtime = 'nodejs'

const MAX_SPECIFIC_TARGETS = 10

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const action = req.nextUrl.searchParams.get('action')

  if (action === 'list') {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10))
    const perPage = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('per_page') || '15', 10)))
    const offset = (page - 1) * perPage

    const rows = await db.select().from(notificationBlasts)
      .orderBy(desc(notificationBlasts.createdAt))
      .limit(perPage).offset(offset)
    const [{ c }] = await db.select({ c: count() }).from(notificationBlasts)

    return ok({ blasts: rows, total: c, page, perPage, totalPages: Math.max(1, Math.ceil(c / perPage)) })
  }

  if (action === 'detail') {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return err('id diperlukan')

    const [blast] = await db.select().from(notificationBlasts).where(eq(notificationBlasts.id, id)).limit(1)
    if (!blast) return err('Batch tidak ditemukan', 404)

    const failures = await db.select({
      errorMessage: notificationBlastRecipients.errorMessage,
      count: count(),
    })
      .from(notificationBlastRecipients)
      .where(and(eq(notificationBlastRecipients.blastId, id), eq(notificationBlastRecipients.status, 'failed')))
      .groupBy(notificationBlastRecipients.errorMessage)
      .orderBy(desc(count()))

    return ok({ blast, failures })
  }

  if (action === 'estimate') {
    const targetType = req.nextUrl.searchParams.get('target_type') || 'all'
    const usernamesParam = req.nextUrl.searchParams.get('usernames') || ''
    const usernames = usernamesParam.split(',').map(u => u.trim().toLowerCase()).filter(Boolean)
    const estimate = await estimateRecipients(targetType, targetType === 'specific' ? usernames : null)
    return ok(estimate)
  }

  if (action === 'lookup_username') {
    const q = (req.nextUrl.searchParams.get('q') || '').trim()
    if (q.length < 2) return ok({ usernames: [] })
    const rows = await db.select({ username: users.username })
      .from(users)
      .where(and(ilike(users.username, `%${q}%`), eq(users.isActive, true)))
      .limit(8)
    return ok({ usernames: rows.map(r => r.username) })
  }

  return err('Action tidak dikenal')
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const action = req.nextUrl.searchParams.get('action')

  if (action === 'create') {
    const body = await req.json()
    const batchName = String(body.batchName ?? '').trim()
    const title = String(body.title ?? '').trim()
    const messageBody = String(body.body ?? '').trim()
    const targetType = body.targetType === 'specific' ? 'specific' : 'all'
    const scheduledAtRaw = body.scheduledAt ? new Date(body.scheduledAt) : null

    if (!batchName) return err('Nama batch diperlukan')
    if (!title) return err('Judul notifikasi diperlukan')
    if (!messageBody) return err('Isi pesan diperlukan')
    if (scheduledAtRaw && isNaN(scheduledAtRaw.getTime())) return err('Waktu pengiriman tidak valid')
    if (scheduledAtRaw && scheduledAtRaw.getTime() < Date.now() - 60_000) return err('Waktu pengiriman tidak boleh di masa lalu')

    let targetUsernames: string[] | null = null
    if (targetType === 'specific') {
      const raw: unknown[] = Array.isArray(body.targetUsernames) ? body.targetUsernames : []
      const cleaned = Array.from(new Set(raw.map(u => String(u).trim().toLowerCase()).filter(Boolean)))
      if (cleaned.length === 0) return err('Minimal 1 username target diperlukan')
      if (cleaned.length > MAX_SPECIFIC_TARGETS) return err(`Maksimum ${MAX_SPECIFIC_TARGETS} username per batch`)

      const found = await db.select({ username: users.username }).from(users)
        .where(inArray(users.username, cleaned))
      const foundSet = new Set(found.map(f => f.username))
      const missing = cleaned.filter(u => !foundSet.has(u))
      if (missing.length > 0) return err(`Username tidak ditemukan: ${missing.join(', ')}`)

      targetUsernames = cleaned
    }

    const [blast] = await db.insert(notificationBlasts).values({
      batchName,
      title,
      body: messageBody,
      targetType,
      targetUsernames,
      status: 'scheduled',
      scheduledAt: scheduledAtRaw,
      createdBy: 'admin',
    }).returning()

    // Kirim langsung kalau tidak dijadwalkan (atau waktunya sudah lewat/sekarang).
    if (!scheduledAtRaw || scheduledAtRaw.getTime() <= Date.now()) {
      await dispatchBlast(blast.id)
    }

    return ok({ message: 'Batch notifikasi dibuat', blastId: blast.id })
  }

  if (action === 'cancel') {
    const { id } = await req.json()
    if (!id) return err('id diperlukan')

    const updated = await db.update(notificationBlasts)
      .set({ status: 'canceled', updatedAt: new Date() })
      .where(and(eq(notificationBlasts.id, id), eq(notificationBlasts.status, 'scheduled')))
      .returning({ id: notificationBlasts.id })

    if (updated.length === 0) return err('Batch tidak bisa dibatalkan (sudah terkirim atau tidak ditemukan)', 409)
    return ok({ message: 'Batch dibatalkan' })
  }

  return err('Action tidak dikenal')
}
