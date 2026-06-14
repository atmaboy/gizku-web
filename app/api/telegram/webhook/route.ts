/**
 * app/api/telegram/webhook/route.ts
 * Receives Telegram webhook updates and dispatches to grammY bot.
 * Validates X-Telegram-Bot-Api-Secret-Token header for security.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createBot } from '@/lib/bot'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      console.error('[webhook] TELEGRAM_BOT_TOKEN is not set')
      return NextResponse.json({ error: 'Bot not configured' }, { status: 503 })
    }

    // Validate secret token to reject forged requests.
    // Only enforced when TELEGRAM_WEBHOOK_SECRET is set in env.
    // When testing manually with curl, either:
    //   (a) unset TELEGRAM_WEBHOOK_SECRET in dev, OR
    //   (b) pass -H "X-Telegram-Bot-Api-Secret-Token: <your-secret>"
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      const incoming = req.headers.get('x-telegram-bot-api-secret-token')
      if (incoming !== secret) {
        console.warn('[webhook] Rejected request: invalid or missing secret token')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const update = await req.json()
    const bot    = createBot(token)

    // Initialize bot to fetch botInfo (required by grammY before handleUpdate)
    await bot.init()

    // Handle update without polling — single shot
    await bot.handleUpdate(update)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[webhook] unhandled error:', e)
    // Always return 200 to Telegram so it doesn't retry endlessly
    return NextResponse.json({ ok: true })
  }
}

/**
 * GET /api/telegram/webhook
 * Health check — returns config status for easy debugging.
 * Does NOT expose secret values, only whether they are set.
 */
export async function GET() {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET

  return NextResponse.json({
    ok: true,
    service: 'gizku-telegram-bot',
    config: {
      token_set:  !!token,
      secret_set: !!secret,
      note: secret
        ? 'Secret is set. When testing with curl, add: -H "X-Telegram-Bot-Api-Secret-Token: <your-secret>"'
        : 'No secret set — webhook accepts all POST requests (ok for dev)',
    },
  })
}
