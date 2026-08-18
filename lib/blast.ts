import { db } from '@/lib/db'
import { users, pushTokens, telegramUsers, notificationBlasts, notificationBlastRecipients } from '@/drizzle/schema'
import { eq, and, inArray, ilike, sql, count, isNotNull } from 'drizzle-orm'
import { Api, GrammyError } from 'grammy'
import { sendEmail, BLAST_SENDERS, BlastSenderKey } from '@/lib/email'
import { buildBlastEmailHtml } from '@/lib/emailTemplates/blast'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts'
const EXPO_CHUNK_SIZE = 100
const EXPO_RECEIPTS_CHUNK_SIZE = 300

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

type ExpoPushReceipt = {
  status: 'ok' | 'error'
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

type TelegramTarget = { telegramId: bigint; userId: string | null }

/**
 * Resolve blast targets for the telegram channel directly from telegram_users
 * instead of `users`, identified by Telegram username rather than app
 * username — both 'all' and 'specific' must reach bot users regardless of
 * whether they've ever linked a Gizku account, since most haven't.
 */
async function resolveTelegramTargets(targetType: string, targetUsernames: string[] | null): Promise<TelegramTarget[]> {
  if (targetType === 'all') {
    return db.select({ telegramId: telegramUsers.telegramId, userId: telegramUsers.userId }).from(telegramUsers)
  }
  if (!targetUsernames || targetUsernames.length === 0) return []
  return db.select({ telegramId: telegramUsers.telegramId, userId: telegramUsers.userId })
    .from(telegramUsers)
    .where(inArray(telegramUsers.username, targetUsernames))
}

type EmailTarget = { email: string; userId: string | null }

/**
 * Resolve blast targets for the email channel. 'all' reaches every active user
 * with an email on file. 'specific' targets are raw addresses typed in the
 * compose form (not necessarily tied to any Gizku account, unlike push/telegram
 * which target by username) — matched back against `users` only to attach a
 * userId when one exists, purely for display in the recipient log.
 */
async function resolveEmailTargets(targetType: string, targetEmails: string[] | null): Promise<EmailTarget[]> {
  if (targetType === 'all') {
    const rows = await db.select({ id: users.id, email: users.email })
      .from(users).where(and(eq(users.isActive, true), isNotNull(users.email)))
    return rows.map(r => ({ email: r.email!, userId: r.id }))
  }
  if (!targetEmails || targetEmails.length === 0) return []

  const matches = await db.select({ id: users.id, email: users.email })
    .from(users).where(inArray(users.email, targetEmails))
  const userIdByEmail = new Map(matches.filter(m => m.email).map(m => [m.email!.toLowerCase(), m.id]))
  return targetEmails.map(email => ({ email, userId: userIdByEmail.get(email.toLowerCase()) ?? null }))
}

/**
 * Cari identitas untuk chip target penerima. Identitas yang dicari DAN
 * disimpan mengikuti channel yang dipilih: push pakai username app Gizku
 * (karena push token menempel ke akun app), telegram pakai username Telegram
 * langsung dari telegram_users — tanpa syarat akun itu sudah menghubungkan
 * Gizku, karena banyak bot user belum pernah link tapi tetap harus bisa
 * ditarget satu-satu.
 */
export async function searchUsernamesForChannel(channel: string, q: string) {
  if (channel === 'telegram') {
    const rows = await db.select({ tgUsername: telegramUsers.username })
      .from(telegramUsers)
      .where(ilike(telegramUsers.username, `%${q}%`))
      .limit(8)
    return rows
      .filter((r): r is { tgUsername: string } => !!r.tgUsername)
      .map(r => ({ value: r.tgUsername, label: `@${r.tgUsername}` }))
  }

  const rows = await db.select({ username: users.username }).from(users)
    .where(and(ilike(users.username, `%${q}%`), eq(users.isActive, true)))
    .limit(8)
  return rows.map(r => ({ value: r.username, label: `@${r.username}` }))
}

/**
 * Cocokkan satu input admin secara persis ke identitas channel yang dipilih
 * (username app untuk push, username Telegram untuk telegram — lihat
 * searchUsernamesForChannel), dipakai saat admin menekan Enter tanpa memilih
 * dari daftar saran.
 */
export async function resolveUsernameForChannel(channel: string, raw: string): Promise<{ value: string; label: string } | null> {
  const clean = raw.trim().replace(/^@/, '')
  if (!clean) return null

  if (channel === 'telegram') {
    const [row] = await db.select({ tgUsername: telegramUsers.username })
      .from(telegramUsers)
      .where(ilike(telegramUsers.username, clean))
      .limit(1)
    if (!row || !row.tgUsername) return null
    return { value: row.tgUsername, label: `@${row.tgUsername}` }
  }

  const [row] = await db.select({ username: users.username }).from(users)
    .where(and(eq(users.username, clean.toLowerCase()), eq(users.isActive, true))).limit(1)
  if (!row) return null
  return { value: row.username, label: `@${row.username}` }
}

/** Estimasi jumlah penerima + berapa yang bisa dijangkau lewat channel terpilih, dipakai saat compose. */
export async function estimateRecipients(channel: string, targetType: string, targetUsernames: string[] | null) {
  if (channel === 'email') {
    if (targetType === 'all') {
      const [{ c }] = await db.select({ c: count() }).from(users)
        .where(and(eq(users.isActive, true), isNotNull(users.email)))
      return { targeted: c, reachable: c, platforms: { ios: 0, android: 0 } }
    }
    const n = (targetUsernames ?? []).length
    return { targeted: n, reachable: n, platforms: { ios: 0, android: 0 } }
  }

  if (channel === 'telegram') {
    // Every telegram_users row has a chat id to send to — "reachable" here
    // just means "resolved as a target"; whether the bot is blocked is only
    // known after actually attempting the send.
    if (targetType === 'all') {
      const [{ c }] = await db.select({ c: count() }).from(telegramUsers)
      return { targeted: c, reachable: c, platforms: { ios: 0, android: 0 } }
    }
    const targets = await resolveTelegramTargets(targetType, targetUsernames)
    return { targeted: targets.length, reachable: targets.length, platforms: { ios: 0, android: 0 } }
  }

  const targetUsers = await resolveTargetUsers(targetType, targetUsernames)
  if (targetUsers.length === 0) {
    return { targeted: 0, reachable: 0, platforms: { ios: 0, android: 0 } }
  }
  const userIds = targetUsers.map(u => u.id)

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

type RecipientResult = {
  status: 'sent' | 'failed'
  errorMessage?: string
  pushTokenId: string | null
  provider: string | null
  providerMessageId?: string | null
  providerResponse?: unknown
}

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
      perUser.set(owner.userId, {
        status: 'sent',
        pushTokenId: owner.pushTokenId,
        provider: owner.provider,
        providerMessageId: ticket.id ?? null,
        providerResponse: { ticket },
      })
    } else {
      if (ticket.details?.error === 'DeviceNotRegistered') tokensToDeactivate.push(owner.pushTokenId)
      const existing = perUser.get(owner.userId)
      if (!existing || existing.status !== 'sent') {
        perUser.set(owner.userId, {
          status: 'failed',
          errorMessage: ticket.message || ticket.details?.error || 'Gagal mengirim',
          pushTokenId: owner.pushTokenId,
          provider: owner.provider,
          providerMessageId: ticket.id ?? null,
          providerResponse: { ticket },
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

async function dispatchTelegramChannel(blast: typeof notificationBlasts.$inferSelect, targets: TelegramTarget[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const perTarget = new Map<string, RecipientResult>()
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN belum dikonfigurasi')

  const api = new Api(token)

  for (const t of targets) {
    const key = t.telegramId.toString()
    try {
      const message = await api.sendMessage(key, blast.body)
      perTarget.set(key, {
        status: 'sent',
        pushTokenId: null,
        provider: 'telegram',
        providerMessageId: String(message.message_id),
        providerResponse: message,
      })
    } catch (e) {
      const raw = e instanceof GrammyError
        ? { error_code: e.error_code, description: e.description, parameters: e.parameters }
        : { error: String(e) }
      perTarget.set(key, {
        status: 'failed',
        errorMessage: telegramErrorMessage(e),
        pushTokenId: null,
        provider: 'telegram',
        providerResponse: raw,
      })
    }
  }

  return perTarget
}

const EMAIL_SEND_CHUNK_SIZE = 10

/**
 * Kirim blast lewat email (Resend). Beda dari dispatchTelegramChannel: dikirim
 * berkelompok (bukan satu-satu berurutan) supaya batch besar tidak terlalu lama,
 * tapi tetap dalam chunk kecil untuk menghindari rate limit Resend.
 */
async function dispatchEmailChannel(blast: typeof notificationBlasts.$inferSelect, targets: EmailTarget[]) {
  const senderKey: BlastSenderKey = blast.fromAddress === 'marketing' ? 'marketing' : 'support'
  const from = BLAST_SENDERS[senderKey]
  const html = buildBlastEmailHtml({ subject: blast.title, bodyText: blast.body, sender: senderKey })
  const perEmail = new Map<string, RecipientResult>()

  for (let i = 0; i < targets.length; i += EMAIL_SEND_CHUNK_SIZE) {
    const chunk = targets.slice(i, i + EMAIL_SEND_CHUNK_SIZE)
    await Promise.all(chunk.map(async t => {
      try {
        const { id } = await sendEmail({ to: t.email, subject: blast.title, html, from })
        perEmail.set(t.email, {
          status: 'sent',
          pushTokenId: null,
          provider: 'resend',
          providerMessageId: id,
          providerResponse: { id },
        })
      } catch (e) {
        perEmail.set(t.email, {
          status: 'failed',
          errorMessage: e instanceof Error ? e.message : 'Gagal mengirim email',
          pushTokenId: null,
          provider: 'resend',
        })
      }
    }))
  }

  return perEmail
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
    if (blast.channel === 'email') {
      const targets = await resolveEmailTargets(blast.targetType, blast.targetUsernames)
      const perEmail = targets.length > 0 ? await dispatchEmailChannel(blast, targets) : new Map<string, RecipientResult>()
      const now = new Date()
      const recipientRows = targets.map(t => {
        const r = perEmail.get(t.email)!
        return {
          blastId: blast.id,
          userId: t.userId,
          telegramUserId: null,
          email: t.email,
          pushTokenId: r.pushTokenId,
          provider: r.provider,
          status: r.status,
          errorMessage: r.errorMessage ?? null,
          providerMessageId: r.providerMessageId ?? null,
          providerResponse: r.providerResponse ?? null,
          sentAt: r.status === 'sent' ? now : null,
        }
      })
      await finalizeBlast(blast.id, targets.length, recipientRows)
      return
    }

    if (blast.channel === 'telegram') {
      const targets = await resolveTelegramTargets(blast.targetType, blast.targetUsernames)
      const perTarget = targets.length > 0 ? await dispatchTelegramChannel(blast, targets) : new Map<string, RecipientResult>()
      const now = new Date()
      const recipientRows = targets.map(t => {
        const r = perTarget.get(t.telegramId.toString())!
        return {
          blastId: blast.id,
          userId: t.userId,
          telegramUserId: t.telegramId,
          pushTokenId: r.pushTokenId,
          provider: r.provider,
          status: r.status,
          errorMessage: r.errorMessage ?? null,
          providerMessageId: r.providerMessageId ?? null,
          providerResponse: r.providerResponse ?? null,
          sentAt: r.status === 'sent' ? now : null,
        }
      })
      await finalizeBlast(blast.id, targets.length, recipientRows)
      return
    }

    const targetUsers = await resolveTargetUsers(blast.targetType, blast.targetUsernames)
    const perUser = targetUsers.length > 0 ? await dispatchPushChannel(blast, targetUsers) : new Map<string, RecipientResult>()
    const now = new Date()
    const recipientRows = targetUsers.map(u => {
      const r = perUser.get(u.id)!
      return {
        blastId: blast.id,
        userId: u.id,
        telegramUserId: null,
        pushTokenId: r.pushTokenId,
        provider: r.provider,
        status: r.status,
        errorMessage: r.errorMessage ?? null,
        providerMessageId: r.providerMessageId ?? null,
        providerResponse: r.providerResponse ?? null,
        sentAt: r.status === 'sent' ? now : null,
      }
    })
    await finalizeBlast(blast.id, targetUsers.length, recipientRows)
  } catch (e) {
    console.error('[dispatchBlast]', e)
    await db.update(notificationBlasts)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(notificationBlasts.id, blastId))
  }
}

async function finalizeBlast(
  blastId: string,
  targetedCount: number,
  recipientRows: (typeof notificationBlastRecipients.$inferInsert)[],
) {
  if (recipientRows.length > 0) {
    await db.insert(notificationBlastRecipients).values(recipientRows)
  }

  const sentCount = recipientRows.filter(r => r.status === 'sent').length
  const failedCount = recipientRows.filter(r => r.status === 'failed').length

  await db.update(notificationBlasts)
    .set({
      status: 'completed',
      sentAt: new Date(),
      targetedCount,
      sentCount,
      failedCount,
      updatedAt: new Date(),
    })
    .where(eq(notificationBlasts.id, blastId))
}

async function fetchExpoReceipts(ids: string[]): Promise<Record<string, ExpoPushReceipt>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`

  const res = await fetch(EXPO_RECEIPTS_URL, { method: 'POST', headers, body: JSON.stringify({ ids }) })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json || typeof json.data !== 'object') return {}
  return json.data as Record<string, ExpoPushReceipt>
}

/**
 * Expo "accepting" a push (ticket.status === 'ok') only means it queued the
 * message for delivery — it does NOT mean FCM/APNs actually delivered it to
 * the device. Real delivery failures (bad credentials, stale token, etc.)
 * only show up later via this receipts endpoint. Called on-demand from the
 * admin detail page ("Cek Status Pengiriman"), scoped to one blast.
 */
export async function checkPushReceipts(blastId: string): Promise<{ checked: number; nowFailed: number }> {
  const pending = await db.select({
    id: notificationBlastRecipients.id,
    providerMessageId: notificationBlastRecipients.providerMessageId,
    providerResponse: notificationBlastRecipients.providerResponse,
    pushTokenId: notificationBlastRecipients.pushTokenId,
  })
    .from(notificationBlastRecipients)
    .where(and(
      eq(notificationBlastRecipients.blastId, blastId),
      eq(notificationBlastRecipients.status, 'sent'),
      inArray(notificationBlastRecipients.provider, ['fcm', 'apns']),
      sql`${notificationBlastRecipients.providerMessageId} IS NOT NULL`,
    ))

  if (pending.length === 0) return { checked: 0, nowFailed: 0 }

  const receiptsById: Record<string, ExpoPushReceipt> = {}
  for (let i = 0; i < pending.length; i += EXPO_RECEIPTS_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + EXPO_RECEIPTS_CHUNK_SIZE).map(p => p.providerMessageId!)
    Object.assign(receiptsById, await fetchExpoReceipts(chunk))
  }

  const now = new Date()
  let checked = 0
  let nowFailed = 0
  const tokensToDeactivate: string[] = []

  for (const row of pending) {
    const receipt = receiptsById[row.providerMessageId!]
    if (!receipt) continue // Expo hasn't produced a receipt yet — leave as-is, retry later

    checked++
    const mergedResponse = { ...(row.providerResponse as object ?? {}), receipt }

    if (receipt.status === 'error') {
      nowFailed++
      if (receipt.details?.error === 'DeviceNotRegistered' && row.pushTokenId) tokensToDeactivate.push(row.pushTokenId)
      await db.update(notificationBlastRecipients)
        .set({
          status: 'failed',
          errorMessage: receipt.message || receipt.details?.error || 'Gagal terkirim ke perangkat',
          providerResponse: mergedResponse,
          receiptCheckedAt: now,
        })
        .where(eq(notificationBlastRecipients.id, row.id))
    } else {
      await db.update(notificationBlastRecipients)
        .set({ providerResponse: mergedResponse, receiptCheckedAt: now })
        .where(eq(notificationBlastRecipients.id, row.id))
    }
  }

  if (tokensToDeactivate.length > 0) {
    await db.update(pushTokens).set({ isActive: false, updatedAt: now })
      .where(inArray(pushTokens.id, tokensToDeactivate))
  }

  if (nowFailed > 0) {
    await db.update(notificationBlasts)
      .set({
        sentCount: sql`${notificationBlasts.sentCount} - ${nowFailed}`,
        failedCount: sql`${notificationBlasts.failedCount} + ${nowFailed}`,
        updatedAt: now,
      })
      .where(eq(notificationBlasts.id, blastId))
  }

  return { checked, nowFailed }
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
