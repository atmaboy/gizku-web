import { db } from '@/lib/db'
import { reports, limitRequests } from '@/drizzle/schema'
import { count, eq } from 'drizzle-orm'

export type AdminNavCounts = { openReports: number; pendingLimit: number }

/** Badge counts for the admin sidebar + navbar bell. */
export async function getAdminNavCounts(): Promise<AdminNavCounts> {
  const [[r], [l]] = await Promise.all([
    db.select({ c: count() }).from(reports).where(eq(reports.status, 'open')),
    db.select({ c: count() }).from(limitRequests).where(eq(limitRequests.status, 'pending')),
  ])
  return { openReports: Number(r.c), pendingLimit: Number(l.c) }
}
