import { db } from '@/lib/db'
import { userNotifications } from '@/drizzle/schema'
import { and, desc, eq, gt, inArray, isNull, isNotNull, sql } from 'drizzle-orm'
import { ackBlastRecipient } from '@/lib/blast'

/** Notifikasi lebih lama dari ini tidak tampil dan dihapus cron. */
export const INBOX_RETENTION_DAYS = 90
export const INBOX_PAGE_DEFAULT = 20
export const INBOX_PAGE_MAX = 50

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const retentionCutoff = () => new Date(Date.now() - INBOX_RETENTION_DAYS * 86_400_000)

export function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(`${createdAt.toISOString()},${id}`).toString('base64url')
}
export function decodeCursor(raw: string | null): { ts: string; id: string } | null {
  if (!raw) return null
  try {
    const [ts, id] = Buffer.from(raw, 'base64url').toString().split(',')
    if (!ts || !id || isNaN(Date.parse(ts)) || !UUID_RE.test(id)) return null
    return { ts, id }
  } catch { return null }
}

export function validIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return Array.from(new Set(raw.filter((v): v is string => typeof v === 'string' && UUID_RE.test(v)))).slice(0, 500)
}

const ownRecent = (userId: string) =>
  and(eq(userNotifications.userId, userId), gt(userNotifications.createdAt, retentionCutoff()))

export async function unreadCount(userId: string): Promise<number> {
  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(userNotifications)
    .where(and(ownRecent(userId), isNull(userNotifications.readAt)))
  return c
}

type InboxRow = typeof userNotifications.$inferSelect
function toItem(r: InboxRow) {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    titleEn: r.titleEn,
    bodyEn: r.bodyEn,
    iconUrl: r.iconUrl,
    linkType: r.linkType,
    linkValue: r.linkValue,
    read: r.readAt !== null,
    createdAt: r.createdAt.toISOString(),
  }
}

/** Satu notifikasi milik user (untuk layar detail yang dibuka dari push). Null kalau tidak ada / sudah lewat 90 hari. */
export async function getInboxItem(userId: string, id: string) {
  if (!UUID_RE.test(id)) return null
  const [row] = await db.select().from(userNotifications)
    .where(and(ownRecent(userId), eq(userNotifications.id, id))).limit(1)
  return row ? toItem(row) : null
}

export async function listInbox(userId: string, opts: { cursor: string | null; limit: number; filter: 'all' | 'unread' }) {
  const limit = Math.min(INBOX_PAGE_MAX, Math.max(1, opts.limit))
  const cur = decodeCursor(opts.cursor)
  // Compare at millisecond precision: the cursor round-trips through a JS Date.
  const tsExpr = sql`date_trunc('milliseconds', ${userNotifications.createdAt})`
  const rows = await db.select().from(userNotifications)
    .where(and(
      ownRecent(userId),
      opts.filter === 'unread' ? isNull(userNotifications.readAt) : undefined,
      cur ? sql`(${tsExpr}, ${userNotifications.id}) < (${cur.ts}::timestamptz, ${cur.id}::uuid)` : undefined,
    ))
    .orderBy(desc(tsExpr), desc(userNotifications.id))
    .limit(limit + 1)

  const page = rows.slice(0, limit)
  const last = page[page.length - 1]
  return {
    items: page.map(toItem),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
    unreadCount: await unreadCount(userId),
  }
}

/** Statistik backoffice: read_count naik sekali per user per blast (idempoten, tidak turun saat "belum dibaca"). */
async function ackBlasts(userId: string, blastIds: string[]) {
  for (const blastId of new Set(blastIds)) await ackBlastRecipient(blastId, userId, 'read')
}

export async function setRead(userId: string, ids: string[], read: boolean): Promise<string[]> {
  if (ids.length === 0) return []
  if (!read) {
    const rows = await db.update(userNotifications).set({ readAt: null })
      .where(and(eq(userNotifications.userId, userId), inArray(userNotifications.id, ids), isNotNull(userNotifications.readAt)))
      .returning({ id: userNotifications.id })
    return rows.map(r => r.id)
  }
  const rows = await db.update(userNotifications).set({ readAt: new Date() })
    .where(and(eq(userNotifications.userId, userId), inArray(userNotifications.id, ids), isNull(userNotifications.readAt)))
    .returning({ id: userNotifications.id, blastId: userNotifications.blastId })
  await ackBlasts(userId, rows.flatMap(r => r.blastId ? [r.blastId] : []))
  return rows.map(r => r.id)
}

export async function readAll(userId: string): Promise<string[]> {
  const rows = await db.update(userNotifications).set({ readAt: new Date() })
    .where(and(ownRecent(userId), isNull(userNotifications.readAt)))
    .returning({ id: userNotifications.id, blastId: userNotifications.blastId })
  await ackBlasts(userId, rows.flatMap(r => r.blastId ? [r.blastId] : []))
  return rows.map(r => r.id)
}

export async function pruneOldNotifications(): Promise<number> {
  const rows = await db.delete(userNotifications)
    .where(sql`${userNotifications.createdAt} < now() - make_interval(days => ${INBOX_RETENTION_DAYS})`)
    .returning({ id: userNotifications.id })
  return rows.length
}

