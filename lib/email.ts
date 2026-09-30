import { Resend } from 'resend'

const FROM = 'Gizku <no-reply@gizku.com>'

/**
 * Sender identities available for the admin backoffice email blast (app/admin/blast).
 * The `marketing` key is what's stored in notification_blasts.from_address —
 * only its display name/address changed (was "Gizku Marketing <marketing@…>").
 * connect@ is send-only — replies are only received at support@ (lib/emailInbound.ts).
 */
export const BLAST_SENDERS = {
  support: 'Gizku Support <support@gizku.com>',
  marketing: 'Gizku Connect <connect@gizku.com>',
} as const
export type BlastSenderKey = keyof typeof BLAST_SENDERS

let client: Resend | null = null

/** Exported for lib/emailInbound.ts (webhook signature verify + fetch full received email). */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!client) client = new Resend(apiKey)
  return client
}

/**
 * Kirim email transaksional. Selalu melempar error kalau gagal (termasuk
 * RESEND_API_KEY belum diset) — pemanggil yang memutuskan cara menangani:
 * fire-and-forget (`.catch(console.error)`) untuk trigger otomatis (register,
 * ganti email — tidak boleh memblokir/menggagalkan alur utama), atau `await`
 * untuk trigger manual (resend, blast) yang perlu melapor sukses/gagal ke user.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string; from?: string }): Promise<{ id: string | null }> {
  const resend = getResendClient()
  if (!resend) throw new Error('RESEND_API_KEY tidak diset')

  const { data, error } = await resend.emails.send({
    from: opts.from ?? FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
  if (error) throw new EmailSendError(`Resend error: ${error.message}`, error.name, error.statusCode)
  return { id: data?.id ?? null }
}

/** Resend API failure, keeping Resend's error code so callers can react (e.g. retry on rate limit). */
export class EmailSendError extends Error {
  constructor(message: string, public code: string | null = null, public statusCode: number | null = null) {
    super(message)
    this.name = 'EmailSendError'
  }
  /** Resend's "Too many requests" — safe to retry after a short wait. */
  get isRateLimited(): boolean {
    return this.code === 'rate_limit_exceeded' || this.statusCode === 429
  }
}
