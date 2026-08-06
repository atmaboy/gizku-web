import { Resend } from 'resend'

const FROM = 'Gizku <no-reply@gizku.com>'

let client: Resend | null = null

function getResendClient(): Resend | null {
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
 * untuk trigger manual (resend) yang perlu melapor sukses/gagal ke user.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const resend = getResendClient()
  if (!resend) throw new Error('RESEND_API_KEY tidak diset')

  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}
