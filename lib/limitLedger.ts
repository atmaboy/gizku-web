import { db } from '@/lib/db'
import { limitRequests, dailyUsage } from '@/drizzle/schema'
import { eq, and, asc, gte, lt } from 'drizzle-orm'
import { getUserFloor } from '@/lib/limit'
import { todayISO } from '@/lib/utils'

/**
 * Single shared implementation of the limit ledger algorithm — used by both
 * the user's own "Riwayat Limit" endpoint and the admin's "Riwayat Limit
 * User" endpoint, and by the effective daily-quota check in /api/analyze and
 * /api/history. Do not duplicate this logic elsewhere.
 */

const PERIOD_DAYS = 30
const MS_DAY = 24 * 60 * 60 * 1000

// How far back the ledger's usage history reaches. dailyUsage rows older
// than this are also physically deleted (see pruneOldDailyUsage, run daily
// via cron) — purely usage telemetry, never financial/approval data, so
// this only trims how far back "Riwayat Limit" can show past usage, not any
// current-effective-limit computation (no period a request could still be
// active for reaches back this far, since tiers only ever last 30 days).
export const USAGE_RETENTION_DAYS = 90

export type LedgerRowType = 'usage' | 'tier-approved-reset' | 'expiry-reset' | 'daily-reset'

// Machine-readable counterpart to `title` — lets clients that localize (e.g. the mobile
// app) render the row in their own language instead of parsing/replacing the Indonesian
// `title` string. `title` itself stays Indonesian and unchanged for existing consumers
// (gizku-web's own Riwayat Limit page, the admin panel) that just display it as-is.
export type LedgerTitleKey = 'usage' | 'daily-reset' | 'tier-approved' | 'tier-expired'
export type LedgerTitleParams = { tierLabel?: string; totalPerDay?: number }

export type LedgerRow = {
  date: string // YYYY-MM-DD
  type: LedgerRowType
  title: string
  titleKey: LedgerTitleKey
  titleParams?: LedgerTitleParams
  before: number
  after: number
  delta: number
}

export type Period = {
  requestId: string
  tierLabel: string
  totalPerDay: number
  startDate: string      // YYYY-MM-DD of decidedAt (approval date)
  naturalEndDate: string // YYYY-MM-DD of decidedAt + 30 days
  end: string             // effective end date, exclusive — naturalEndDate, or the next approval's startDate if superseded early
  supersededEarly: boolean
}

export type ActiveTierInfo = { label: string; totalPerDay: number; expiresAt: string }

function dateOnly(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_DAY)
}

/**
 * Build the chronological list of approval periods for a user. Each approval
 * opens a period [decidedAt, decidedAt + 30 days) at that tier's total/day.
 * If the NEXT approval lands before the current period's natural 30-day end,
 * the current period is cut short there instead (early supersession).
 */
export async function getApprovedPeriods(userId: string): Promise<Period[]> {
  const approved = await db.select().from(limitRequests)
    .where(and(eq(limitRequests.userId, userId), eq(limitRequests.status, 'approved')))
    .orderBy(asc(limitRequests.decidedAt))

  const periods: Period[] = []
  for (let i = 0; i < approved.length; i++) {
    const r = approved[i]
    if (!r.decidedAt) continue
    const start = new Date(r.decidedAt)
    const naturalEnd = addDays(start, PERIOD_DAYS)
    const next = approved[i + 1]
    const nextStart = next?.decidedAt ? new Date(next.decidedAt) : null
    const supersededEarly = !!nextStart && nextStart.getTime() < naturalEnd.getTime()
    const end = supersededEarly ? nextStart! : naturalEnd

    periods.push({
      requestId: r.id,
      tierLabel: r.tierLabel,
      totalPerDay: r.totalPerDay,
      startDate: dateOnly(start),
      naturalEndDate: dateOnly(naturalEnd),
      end: dateOnly(end),
      supersededEarly,
    })
  }
  return periods
}

function effectiveLimitForDate(dateStr: string, periods: Period[], floor: number): number {
  for (const p of periods) {
    if (dateStr >= p.startDate && dateStr < p.end) return p.totalPerDay
  }
  return floor
}

/**
 * A user's currently active tier/expiry: the last period in the periods
 * list, if today falls within [start, end) — otherwise null (user is on
 * base). Only the last period can ever be active since each new approval
 * supersedes the previous one.
 */
export async function getActiveTier(userId: string, periods?: Period[]): Promise<ActiveTierInfo | null> {
  const list = periods ?? await getApprovedPeriods(userId)
  const last = list[list.length - 1]
  if (!last) return null
  const today = todayISO()
  if (today >= last.startDate && today < last.end) {
    return { label: last.tierLabel, totalPerDay: last.totalPerDay, expiresAt: last.end }
  }
  return null
}

/**
 * Effective daily quota = max(floor, active tier total/day). Never reduces
 * the pre-existing floor, and takes effect immediately since it's computed
 * on read — no cron/cache involved.
 */
export async function computeEffectiveLimit(userId: string, floor: number): Promise<number> {
  const active = await getActiveTier(userId)
  return active ? Math.max(floor, active.totalPerDay) : floor
}

export async function computeUserLedger(userId: string): Promise<{ balance: number; rows: LedgerRow[] }> {
  const floor = await getUserFloor(userId)
  const periods = await getApprovedPeriods(userId)
  const today = todayISO()

  type Ev = {
    date: string; order: 0 | 1; type: LedgerRowType; title: string
    titleKey: LedgerTitleKey; titleParams?: LedgerTitleParams; newLimit?: number
  }
  const events: Ev[] = []
  const resetDatesCovered = new Set<string>()

  for (const p of periods) {
    events.push({
      date: p.startDate, order: 0, type: 'tier-approved-reset',
      title: `Disetujui — ${p.tierLabel} (${p.totalPerDay}/hari)`,
      titleKey: 'tier-approved', titleParams: { tierLabel: p.tierLabel, totalPerDay: p.totalPerDay },
      newLimit: p.totalPerDay,
    })
    resetDatesCovered.add(p.startDate)

    if (!p.supersededEarly && p.naturalEndDate <= today) {
      events.push({
        date: p.naturalEndDate, order: 0, type: 'expiry-reset',
        title: `Masa aktif ${p.tierLabel} berakhir`,
        titleKey: 'tier-expired', titleParams: { tierLabel: p.tierLabel },
        newLimit: floor,
      })
      resetDatesCovered.add(p.naturalEndDate)
    }
  }

  const usageCutoff = dateOnly(addDays(new Date(), -USAGE_RETENTION_DAYS))
  const usageRows = await db.select().from(dailyUsage)
    .where(and(eq(dailyUsage.userId, userId), gte(dailyUsage.date, usageCutoff)))
  for (const u of usageRows) {
    const count = u.count ?? 0
    if (count <= 0) continue
    const dateStr = typeof u.date === 'string' ? u.date : dateOnly(new Date(u.date))

    if (!resetDatesCovered.has(dateStr)) {
      events.push({
        date: dateStr, order: 0, type: 'daily-reset', title: 'Reset harian',
        titleKey: 'daily-reset',
        newLimit: effectiveLimitForDate(dateStr, periods, floor),
      })
      resetDatesCovered.add(dateStr)
    }
    for (let i = 0; i < count; i++) {
      events.push({ date: dateStr, order: 1, type: 'usage', title: 'Pemakaian analisa', titleKey: 'usage' })
    }
  }

  events.sort((a, b) => (a.date === b.date ? a.order - b.order : (a.date < b.date ? -1 : 1)))

  const rows: LedgerRow[] = []
  let current = floor
  for (const e of events) {
    const before = current
    const after = e.type === 'usage' ? Math.max(0, before - 1) : e.newLimit!
    rows.push({
      date: e.date, type: e.type, title: e.title, titleKey: e.titleKey, titleParams: e.titleParams,
      before, after, delta: after - before,
    })
    current = after
  }

  // `current` is the running balance after the last processed event, but
  // that event may be from a previous day — a day with zero usage so far
  // has no event at all (by design, see the daily-reset skip above), so
  // carrying that stale balance forward would show yesterday's leftover
  // instead of today's fresh, untouched quota. Only trust `current` as
  // "today's balance" when the last event actually happened today.
  const lastEventDate = events.length > 0 ? events[events.length - 1].date : null
  const balance = lastEventDate === today
    ? current
    : effectiveLimitForDate(today, periods, floor)

  rows.reverse() // newest first
  return { balance, rows }
}

/**
 * Deletes dailyUsage rows older than USAGE_RETENTION_DAYS, across all users.
 * Run daily via the cron at app/api/cron/prune-old-usage/route.ts. Safe to
 * run at any time and as often as needed — purely usage telemetry, not
 * financial/approval data, and it never removes anything the ledger's
 * own retention-windowed query would have read anyway. Returns the number
 * of rows deleted.
 */
export async function pruneOldDailyUsage(): Promise<number> {
  const cutoff = dateOnly(addDays(new Date(), -USAGE_RETENTION_DAYS))
  const deleted = await db.delete(dailyUsage).where(lt(dailyUsage.date, cutoff)).returning({ userId: dailyUsage.userId })
  return deleted.length
}
