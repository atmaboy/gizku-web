/**
 * Admin backoffice — Blast Notifikasi (push notification atau Telegram).
 *
 * GET  ?action=list&page=&per_page=       — riwayat batch, terbaru dulu
 * GET  ?action=detail&id=                 — detail satu batch + provider breakdown + rincian kegagalan
 * GET  ?action=recipients&id=&page=&per_page= — log mentah per-penerima (username, status, error, raw response)
 * GET  ?action=estimate&channel=&target_type=&usernames=a,b,c — estimasi penerima saat compose
 * GET  ?action=lookup_username&channel=&q= — cari username/telegram handle (untuk chip target spesifik)
 * GET  ?action=resolve_username&channel=&value= — cocokkan 1 input admin ke identitas channel (username app / Telegram) secara persis
 * POST ?action=create                     — buat + kirim/jadwalkan batch baru
 * POST ?action=cancel                     — batalkan batch yang masih 'scheduled'
 * POST ?action=check_receipts             — cek status delivery asli (Expo push receipts) untuk 1 batch
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users, telegramUsers, notificationBlasts, notificationBlastRecipients } from '@/drizzle/schema'
import { requireAdmin } from '@/lib/admin'
import { ok, err, setCors } from '@/lib/utils'
import { dispatchBlast, estimateRecipients, getProviderBreakdown, searchUsernamesForChannel, resolveUsernameForChannel, checkPushReceipts } from '@/lib/blast'
import { eq, and, desc, count, inArray } from 'drizzle-orm'

export const runtime = 'nodejs'

const MAX_SPECIFIC_TARGETS = 10
const MAX_BODY_LENGTH = 300

function jsonErr(msg: string, status = 500) {
  const h = new Headers()
  setCors(h)
  return Response.json({ error: msg }, { status, headers: h })
}

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  try {
    return await handleGet(req)
  } catch (e) {
    console.error('[admin/blast GET]', e)
    return jsonErr('Gagal memuat data blast notifikasi. Pastikan migration sql/004_create_push_notifications.sql sudah dijalankan di database ini.')
  }
}

async function handleGet(req: NextRequest) {
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

    const providers = await getProviderBreakdown(id)

    return ok({ blast, failures, providers })
  }

  if (action === 'recipients') {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return err('id diperlukan')

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10))
    const perPage = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('per_page') || '25', 10)))
    const offset = (page - 1) * perPage

    // Telegram recipients may have no linked Gizku account (userId null) since
    // the "Semua User" blast now reaches every bot user — left join both
    // identities so those rows still show up, falling back to their Telegram
    // handle/name for display instead of the app username.
    const rows = await db.select({
      id: notificationBlastRecipients.id,
      username: users.username,
      telegramUsername: telegramUsers.username,
      telegramFirstName: telegramUsers.firstName,
      provider: notificationBlastRecipients.provider,
      status: notificationBlastRecipients.status,
      errorMessage: notificationBlastRecipients.errorMessage,
      providerMessageId: notificationBlastRecipients.providerMessageId,
      providerResponse: notificationBlastRecipients.providerResponse,
      receiptCheckedAt: notificationBlastRecipients.receiptCheckedAt,
      sentAt: notificationBlastRecipients.sentAt,
      clickedAt: notificationBlastRecipients.clickedAt,
      readAt: notificationBlastRecipients.readAt,
    })
      .from(notificationBlastRecipients)
      .leftJoin(users, eq(users.id, notificationBlastRecipients.userId))
      .leftJoin(telegramUsers, eq(telegramUsers.telegramId, notificationBlastRecipients.telegramUserId))
      .where(eq(notificationBlastRecipients.blastId, id))
      .orderBy(notificationBlastRecipients.status, users.username)
      .limit(perPage).offset(offset)

    const [{ c }] = await db.select({ c: count() }).from(notificationBlastRecipients)
      .where(eq(notificationBlastRecipients.blastId, id))

    return ok({ recipients: rows, total: c, page, perPage, totalPages: Math.max(1, Math.ceil(c / perPage)) })
  }

  if (action === 'estimate') {
    const channel = req.nextUrl.searchParams.get('channel') === 'telegram' ? 'telegram' : 'push'
    const targetType = req.nextUrl.searchParams.get('target_type') || 'all'
    const usernamesParam = req.nextUrl.searchParams.get('usernames') || ''
    // Telegram usernames keep their original casing (matched exactly against
    // telegram_users) — only app usernames (push channel) are lowercased.
    const usernames = usernamesParam.split(',').map(u => u.trim()).filter(Boolean).map(u => channel === 'telegram' ? u : u.toLowerCase())
    const estimate = await estimateRecipients(channel, targetType, targetType === 'specific' ? usernames : null)
    return ok(estimate)
  }

  if (action === 'lookup_username') {
    const channel = req.nextUrl.searchParams.get('channel') === 'telegram' ? 'telegram' : 'push'
    const q = (req.nextUrl.searchParams.get('q') || '').trim()
    if (q.length < 2) return ok({ suggestions: [] })
    const suggestions = await searchUsernamesForChannel(channel, q)
    return ok({ suggestions })
  }

  if (action === 'resolve_username') {
    const channel = req.nextUrl.searchParams.get('channel') === 'telegram' ? 'telegram' : 'push'
    const value = req.nextUrl.searchParams.get('value') || ''
    const resolved = await resolveUsernameForChannel(channel, value)
    if (!resolved) {
      return err(channel === 'telegram'
        ? `Username Telegram tidak ditemukan: ${value}`
        : `Username tidak ditemukan: ${value}`, 404)
    }
    return ok(resolved)
  }

  return err('Action tidak dikenal')
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  try {
    return await handlePost(req)
  } catch (e) {
    console.error('[admin/blast POST]', e)
    return jsonErr('Gagal memproses permintaan blast notifikasi. Pastikan migration sql/004_create_push_notifications.sql sudah dijalankan di database ini.')
  }
}

async function handlePost(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'create') {
    const body = await req.json()
    const channel = body.channel === 'telegram' ? 'telegram' : 'push'
    const batchName = String(body.batchName ?? '').trim()
    const title = channel === 'push' ? String(body.title ?? '').trim() : ''
    const messageBody = String(body.body ?? '').trim()
    const targetType = body.targetType === 'specific' ? 'specific' : 'all'
    const scheduledAtRaw = body.scheduledAt ? new Date(body.scheduledAt) : null

    if (!batchName) return err('Nama batch diperlukan')
    if (channel === 'push' && !title) return err('Judul notifikasi diperlukan')
    if (!messageBody) return err(channel === 'push' ? 'Isi pesan diperlukan' : 'Isi chat Telegram diperlukan')
    if (messageBody.length > MAX_BODY_LENGTH) return err(`Isi pesan maksimum ${MAX_BODY_LENGTH} karakter`)
    if (scheduledAtRaw && isNaN(scheduledAtRaw.getTime())) return err('Waktu pengiriman tidak valid')
    if (scheduledAtRaw && scheduledAtRaw.getTime() < Date.now() - 60_000) return err('Waktu pengiriman tidak boleh di masa lalu')

    let targetUsernames: string[] | null = null
    if (targetType === 'specific') {
      // Chip di form compose sudah di-resolve ke identitas channel yang
      // dipilih di sisi client (lookup_username/resolve_username — username
      // app untuk push, username Telegram apa adanya untuk telegram, lihat
      // searchUsernamesForChannel/resolveUsernameForChannel di lib/blast.ts).
      // Username app selalu lowercase; username Telegram dibiarkan sesuai
      // casing aslinya di telegram_users supaya match persis saat dispatch.
      const raw: unknown[] = Array.isArray(body.targetUsernames) ? body.targetUsernames : []
      const cleaned = Array.from(new Set(
        raw.map(u => String(u).trim()).filter(Boolean).map(u => channel === 'telegram' ? u : u.toLowerCase()),
      ))
      if (cleaned.length === 0) return err('Minimal 1 username target diperlukan')
      if (cleaned.length > MAX_SPECIFIC_TARGETS) return err(`Maksimum ${MAX_SPECIFIC_TARGETS} username per batch`)

      if (channel === 'telegram') {
        const found = await db.select({ username: telegramUsers.username }).from(telegramUsers)
          .where(inArray(telegramUsers.username, cleaned))
        const foundSet = new Set(found.map(f => f.username))
        const missing = cleaned.filter(u => !foundSet.has(u))
        if (missing.length > 0) return err(`Username Telegram tidak ditemukan: ${missing.join(', ')}`)
      } else {
        const found = await db.select({ username: users.username }).from(users)
          .where(and(inArray(users.username, cleaned), eq(users.isActive, true)))
        const foundSet = new Set(found.map(f => f.username))
        const missing = cleaned.filter(u => !foundSet.has(u))
        if (missing.length > 0) return err(`Username tidak ditemukan: ${missing.join(', ')}`)
      }

      targetUsernames = cleaned
    }

    const [blast] = await db.insert(notificationBlasts).values({
      batchName,
      channel,
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
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(notificationBlasts.id, id), eq(notificationBlasts.status, 'scheduled')))
      .returning({ id: notificationBlasts.id })

    if (updated.length === 0) return err('Batch tidak bisa dibatalkan (sudah terkirim atau tidak ditemukan)', 409)
    return ok({ message: 'Batch dibatalkan' })
  }

  if (action === 'check_receipts') {
    const { id } = await req.json()
    if (!id) return err('id diperlukan')

    const result = await checkPushReceipts(id)
    return ok({
      message: result.checked === 0
        ? 'Belum ada receipt baru dari Expo — coba lagi beberapa menit lagi.'
        : `${result.checked} status delivery diperbarui${result.nowFailed > 0 ? `, ${result.nowFailed} ternyata gagal terkirim` : ''}.`,
      ...result,
    })
  }

  return err('Action tidak dikenal')
}
