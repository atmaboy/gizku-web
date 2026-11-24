/** Query backoffice Goals & Tracker: ringkasan, waitlist Premium, dan data per user. */
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type WaitlistRow = { userId: string; username: string; email: string | null; at: string; source: string | null }

type LatestRow = { user_id: string; username: string; email: string | null; event: string; source: string | null; created_at: Date | string }

/** Event pengingat TERAKHIR per user (remind_yes / remind_no). */
async function latestRemindRows(): Promise<LatestRow[]> {
  return await db.execute<LatestRow>(sql`
    SELECT DISTINCT ON (e.user_id) e.user_id, u.username, u.email, e.event, e.source, e.created_at
    FROM premium_interest_events e JOIN users u ON u.id = e.user_id
    WHERE e.event IN ('remind_yes','remind_no')
    ORDER BY e.user_id, e.created_at DESC, e.id DESC`) as unknown as LatestRow[]
}

const iso = (d: Date | string) => new Date(d).toISOString()

export async function getWaitlist(): Promise<WaitlistRow[]> {
  const rows = await latestRemindRows()
  return rows.filter(r => r.event === 'remind_yes')
    .map(r => ({ userId: r.user_id, username: r.username, email: r.email, at: iso(r.created_at), source: r.source }))
    .sort((a, b) => b.at.localeCompare(a.at))
}

export async function getGoalsAdminStats() {
  const since7 = new Date(Date.now() - 7 * 86_400_000)
  const [countsRow] = await db.execute<{ with_goal: number; premium_active: number; cta7: number; macro7: number }>(sql`
    SELECT
      (SELECT count(*) FROM user_goals)::int AS with_goal,
      (SELECT count(*) FROM users WHERE premium_until > now())::int AS premium_active,
      (SELECT count(*) FROM premium_interest_events WHERE event = 'cta_click' AND created_at >= ${since7})::int AS cta7,
      (SELECT count(*) FROM premium_interest_events WHERE event = 'macro_tab_locked' AND created_at >= ${since7})::int AS macro7`) as unknown as { with_goal: number; premium_active: number; cta7: number; macro7: number }[]

  const sources = await db.execute<{ source: string | null; n: number }>(sql`
    SELECT source, count(*)::int AS n FROM premium_interest_events WHERE event = 'cta_click' GROUP BY source`) as unknown as { source: string | null; n: number }[]

  const latest = await latestRemindRows()
  const yes = latest.filter(r => r.event === 'remind_yes')
  const no = latest.filter(r => r.event === 'remind_no')
  const yes7 = yes.filter(r => new Date(r.created_at) >= since7).length

  // Membatalkan pengingat: latest = remind_no dan pernah remind_yes sebelumnya.
  const cancelledRows = await db.execute<{ n: number }>(sql`
    SELECT count(DISTINCT e.user_id)::int AS n FROM premium_interest_events e
    WHERE e.event = 'remind_yes' AND EXISTS (
      SELECT 1 FROM (
        SELECT DISTINCT ON (user_id) user_id, event FROM premium_interest_events
        WHERE event IN ('remind_yes','remind_no') ORDER BY user_id, created_at DESC, id DESC
      ) l WHERE l.user_id = e.user_id AND l.event = 'remind_no')`) as unknown as { n: number }[]

  const sourceMap: Record<string, number> = {}
  for (const s of sources) sourceMap[s.source ?? 'unknown'] = Number(s.n)

  return {
    usersWithGoal: Number(countsRow?.with_goal ?? 0),
    premiumActive: Number(countsRow?.premium_active ?? 0),
    ctaClicks7d: Number(countsRow?.cta7 ?? 0),
    macroLocked7d: Number(countsRow?.macro7 ?? 0),
    remindYes: yes.length,
    remindYes7d: yes7,
    remindNo: no.length,
    remindCancelled: Number(cancelledRows[0]?.n ?? 0),
    ctaBySource: sourceMap,
  }
}

/** Data per user untuk kartu "Statistik & Premium" di Detail User. */
export async function getUserPremiumInfo(userId: string) {
  const since7 = new Date(Date.now() - 7 * 86_400_000)
  const [row] = await db.execute<{ cta7: number; remind_at: Date | string | null; remind_source: string | null; remind_event: string | null }>(sql`
    SELECT
      (SELECT count(*) FROM premium_interest_events WHERE user_id = ${userId} AND event = 'cta_click' AND created_at >= ${since7})::int AS cta7,
      l.created_at AS remind_at, l.source AS remind_source, l.event AS remind_event
    FROM (SELECT 1) x
    LEFT JOIN LATERAL (
      SELECT created_at, source, event FROM premium_interest_events
      WHERE user_id = ${userId} AND event IN ('remind_yes','remind_no') ORDER BY created_at DESC, id DESC LIMIT 1
    ) l ON true`) as unknown as { cta7: number; remind_at: Date | string | null; remind_source: string | null; remind_event: string | null }[]
  return {
    cta7d: Number(row?.cta7 ?? 0),
    remindAt: row?.remind_event === 'remind_yes' && row.remind_at ? new Date(row.remind_at) : null,
    remindSource: row?.remind_event === 'remind_yes' ? row.remind_source : null,
  }
}
