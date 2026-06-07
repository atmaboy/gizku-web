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

    // Validate secret token to reject forged requests
    const secret  = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      const incoming = req.headers.get('x-telegram-bot-api-secret-token')
      if (incoming !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const update = await req.json()
    const bot    = createBot(token)

    // Handle update without polling — single shot
    await bot.handleUpdate(update)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[webhook] unhandled error:', e)
    // Always return 200 to Telegram so it doesn't retry endlessly
    return NextResponse.json({ ok: true })
  }
}

// Telegram sends GET to verify webhook — return 200
export async function GET() {
  return NextResponse.json({ ok: true, service: 'gizku-telegram-bot' })
}
