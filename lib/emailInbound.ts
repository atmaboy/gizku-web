import type { WebhookEventPayload } from 'resend'
import { db } from '@/lib/db'
import { reports } from '@/drizzle/schema'
import { getResendClient } from '@/lib/email'

/**
 * Verify a Resend inbound webhook request (Svix signature under the hood).
 * Returns null on any failure (missing secret, missing headers, bad
 * signature) — caller should respond 400 without processing.
 */
export function verifyInboundWebhook(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null }
): WebhookEventPayload | null {
  const resend = getResendClient()
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET
  if (!resend || !secret) return null
  if (!headers.id || !headers.timestamp || !headers.signature) return null

  try {
    return resend.webhooks.verify({
      payload,
      headers: { id: headers.id, timestamp: headers.timestamp, signature: headers.signature },
      webhookSecret: secret,
    })
  } catch {
    return null
  }
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return (match ? match[1] : raw).trim().toLowerCase()
}

function extractDisplayName(raw: string): string | null {
  const match = raw.match(/^"?([^"<]+?)"?\s*<[^>]+>$/)
  return match ? match[1].trim() : null
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Handle a verified `email.received` event — fetch the full body and save it
 * as a new `reports` row (source: 'email'). Only processed if the email was
 * addressed to THIS deployment's own support inbox (SUPPORT_INBOUND_EMAIL).
 *
 * Inbound receiving webhooks fan out to every endpoint registered on the
 * Resend account regardless of which domain the email arrived at — this
 * filter is what keeps a staging deployment from picking up production
 * emails (and vice versa) when both share one Resend account.
 */
export async function processInboundEmail(eventData: {
  email_id: string
  to: string[]
  received_for?: string[]
}): Promise<'saved' | 'ignored' | 'error'> {
  const supportAddress = (process.env.SUPPORT_INBOUND_EMAIL || 'support@gizku.com').toLowerCase()
  const recipients = [...eventData.to, ...(eventData.received_for ?? [])].map(a => a.toLowerCase())
  if (!recipients.includes(supportAddress)) return 'ignored'

  const resend = getResendClient()
  if (!resend) return 'error'

  try {
    const { data: email, error } = await resend.emails.receiving.get(eventData.email_id)
    if (error || !email) {
      console.error('[emailInbound] gagal fetch email', eventData.email_id, error)
      return 'error'
    }

    const body = email.text?.trim() || stripHtml(email.html ?? '') || '(email tanpa isi teks)'

    await db.insert(reports).values({
      username:       extractDisplayName(email.from),
      message:        body,
      source:         'email',
      fromEmail:      extractEmailAddress(email.from),
      emailMessageId: email.message_id,
      emailSubject:   email.subject,
    })

    return 'saved'
  } catch (e) {
    console.error('[emailInbound] gagal memproses email masuk', eventData.email_id, e)
    return 'error'
  }
}
