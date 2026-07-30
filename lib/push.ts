import { db } from '@/lib/db'
import { users, pushTokens, notificationBlasts, notificationBlastRecipients } from '@/drizzle/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'

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

/** Estimasi jumlah penerima + berapa yang punya push token aktif, dipakai saat compose. */
export async function estimateRecipients(targetType: string, targetUsernames: string[] | null) {
  const targetUsers = await resolveTargetUsers(targetType, targetUsernames)
  if (targetUsers.length === 0) return { targeted: 0, withToken: 0, platforms: { ios: 0, android: 0 } }

  const tokens = await db.select({ userId: pushTokens.userId, platform: pushTokens.platform })
    .from(pushTokens)
    .where(and(inArray(pushTokens.userId, targetUsers.map(u => u.id)), eq(pushTokens.isActive, true)))

  const usersWithToken = new Set(tokens.map(t => t.userId))
  return {
    targeted: targetUsers.length,
    withToken: usersWithToken.size,
    platforms: {
      ios: tokens.filter(t => t.platform === 'ios').length,
      android: tokens.filter(t => t.platform === 'android').length,
    },
  }
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
  if (!blast) return // already dispatched, canceled, or not found

  try {
    const targetUsers = await resolveTargetUsers(blast.targetType, blast.targetUsernames)

    if (targetUsers.length === 0) {
      await db.update(notificationBlasts)
        .set({ status: 'sent', sentAt: new Date(), targetedCount: 0, updatedAt: new Date() })
        .where(eq(notificationBlasts.id, blastId))
      return
    }

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
    const messageOwners: { userId: string; pushTokenId: string }[] = []
    const usersWithoutToken: string[] = []

    for (const u of targetUsers) {
      const userTokens = tokensByUser.get(u.id) ?? []
      if (userTokens.length === 0) {
        usersWithoutToken.push(u.id)
        continue
      }
      for (const t of userTokens) {
        messages.push({
          to: t.token,
          title: blast.title,
          body: blast.body,
          data: { blastId: blast.id },
          sound: 'default',
        })
        messageOwners.push({ userId: u.id, pushTokenId: t.id })
      }
    }

    const tickets = messages.length > 0 ? await chunkedExpoSend(messages) : []

    // Aggregate ticket results per user (a user can have several devices/tokens).
    const perUser = new Map<string, { status: 'sent' | 'failed'; errorMessage?: string; pushTokenId: string | null }>()
    for (const uid of usersWithoutToken) {
      perUser.set(uid, { status: 'failed', errorMessage: 'Tidak ada push token terdaftar', pushTokenId: null })
    }

    const tokensToDeactivate: string[] = []
    tickets.forEach((ticket, i) => {
      const owner = messageOwners[i]
      if (ticket.status === 'ok') {
        perUser.set(owner.userId, { status: 'sent', pushTokenId: owner.pushTokenId })
      } else {
        if (ticket.details?.error === 'DeviceNotRegistered') tokensToDeactivate.push(owner.pushTokenId)
        const existing = perUser.get(owner.userId)
        if (!existing || existing.status !== 'sent') {
          perUser.set(owner.userId, {
            status: 'failed',
            errorMessage: ticket.message || ticket.details?.error || 'Gagal mengirim',
            pushTokenId: owner.pushTokenId,
          })
        }
      }
    })

    if (tokensToDeactivate.length > 0) {
      await db.update(pushTokens).set({ isActive: false, updatedAt: new Date() })
        .where(inArray(pushTokens.id, tokensToDeactivate))
    }

    const now = new Date()
    const recipientRows = targetUsers.map(u => {
      const r = perUser.get(u.id)!
      return {
        blastId: blast.id,
        userId: u.id,
        pushTokenId: r.pushTokenId,
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
        status: 'sent',
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

/** Tandai notifikasi diklik/dibaca oleh user, dipanggil dari app mobile. */
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
