import type { WebhookEventPayload } from 'resend'
import { db } from '@/lib/db'
import { reports, reportMessages } from '@/drizzle/schema'
import { getResendClient } from '@/lib/email'
import { eq, inArray } from 'drizzle-orm'

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

// Trims the quoted-history tail most mail clients append below a reply
// ("On <date>, <sender> wrote: > ...", Outlook's "-----Original Message-----",
// or its "From:/Sent:/To:" header block) so a thread reply shows only what
// the user actually typed, not the whole prior conversation re-quoted.
const QUOTE_TAIL_PATTERNS = [
  /\r?\n?On .{1,150} wrote:\s*\r?\n[\s\S]*$/i,
  /\r?\n?-{2,}\s*Original Message\s*-{2,}[\s\S]*$/i,
  /\r?\n?From:\s*.+\r?\nSent:\s*.+\r?\nTo:\s*.+[\s\S]*$/i,
]

function stripQuotedReply(text: string): string {
  let result = text
  for (const pattern of QUOTE_TAIL_PATTERNS) {
    const match = result.match(pattern)
    if (match?.index) result = result.slice(0, match.index)
  }
  const trimmed = result.trim()
  return trimmed || text.trim()
}

/**
 * Message-IDs an inbound reply references (In-Reply-To + the full
 * References chain) — mail clients keep the ORIGINAL thread-starting
 * Message-ID in References even many hops deep, which is what lets us match
 * a reply back to its report without tracking every intermediate hop.
 */
function extractReferencedMessageIds(headers: Record<string, string> | null): string[] {
  if (!headers) return []
  const key = (name: string) => Object.keys(headers).find(k => k.toLowerCase() === name)
  const raw = [headers[key('in-reply-to') ?? ''] ?? '', headers[key('references') ?? ''] ?? ''].join(' ')
  const ids = raw.match(/<[^>]+>/g) ?? []
  return Array.from(new Set(ids.map(id => id.slice(1, -1))))
}

/**
 * If this inbound email is a reply within an existing report's thread,
 * returns that report's id — checked against both the report's own
 * `emailMessageId` (the original inbound message) and every admin reply's
 * `emailMessageId` (in case References is missing and In-Reply-To only
 * points at the most recent admin message).
 */
async function findThreadForReply(referencedIds: string[]): Promise<string | null> {
  if (referencedIds.length === 0) return null

  const [byReport] = await db.select({ id: reports.id }).from(reports)
    .where(inArray(reports.emailMessageId, referencedIds)).limit(1)
  if (byReport) return byReport.id

  const [byMessage] = await db.select({ reportId: reportMessages.reportId }).from(reportMessages)
    .where(inArray(reportMessages.emailMessageId, referencedIds)).limit(1)
  return byMessage?.reportId ?? null
}

/**
 * Handle a verified `email.received` event — fetch the full body and either
 * append it to an existing report's thread (if it's a reply within a thread
 * we started) or save it as a new `reports` row (source: 'email'). Only
 * processed if the email was addressed to THIS deployment's own support
 * inbox (SUPPORT_INBOUND_EMAIL).
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
}): Promise<'saved' | 'appended' | 'ignored' | 'error'> {
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

    const rawBody = email.text?.trim() || stripHtml(email.html ?? '') || '(email tanpa isi teks)'
    const body = stripQuotedReply(rawBody)

    const referencedIds = extractReferencedMessageIds(email.headers)
    const existingReportId = await findThreadForReply(referencedIds)

    if (existingReportId) {
      await db.insert(reportMessages).values({
        reportId:       existingReportId,
        sender:         'user',
        body,
        emailMessageId: email.message_id,
      })
      // A new user message always needs admin's attention again, whatever
      // the report's previous state ('waiting'/'replied'/'done').
      await db.update(reports).set({ status: 'open', updatedAt: new Date() })
        .where(eq(reports.id, existingReportId))
      return 'appended'
    }

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
