import { db } from '@/lib/db'
import { users, pushTokens, telegramUsers, notificationBlasts, notificationBlastRecipients } from '@/drizzle/schema'
import { eq, and, inArray, ilike, sql } from 'drizzle-orm'
import { Api, GrammyError } from 'grammy'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_CHUNK_SIZE = 100

type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default'
}

type ExpoPushTicket = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

async function sendExpoPushChunk(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`

  const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(messages) })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json || !Array.isArray(json.data)) {
    // Whole chunk failed to reach Expo — mark every message in it as an error ticket.
    return messages.map(() => ({ status: 'error' as const, message: 'Gagal menghubungi Expo push service' }))
  }
  return json.data as ExpoPushTicket[]
}

async function chunkedExpoSend(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const tickets: ExpoPushTicket[] = []
  for (let i = 0; i < messages.length; i += EXPO_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + EXPO_CHUNK_SIZE)
    tickets.push(...await sendExpoPushChunk(chunk))
  }
  return tickets
}

function telegramErrorMessage(err: unknown): string {
  if (err instanceof GrammyError) {
    const d = err.description || ''
    if (/blocked/i.test(d)) return 'Bot diblokir oleh user'
    if (/chat not found/i.test(d)) return 'Chat tidak ditemukan'
    if (/deactivated/i.test(d)) return 'Akun Telegram user dinonaktifkan'
    return d || 'Gagal mengirim pesan Telegram'
  }
  return 'Gagal mengirim pesan Telegram'
}

async function resolveTargetUsers(targetType: string, targetUsernames: string[] | null) {
  if (targetType === 'all') {
    return db.select({ id: users.id, username: users.username })
      .from(users).where(eq(users.isActive, true))
  }
  if (!targetUsernames || targetUsernames.length === 0) return []
  return db.select({ id: users.id, username: users.username })
    .from(users)
    .where(and(inArray(users.username, targetUsernames), eq(users.isActive, true)))
}

/**
 * Cari username untuk chip target penerima. Identitas yang dicari mengikuti
 * channel yang dipilih: push mencari username app Gizku (karena push token
 * menempel ke akun app), telegram mencari username Telegram (identitas yang
 * admin kenal dari chat, bisa berbeda dari username app). Hasil selalu
 * di-map balik ke username app — identitas yang dipakai untuk menyimpan
 * target & query recipient di database.
 */
export async function searchUsernamesForChannel(channel: string, q: string) {
  if (channel === 'telegram') {
    const rows = await db.select({ username: users.username, tgUsername: telegramUsers.username })
      .from(telegramUsers)
      .innerJoin(users, eq(users.id, telegramUsers.userId))
      .where(and(eq(users.isActive, true), ilike(telegramUsers.username, `%${q}%`)))
      .limit(8)
    return rows
      .filter((r): r is { username: string; tgUsername: string } => !!r.tgUsername)
      .map(r => ({ value: r.username, label: `@${r.tgUsername}` }))
  }

  const rows = await db.select({ username: users.username }).from(users)
    .where(and(ilike(users.username, `%${q}%`), eq(users.isActive, true)))
    .limit(8)
  return rows.map(r => ({ value: r.username, label: `@${r.username}` }))
}

/**
 * Cocokkan satu input admin secara persis ke identitas channel yang dipilih
 * (username app untuk push, username Telegram untuk telegram), dipakai saat
 * admin menekan Enter tanpa memilih dari daftar saran. Mengembalikan username
 * app yang jadi identitas penyimpanan, plus label untuk ditampilkan di chip.
 */
export async function resolveUsernameForChannel(channel: string, raw: string): Promise<{ username: string; label: string } | null> {
  const clean = raw.trim().replace(/^@/, '')
  if (!clean) return null

  if (channel === 'telegram') {
    const [row] = await db.select({ username: users.username, tgUsername: telegramUsers.username })
      .from(telegramUsers)
      .innerJoin(users, eq(users.id, telegramUsers.userId))
      .where(and(ilike(telegramUsers.username, clean), eq(users.isActive, true)))
      .limit(1)
    if (!row || !row.tgUsername) return null
    return { username: row.username, label: `@${row.tgUsername}` }
  }

  const [row] = await db.select({ username: users.username }).from(users)
    .where(and(eq(users.username, clean.toLowerCase()), eq(users.isActive, true))).limit(1)
  if (!row) return null
  return { username: row.username, label: `@${row.username}` }
}

/** Estimasi jumlah penerima + berapa yang bisa dijangkau lewat channel terpilih, dipakai saat compose. */
export async function estimateRecipients(channel: string, targetType: string, targetUsernames: string[] | null) {
  const targetUsers = await resolveTargetUsers(targetType, targetUsernames)
  if (targetUsers.length === 0) {
    return { targeted: 0, reachable: 0, platforms: { ios: 0, android: 0 } }
  }
  const userIds = targetUsers.map(u => u.id)

  if (channel === 'telegram') {
    const linked = await db.select({ userId: telegramUsers.userId })
      .from(telegramUsers)
      .where(inArray(telegramUsers.userId, userIds))
    return { targeted: targetUsers.length, reachable: linked.length, platforms: { ios: 0, android: 0 } }
  }

  const tokens = await db.select({ userId: pushTokens.userId, platform: pushTokens.platform })
    .from(pushTokens)
    .where(and(inArray(pushTokens.userId, userIds), eq(pushTokens.isActive, true)))
  const usersWithToken = new Set(tokens.map(t => t.userId))
  return {
    targeted: targetUsers.length,
    reachable: usersWithToken.size,
    platforms: {
      ios: tokens.filter(t => t.platform === 'ios').length,
      android: tokens.filter(t => t.platform === 'android').length,
    },
  }
}

type RecipientResult = { status: 'sent' | 'failed'; errorMessage?: string; pushTokenId: string | null; provider: string | null }

async function dispatchPushChannel(blast: typeof notificationBlasts.$inferSelect, targetUsers: { id: string; username: string }[]) {
  const tokens = await db.select()
    .from(pushTokens)
    .where(and(inArray(pushTokens.userId, targetUsers.map(u => u.id)), eq(pushTokens.isActive, true)))

  const tokensByUser = new Map<string, typeof tokens>()
  for (const t of tokens) {
    const list = tokensByUser.get(t.userId) ?? []
    list.push(t)
    tokensByUser.set(t.userId, list)
  }

  // Flatten (user, token) pairs to send, remembering which user/token each message belongs to.
  const messages: ExpoPushMessage[] = []
  const messageOwners: { userId: string; pushTokenId: string; provider: string }[] = []
  const perUser = new Map<string, RecipientResult>()

  for (const u of targetUsers) {
    const userTokens = tokensByUser.get(u.id) ?? []
    if (userTokens.length === 0) {
      perUser.set(u.id, { status: 'failed', errorMessage: 'Tidak ada push token terdaftar', pushTokenId: null, provider: null })
      continue
    }
    for (const t of userTokens) {
      const provider = t.platform === 'ios' ? 'apns' : 'fcm'
      messages.push({ to: t.token, title: blast.title, body: blast.body, data: { blastId: blast.id }, sound: 'default' })
      messageOwners.push({ userId: u.id, pushTokenId: t.id, provider })
    }
  }

  const tickets = messages.length > 0 ? await chunkedExpoSend(messages) : []

  const tokensToDeactivate: string[] = []
  tickets.forEach((ticket, i) => {
    const owner = messageOwners[i]
    if (ticket.status === 'ok') {
      perUser.set(owner.userId, { status: 'sent', pushTokenId: owner.pushTokenId, provider: owner.provider })
    } else {
      if (ticket.details?.error === 'DeviceNotRegistered') tokensToDeactivate.push(owner.pushTokenId)
      const existing = perUser.get(owner.userId)
      if (!existing || existing.status !== 'sent') {
        perUser.set(owner.userId, {
          status: 'failed',
          errorMessage: ticket.message || ticket.details?.error || 'Gagal mengirim',
          pushTokenId: owner.pushTokenId,
          provider: owner.provider,
        })
      }
    }
  })

  if (tokensToDeactivate.length > 0) {
    await db.update(pushTokens).set({ isActive: false, updatedAt: new Date() })
      .where(inArray(pushTokens.id, tokensToDeactivate))
  }

  return perUser
}

async function dispatchTelegramChannel(blast: typeof notificationBlasts.$inferSelect, targetUsers: { id: string; username: string }[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const perUser = new Map<string, RecipientResult>()
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN belum dikonfigurasi')

  const links = await db.select({ userId: telegramUsers.userId, telegramId: telegramUsers.telegramId })
    .from(telegramUsers)
    .where(inArray(telegramUsers.userId, targetUsers.map(u => u.id)))
  const chatIdByUser = new Map(links.filter(l => l.userId).map(l => [l.userId as string, l.telegramId]))

  const api = new Api(token)

  for (const u of targetUsers) {
    const chatId = chatIdByUser.get(u.id)
    if (!chatId) {
      perUser.set(u.id, { status: 'failed', errorMessage: 'Akun Telegram belum terhubung', pushTokenId: null, provider: null })
      continue
    }
    try {
      await api.sendMessage(chatId.toString(), blast.body)
      perUser.set(u.id, { status: 'sent', pushTokenId: null, provider: 'telegram' })
    } catch (e) {
      perUser.set(u.id, { status: 'failed', errorMessage: telegramErrorMessage(e), pushTokenId: null, provider: 'telegram' })
    }
  }

  return perUser
}

/**
 * Kirim satu blast notifikasi. Idempotent secara best-effort: hanya blast dengan
 * status 'scheduled' yang akan diproses, dan status diubah ke 'sending' terlebih
 * dahulu (klaim atomik) supaya tidak terkirim dobel jika dipanggil bersamaan
 * (mis. admin kirim "sekarang" dan cron job berjalan di waktu yang sama).
 */
export async function dispatchBlast(blastId: string): Promise<void> {
  const claimed = await db.update(notificationBlasts)
    .set({ status: 'sending', updatedAt: new Date() })
    .where(and(eq(notificationBlasts.id, blastId), eq(notificationBlasts.status, 'scheduled')))
    .returning()

  const blast = claimed[0]
  if (!blast) return // already dispatched, cancelled, or not found

  try {
    const targetUsers = await resolveTargetUsers(blast.targetType, blast.targetUsernames)

    if (targetUsers.length === 0) {
      await db.update(notificationBlasts)
        .set({ status: 'completed', sentAt: new Date(), targetedCount: 0, updatedAt: new Date() })
        .where(eq(notificationBlasts.id, blastId))
      return
    }

    const perUser = blast.channel === 'telegram'
      ? await dispatchTelegramChannel(blast, targetUsers)
      : await dispatchPushChannel(blast, targetUsers)

    const now = new Date()
    const recipientRows = targetUsers.map(u => {
      const r = perUser.get(u.id)!
      return {
        blastId: blast.id,
        userId: u.id,
        pushTokenId: r.pushTokenId,
        provider: r.provider,
        status: r.status,
        errorMessage: r.errorMessage ?? null,
        sentAt: r.status === 'sent' ? now : null,
      }
    })
    if (recipientRows.length > 0) {
      await db.insert(notificationBlastRecipients).values(recipientRows)
    }

    const sentCount = recipientRows.filter(r => r.status === 'sent').length
    const failedCount = recipientRows.filter(r => r.status === 'failed').length

    await db.update(notificationBlasts)
      .set({
        status: 'completed',
        sentAt: now,
        targetedCount: targetUsers.length,
        sentCount,
        failedCount,
        updatedAt: now,
      })
      .where(eq(notificationBlasts.id, blastId))
  } catch (e) {
    console.error('[dispatchBlast]', e)
    await db.update(notificationBlasts)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(notificationBlasts.id, blastId))
  }
}

/** Tandai notifikasi diklik/dibaca oleh user, dipanggil dari app mobile (push channel saja). */
export async function ackBlastRecipient(blastId: string, userId: string, event: 'clicked' | 'read') {
  const now = new Date()
  const whereClause = and(
    eq(notificationBlastRecipients.blastId, blastId),
    eq(notificationBlastRecipients.userId, userId),
  )

  const updated = event === 'clicked'
    ? await db.update(notificationBlastRecipients)
        .set({ clickedAt: now })
        .where(and(whereClause, sql`${notificationBlastRecipients.clickedAt} IS NULL`))
        .returning({ id: notificationBlastRecipients.id })
    : await db.update(notificationBlastRecipients)
        .set({ readAt: now })
        .where(and(whereClause, sql`${notificationBlastRecipients.readAt} IS NULL`))
        .returning({ id: notificationBlastRecipients.id })

  if (updated.length === 0) return

  if (event === 'clicked') {
    await db.update(notificationBlasts)
      .set({ clickedCount: sql`${notificationBlasts.clickedCount} + 1` })
      .where(eq(notificationBlasts.id, blastId))
  } else {
    await db.update(notificationBlasts)
      .set({ readCount: sql`${notificationBlasts.readCount} + 1` })
      .where(eq(notificationBlasts.id, blastId))
  }
}

/** Ringkasan per-provider (FCM/APNs/Telegram) untuk halaman detail batch. */
export async function getProviderBreakdown(blastId: string) {
  const rows = await db.select({
    provider: notificationBlastRecipients.provider,
    status: notificationBlastRecipients.status,
    n: sql<number>`count(*)`,
  })
    .from(notificationBlastRecipients)
    .where(and(eq(notificationBlastRecipients.blastId, blastId), sql`${notificationBlastRecipients.provider} IS NOT NULL`))
    .groupBy(notificationBlastRecipients.provider, notificationBlastRecipients.status)

  const byProvider = new Map<string, { provider: string; targeted: number; success: number; failed: number }>()
  for (const row of rows) {
    if (!row.provider) continue
    const entry = byProvider.get(row.provider) ?? { provider: row.provider, targeted: 0, success: 0, failed: 0 }
    entry.targeted += Number(row.n)
    if (row.status === 'sent') entry.success += Number(row.n)
    if (row.status === 'failed') entry.failed += Number(row.n)
    byProvider.set(row.provider, entry)
  }
  return Array.from(byProvider.values())
}
