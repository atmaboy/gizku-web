/**
 * GET /api/telegram/verify?token=XXXXXX&tgId=123456789&firstName=John&username=johndoe
 * Called by the Telegram bot after user sends /link <token>.
 * Validates token, links telegramId to userId, then deletes token.
 *
 * This endpoint is called server-to-server (bot → Next.js API).
 * Secured by TELEGRAM_WEBHOOK_SECRET to prevent abuse.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { telegramLinkTokens, telegramUsers } from '@/drizzle/schema'
import { eq, and, gt } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  // Validate internal secret so only the bot server can call this
  const secret   = process.env.TELEGRAM_WEBHOOK_SECRET
  const incoming = req.headers.get('x-gizku-internal-secret')
  if (secret && incoming !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const token     = (searchParams.get('token') ?? '').toUpperCase().trim()
  const tgIdStr   = searchParams.get('tgId') ?? ''
  const firstName = searchParams.get('firstName') ?? null
  const username  = searchParams.get('username') ?? null

  if (!token || !tgIdStr) {
    return NextResponse.json({ error: 'token and tgId are required' }, { status: 400 })
  }

  const tgId = BigInt(tgIdStr)

  // Find valid, non-expired token
  const [linkToken] = await db
    .select()
    .from(telegramLinkTokens)
    .where(
      and(
        eq(telegramLinkTokens.token, token),
        gt(telegramLinkTokens.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!linkToken) {
    return NextResponse.json(
      { error: 'token_invalid', message: 'Token tidak valid atau sudah kedaluwarsa.' },
      { status: 404 },
    )
  }

  // Check if this telegramId is already linked to ANOTHER user
  const [existingTg] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, tgId))
    .limit(1)

  if (existingTg) {
    if (existingTg.userId === linkToken.userId) {
      // Already linked to same user — idempotent success
      await db.delete(telegramLinkTokens).where(eq(telegramLinkTokens.token, token))
      return NextResponse.json({ ok: true, alreadyLinked: true })
    }

    // Linked to different user — update
    await db
      .update(telegramUsers)
      .set({ userId: linkToken.userId, firstName, username, updatedAt: new Date() })
      .where(eq(telegramUsers.telegramId, tgId))
  } else {
    // New telegram user — upsert
    await db
      .insert(telegramUsers)
      .values({
        telegramId:   tgId,
        userId:       linkToken.userId,
        firstName,
        username,
        dailyCount:   0,
        lastUsedDate: new Date().toISOString().slice(0, 10),
      })
      .onConflictDoUpdate({
        target: telegramUsers.telegramId,
        set:    { userId: linkToken.userId, firstName, username, updatedAt: new Date() },
      })
  }

  // Consume token — one-time use
  await db.delete(telegramLinkTokens).where(eq(telegramLinkTokens.token, token))

  return NextResponse.json({ ok: true, userId: linkToken.userId })
}
