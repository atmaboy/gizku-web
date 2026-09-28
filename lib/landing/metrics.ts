/**
 * Automatic stats. Counted ONLY by the backoffice (builder load + publish);
 * the result is frozen into StatItem.resolvedValue so the public page never
 * runs a count query (Acceptance #10).
 */
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export type { MetricValues } from './stats'
export { METRIC_LABELS, applyMetrics } from './stats'
import type { MetricValues } from './stats'

export async function computeMetrics(): Promise<MetricValues> {
  // One round trip, three counts.
  const rows = await db.execute<{ users_active: number; users_login_30d: number; meals_total: number }>(sql`
    SELECT
      (SELECT count(*) FROM users WHERE is_active)::int                                         AS users_active,
      (SELECT count(*) FROM users WHERE last_login_at > now() - interval '30 days')::int         AS users_login_30d,
      (SELECT count(*) FROM meals)::int                                                          AS meals_total
  `)
  const r = rows[0] ?? { users_active: 0, users_login_30d: 0, meals_total: 0 }
  return {
    users_active: Number(r.users_active) || 0,
    users_login_30d: Number(r.users_login_30d) || 0,
    meals_total: Number(r.meals_total) || 0,
  }
}

