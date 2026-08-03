import { db } from '@/lib/db'
import { limitTiers, limitRequests, users } from '@/drizzle/schema'
import { getCfg, setCfg, getGlobalLimit } from '@/lib/admin'
import { eq, and, ne, asc } from 'drizzle-orm'

/**
 * "Request Kenaikan Limit Analisa" — shared config/tier/unique-code helpers.
 *
 * Bank account details + the feature kill-switch reuse the existing generic
 * admin_config key/value store (see lib/admin.ts getCfg/setCfg) — tiers are a
 * separate list (limit_tiers table), not part of this config blob.
 */

export const REJECT_REASONS = [
  'Bukti transfer tidak jelas / buram',
  'Nominal transfer tidak sesuai paket',
  'Bukti transfer sudah pernah digunakan',
  'Rekening tujuan tidak sesuai',
  'Lainnya',
] as const

export type RejectReason = typeof REJECT_REASONS[number]

export async function isLimitFeatureEnabled(): Promise<boolean> {
  return (await getCfg('limit_feature_enabled')) === 'true'
}

export async function getLimitBankConfig() {
  const [bankName, accountNumber, accountHolder] = await Promise.all([
    getCfg('limit_bank_name'),
    getCfg('limit_bank_account_number'),
    getCfg('limit_bank_account_holder'),
  ])
  return {
    bankName:      bankName ?? '',
    accountNumber: accountNumber ?? '',
    accountHolder: accountHolder ?? '',
  }
}

export async function setLimitConfig(opts: {
  bankName: string
  accountNumber: string
  accountHolder: string
  featureEnabled: boolean
}) {
  await Promise.all([
    setCfg('limit_bank_name', opts.bankName),
    setCfg('limit_bank_account_number', opts.accountNumber),
    setCfg('limit_bank_account_holder', opts.accountHolder),
    setCfg('limit_feature_enabled', opts.featureEnabled ? 'true' : 'false'),
  ])
}

/**
 * The floor that already applies to this user today via the pre-existing
 * mechanism: their per-user override (users.dailyLimit) if set, else the
 * global default (admin_config.default_daily_limit via getGlobalLimit()).
 * The tier system only ever adds on top of this — it never replaces it.
 */
export async function getUserFloor(userId: string): Promise<number> {
  const [u] = await db.select({ dailyLimit: users.dailyLimit }).from(users)
    .where(eq(users.id, userId)).limit(1)
  const globalLimit = await getGlobalLimit()
  return u?.dailyLimit ?? globalLimit
}

export async function listTiers() {
  return db.select().from(limitTiers).orderBy(asc(limitTiers.sortOrder))
}

export async function getTierById(id: string) {
  const [t] = await db.select().from(limitTiers).where(eq(limitTiers.id, id)).limit(1)
  return t ?? null
}

/**
 * totalTransfer = floor(price/1000)*1000 + uniqueCode — strips price to a
 * clean thousand then appends the 3-digit code, so the code always lands in
 * the exact last 3 digits regardless of what the admin set as price.
 */
export function computeTotalTransfer(price: number, uniqueCode: number): number {
  return Math.floor(price / 1000) * 1000 + uniqueCode
}

/**
 * Random 3-digit code (100-999) unique among requests with status != 'approved'
 * (pending + rejected block it; approved frees it for reuse).
 */
export async function generateUniqueCode(): Promise<number> {
  for (let attempt = 0; attempt < 200; attempt++) {
    const code = 100 + Math.floor(Math.random() * 900)
    const [existing] = await db.select({ id: limitRequests.id }).from(limitRequests)
      .where(and(eq(limitRequests.uniqueCode, code), ne(limitRequests.status, 'approved')))
      .limit(1)
    if (!existing) return code
  }
  throw new Error('Gagal membuat kode unik transfer, coba lagi')
}
