import { db } from '@/lib/db'
import { linkWhitelist } from '@/drizzle/schema'
import { asc } from 'drizzle-orm'
import type { WhitelistEntry } from '@/lib/notificationLinks'

/** gizku.com + subdomain selalu lolos, bahkan kalau tabel belum termigrasi / kosong. */
const FALLBACK: WhitelistEntry[] = [{ domain: 'gizku.com', includeSubdomains: true }]

export async function getWhitelistEntries(): Promise<WhitelistEntry[]> {
  try {
    const rows = await db.select({ domain: linkWhitelist.domain, includeSubdomains: linkWhitelist.includeSubdomains })
      .from(linkWhitelist).orderBy(asc(linkWhitelist.domain))
    return rows.some(r => r.domain === 'gizku.com') ? rows : [...FALLBACK, ...rows]
  } catch {
    return FALLBACK
  }
}
