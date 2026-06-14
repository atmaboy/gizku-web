/**
 * GET /api/admin/telegram/stats
 * Returns Telegram bot usage statistics for the admin dashboard.
 * Requires valid admin session (reads JWT from cookie or Authorization header).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { telegramUsers, meals, users } from '@/drizzle/schema'
import { desc, eq, sql, count, and, gte, isNotNull } from 'drizzle-orm'
import { verifyToken } from '@/lib/auth'

async function requireAdmin(req: NextRequest) {
  const authHeader  = req.headers.get('authorization') ?? ''
  const cookieToken = req.cookies.get('admin_token')?.value ?? req.cookies.get('auth_token')?.value ?? ''
  const raw = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken
  if (!raw) return null
  try {
    const payload = await verifyToken(raw) as { userId?: string; role?: string } | null
    return payload
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today    = new Date().toISOString().slice(0, 10)
  const weekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Total telegram users
  const [{ totalTgUsers }] = await db
    .select({ totalTgUsers: count() })
    .from(telegramUsers)

  // Linked users (have userId)
  const [{ linkedCount }] = await db
    .select({ linkedCount: count() })
    .from(telegramUsers)
    .where(isNotNull(telegramUsers.userId))

  // Active today (have sent at least 1 analysis today)
  const [{ activeToday }] = await db
    .select({ activeToday: count() })
    .from(telegramUsers)
    .where(eq(telegramUsers.lastUsedDate, today))

  // Telegram meals this week
  const [{ weeklyTgMeals }] = await db
    .select({ weeklyTgMeals: count() })
    .from(meals)
    .where(
      and(
        eq(meals.source, 'telegram'),
        gte(meals.loggedAt, new Date(`${weekAgo}T00:00:00Z`)),
      ),
    )

  // Telegram meals this month
  const [{ monthlyTgMeals }] = await db
    .select({ monthlyTgMeals: count() })
    .from(meals)
    .where(
      and(
        eq(meals.source, 'telegram'),
        gte(meals.loggedAt, new Date(`${monthAgo}T00:00:00Z`)),
      ),
    )

  // Top 20 telegram users by daily_count desc
  const topUsers = await db
    .select({
      telegramId:   telegramUsers.telegramId,
      username:     telegramUsers.username,
      firstName:    telegramUsers.firstName,
      dailyCount:   telegramUsers.dailyCount,
      lastUsedDate: telegramUsers.lastUsedDate,
      linkedTo:     users.username,
      userId:       telegramUsers.userId,
      createdAt:    telegramUsers.createdAt,
    })
    .from(telegramUsers)
    .leftJoin(users, eq(telegramUsers.userId, users.id))
    .orderBy(desc(telegramUsers.lastUsedDate), desc(telegramUsers.dailyCount))
    .limit(50)

  return NextResponse.json({
    summary: {
      totalTgUsers,
      linkedCount,
      unlinkedCount: totalTgUsers - linkedCount,
      activeToday,
      weeklyTgMeals,
      monthlyTgMeals,
    },
    users: topUsers.map(u => ({
      telegramId:   String(u.telegramId),
      username:     u.username,
      firstName:    u.firstName,
      dailyCount:   u.dailyCount,
      lastUsedDate: u.lastUsedDate,
      linkedTo:     u.linkedTo ?? null,
      userId:       u.userId ?? null,
      createdAt:    u.createdAt,
    })),
  })
}
