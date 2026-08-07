import crypto from 'crypto'
import { db } from '@/lib/db'
import { users, emailVerificationTokens } from '@/drizzle/schema'
import { getCfg } from '@/lib/admin'
import { sendEmail } from '@/lib/email'
import { buildVerificationEmailHtml } from '@/lib/emailTemplates/verification'
import { eq, and, gte, isNull } from 'drizzle-orm'

const DEFAULT_EXPIRY_HOURS = 72
const MAX_EXPIRY_HOURS = 120
const MIN_EXPIRY_HOURS = 1
const MAX_SENDS_PER_WINDOW = 3
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000

export type ConsumeResult = 'success' | 'already_verified' | 'expired' | 'error'
export type ResendResult = { ok: true } | { ok: false; code: 'already_verified' | 'rate_limited' }

function generateRawToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function getVerificationExpiryHours(): Promise<number> {
  const raw = await getCfg('email_verification_expiry_hours')
  const n = parseInt(raw ?? '', 10)
  if (isNaN(n)) return DEFAULT_EXPIRY_HOURS
  return clampExpiryHours(n)
}

export function clampExpiryHours(hours: number): number {
  return Math.min(MAX_EXPIRY_HOURS, Math.max(MIN_EXPIRY_HOURS, Math.round(hours)))
}

async function countRecentSends(userId: string): Promise<number> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
  const rows = await db.select({ id: emailVerificationTokens.id })
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.userId, userId), gte(emailVerificationTokens.createdAt, since)))
  return rows.length
}

/**
 * Buat token baru & kirim email verifikasi. Fire-and-forget dari caller
 * (register, ganti email) — di sini errors dilempar ke pemanggil supaya
 * trigger manual (resend) bisa melapor gagal, sementara trigger otomatis
 * cukup `.catch(console.error)` di call site.
 */
export async function createAndSendVerification(opts: {
  userId: string
  email: string
  username: string
}): Promise<void> {
  const { userId, email, username } = opts
  const expiryHours = await getVerificationExpiryHours()
  const raw = generateRawToken()
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(raw),
    email,
    expiresAt,
  })

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com').replace(/\/$/, '')
  const verifyUrl = `${appUrl}/verify?token=${raw}`

  await sendEmail({
    to: email,
    subject: 'Verifikasi email Gizku kamu',
    html: buildVerificationEmailHtml({ username, verifyUrl, expiryHours }),
  })
}

/** Trigger otomatis (register, ganti email) — tidak boleh gagalkan alur utama. */
export function sendVerificationEmailInBackground(opts: { userId: string; email: string; username: string }) {
  createAndSendVerification(opts).catch(e =>
    console.error('[emailVerification] gagal mengirim email verifikasi', opts.userId, e)
  )
}

/** Dipanggil dari POST /api/user?action=resend_verification (Settings → Email). */
export async function resendVerification(userId: string): Promise<ResendResult> {
  const [user] = await db.select({
    email: users.email,
    username: users.username,
    emailVerifiedAt: users.emailVerifiedAt,
  }).from(users).where(eq(users.id, userId)).limit(1)

  if (!user || !user.email) return { ok: false, code: 'already_verified' }
  if (user.emailVerifiedAt) return { ok: false, code: 'already_verified' }

  const recentSends = await countRecentSends(userId)
  if (recentSends >= MAX_SENDS_PER_WINDOW) return { ok: false, code: 'rate_limited' }

  await createAndSendVerification({ userId, email: user.email, username: user.username })
  return { ok: true }
}

/** Dipanggil dari Server Component app/verify/page.tsx saat user klik link di email. */
export async function consumeToken(rawToken: string): Promise<ConsumeResult> {
  try {
    const tokenHash = hashToken(rawToken)
    const [row] = await db.select().from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash)).limit(1)

    if (!row) return 'error'

    const [user] = await db.select({ emailVerifiedAt: users.emailVerifiedAt })
      .from(users).where(eq(users.id, row.userId)).limit(1)
    if (!user) return 'error'

    // Idempotent: token ini (atau token lain) sudah pernah berhasil memverifikasi
    // akunnya — jangan tampilkan error kalau user klik link yang sama dua kali.
    if (user.emailVerifiedAt) return 'already_verified'

    // Token ini sendiri sudah pernah dipakai tapi akun belum ke-flag verified
    // (kasus langka — mis. di-reset manual) — treat seperti expired, minta
    // request link baru daripada mengklaim sukses.
    if (row.consumedAt) return 'expired'

    if (row.expiresAt.getTime() < Date.now()) return 'expired'

    await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, row.userId))
    await db.update(emailVerificationTokens).set({ consumedAt: new Date() })
      .where(eq(emailVerificationTokens.id, row.id))
    // Token lain yang masih outstanding untuk user ini jadi tidak relevan lagi
    // (akun sudah terverifikasi) — invalidate supaya tidak bisa "dipakai ulang".
    await db.update(emailVerificationTokens).set({ consumedAt: new Date() })
      .where(and(
        eq(emailVerificationTokens.userId, row.userId),
        isNull(emailVerificationTokens.consumedAt),
      ))

    return 'success'
  } catch (e) {
    console.error('[emailVerification] consumeToken error', e)
    return 'error'
  }
}
