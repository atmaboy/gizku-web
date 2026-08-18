/**
 * Closed Beta Tester Android opt-in — shared config helper (feature flag +
 * bilingual popup content), used by the public content API, the register
 * API (to gate persisting the opt-in), and the admin config API.
 */
import { db } from '@/lib/db'
import { betaOptinConfig } from '@/drizzle/schema'

export type BetaOptinLangContent = { title: string; points: string[]; callout: string }
export type BetaOptinContent = {
  enabled: boolean
  id: BetaOptinLangContent
  en: BetaOptinLangContent
  updatedAt: string | null
}

let cache: { value: BetaOptinContent; ts: number } | null = null
const TTL_MS = 10_000 // cache 10 detik agar tidak hit DB tiap request

const EMPTY: BetaOptinContent = {
  enabled: false,
  id: { title: '', points: [], callout: '' },
  en: { title: '', points: [], callout: '' },
  updatedAt: null,
}

export async function getBetaOptinConfig(): Promise<BetaOptinContent> {
  const now = Date.now()
  if (cache && now - cache.ts < TTL_MS) return cache.value

  try {
    const [row] = await db.select().from(betaOptinConfig).limit(1)
    const value: BetaOptinContent = row
      ? {
          enabled: row.enabled,
          id: { title: row.titleId, points: row.pointsId, callout: row.calloutId },
          en: { title: row.titleEn, points: row.pointsEn, callout: row.calloutEn },
          updatedAt: row.updatedAt.toISOString(),
        }
      : EMPTY
    cache = { value, ts: now }
    return value
  } catch {
    // Kalau DB error, jangan block registrasi — fail closed (sembunyikan fitur)
    return EMPTY
  }
}

/** Invalidate cache setelah admin update konfigurasi beta opt-in */
export function invalidateBetaOptinConfigCache() {
  cache = null
}
