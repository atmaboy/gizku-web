/**
 * POST /api/telegram/link
 * Generates a 6-character OTP link token for the authenticated web user.
 * Token is valid for 15 minutes. Only one active token per user (upsert).
 *
 * Response: { token: "AB3X9Z", expiresAt: "ISO string", botUsername: string }
 *
 * DELETE /api/telegram/link
 * Unlinks the Telegram account from the authenticated web user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { telegramLinkTokens, telegramUsers, users } from '@/drizzle/schema'
import { eq, lt } from 'drizzle-orm'
import { verifyToken } from '@/lib/auth'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

function generateToken(): string {
  let t = ''
  for (let i = 0; i < 6; i++) t += CHARS[Math.floor(Math.random() * CHARS.length)]
  return t
}

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const cookieToken = req.cookies.get('auth_token')?.value ?? ''
  const raw = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken
  if (!raw) return null
  try {
    const payload = await verifyToken(raw)
    return payload as { userId: string; username: string } | null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? ''
  const expiresAt   = new Date(Date.now() + TOKEN_TTL_MS)

  // Purge expired tokens
  await db.delete(telegramLinkTokens).where(lt(telegramLinkTokens.expiresAt, new Date())).catch(() => {})

  // Delete any existing token for this user
  await db.delete(telegramLinkTokens).where(eq(telegramLinkTokens.userId, auth.userId)).catch(() => {})

  // Generate unique token
  let token = generateToken()
  for (let i = 0; i < 5; i++) {
    const [existing] = await db
      .select({ token: telegramLinkTokens.token })
      .from(telegramLinkTokens)
      .where(eq(telegramLinkTokens.token, token))
      .limit(1)
    if (!existing) break
    token = generateToken()
  }

  await db.insert(telegramLinkTokens).values({
    token,
    userId: auth.userId,
    expiresAt,
  })

  return NextResponse.json({
    token,
    expiresAt: expiresAt.toISOString(),
    botUsername,
    deepLink: botUsername ? `https://t.me/${botUsername}?start=link_${token}` : null,
    instruction: `Kirim perintah ini ke bot Telegram Gizku:\n/link ${token}`,
  })
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db
    .update(telegramUsers)
    .set({ userId: null, updatedAt: new Date() })
    .where(eq(telegramUsers.userId, auth.userId))

  return NextResponse.json({ ok: true, message: 'Akun Telegram berhasil diputus.' })
}
