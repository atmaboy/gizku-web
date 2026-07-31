/**
 * Mobile-facing push token registration + delivery ack.
 *
 * POST /api/push?action=register   body: { token, platform }  — upsert this device's Expo push token
 * POST /api/push?action=unregister body: { token }            — deactivate token (on logout)
 * POST /api/push?action=ack        body: { blastId, event }   — mark a blast as clicked/read by this user
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { pushTokens } from '@/drizzle/schema'
import { verifyToken, extractToken } from '@/lib/auth'
import { ok, err, setCors } from '@/lib/utils'
import { ackBlastRecipient } from '@/lib/blast'
import { eq, and } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

async function authUser(req: NextRequest) {
  const token = extractToken(req.headers.get('Authorization'))
  if (!token) return null
  try {
    const p = await verifyToken(token)
    if (!p.userId) return null
    return p as { userId: string; username: string; role: string }
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const user = await authUser(req)
  if (!user) return err('Token tidak valid', 401)

  const action = req.nextUrl.searchParams.get('action')

  if (action === 'register') {
    const { token, platform } = await req.json()
    if (!token || typeof token !== 'string') return err('Push token diperlukan')
    if (platform !== 'ios' && platform !== 'android') return err('Platform tidak valid')

    await db.insert(pushTokens)
      .values({ userId: user.userId, token, platform, isActive: true })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { userId: user.userId, platform, isActive: true, updatedAt: new Date(), lastSeenAt: new Date() },
      })

    return ok({ message: 'Push token terdaftar' })
  }

  if (action === 'unregister') {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') return err('Push token diperlukan')

    await db.update(pushTokens).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(pushTokens.token, token), eq(pushTokens.userId, user.userId)))

    return ok({ message: 'Push token dinonaktifkan' })
  }

  if (action === 'ack') {
    const { blastId, event } = await req.json()
    if (!blastId || (event !== 'clicked' && event !== 'read')) return err('blastId dan event diperlukan')

    await ackBlastRecipient(blastId, user.userId, event)
    return ok({ message: 'Tercatat' })
  }

  return err('Action tidak dikenal')
}
