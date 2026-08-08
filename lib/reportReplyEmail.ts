import { getResendClient } from '@/lib/email'
import { buildReportReplyEmailHtml } from '@/lib/emailTemplates/reportReply'

/**
 * Kirim balasan helpdesk untuk sebuah `reports` row bersumber email. Dikirim
 * dari alamat SUPPORT_INBOUND_EMAIL (bukan no-reply@) supaya balasan user
 * lewat "Reply" di email client mereka masuk lagi ke inbound webhook yang
 * sama. In-Reply-To/References dirantai dari message-id sebelumnya di
 * thread supaya email client mengelompokkannya sebagai satu percakapan.
 */
export async function sendReportReplyEmail(opts: {
  to: string
  subject: string
  bodyText: string
  attachments: { url: string; kind: 'image' | 'video' }[]
  inReplyTo: string | null
  references: string[]
}): Promise<{ id: string | null }> {
  const resend = getResendClient()
  if (!resend) throw new Error('RESEND_API_KEY tidak diset')

  const supportAddress = process.env.SUPPORT_INBOUND_EMAIL || 'support@gizku.com'
  const headers: Record<string, string> = {}
  if (opts.inReplyTo) headers['In-Reply-To'] = opts.inReplyTo
  if (opts.references.length) headers['References'] = opts.references.join(' ')

  const { data, error } = await resend.emails.send({
    from: `Gizku Support <${supportAddress}>`,
    to: opts.to,
    subject: opts.subject,
    html: buildReportReplyEmailHtml({ bodyText: opts.bodyText, attachments: opts.attachments }),
    headers: Object.keys(headers).length ? headers : undefined,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
  return { id: data?.id ?? null }
}
