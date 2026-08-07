/**
 * Resend Inbound webhook — fires on `email.received` when someone emails
 * the support address (see lib/emailInbound.ts for the SUPPORT_INBOUND_EMAIL
 * filter that separates staging from production). Saved into `reports` so
 * it shows up next to in-app feedback at /admin/reports.
 *
 * Not CORS-enabled on purpose — this is a server-to-server callback from
 * Resend, never called from a browser.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyInboundWebhook, processInboundEmail } from '@/lib/emailInbound'

export async function POST(req: NextRequest) {
  const payload = await req.text() // must be raw text — signature breaks if parsed/re-stringified

  const event = verifyInboundWebhook(payload, {
    id: req.headers.get('svix-id'),
    timestamp: req.headers.get('svix-timestamp'),
    signature: req.headers.get('svix-signature'),
  })

  if (!event) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

  if (event.type === 'email.received') {
    const result = await processInboundEmail(event.data)
    if (result === 'error') return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
