/**
 * GET /api/admin/telegram/stats
 * Returns Telegram bot usage statistics for the admin dashboard.
 * Requires valid admin session (reads JWT from cookie `nl_admin_token` or Authorization header).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { telegramUsers, meals, users } from '@/drizzle/schema'
import { desc, eq, count, and, gte, isNotNull } from 'drizzle-orm'
import { verifyToken } from '@/lib/auth'

async function requireAdmin(req: NextRequest) {
  // Admin login stores token in nl_admin_token (set by POST /api/admin?action=login)
  const cookieToken =
    req.cookies.get('nl_admin_token')?.value ??
    req.cookies.get('admin_token')?.value ?? // legacy fallback
    ''

  const authHeader = req.headers.get('authorization') ?? ''
  const raw = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken
  if (!raw) return null

  try {
    const payload = await verifyToken(raw)
    // Admin token has role: 'admin' (set by signAdminToken in lib/auth.ts)
    if (payload?.role !== 'admin') return null
    return payload
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const today    = new Date().toISOString().slice(0, 10)
    const weekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // Total telegram users — guard: table may not exist yet if migration not run
    let totalTgUsers = 0
    let linkedCount  = 0
    let activeToday  = 0
    let topUsers: Array<{
      telegramId: bigint | number
      username: string | null
      firstName: string | null
      dailyCount: number | null
      lastUsedDate: string | null
      linkedTo: string | null
      userId: string | null
      createdAt: Date | null
    }> = []

    try {
      ;[{ totalTgUsers }] = await db
        .select({ totalTgUsers: count() })
        .from(telegramUsers)

      ;[{ linkedCount }] = await db
        .select({ linkedCount: count() })
        .from(telegramUsers)
        .where(isNotNull(telegramUsers.userId))

      ;[{ activeToday }] = await db
        .select({ activeToday: count() })
        .from(telegramUsers)
        .where(eq(telegramUsers.lastUsedDate, today))

      topUsers = await db
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
    } catch (tableErr) {
      // telegramUsers table may not exist yet — return empty data gracefully
      console.warn('[telegram/stats] telegramUsers table not ready:', tableErr)
    }

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
        // dailyCount is lazily reset in the bot on the user's *next* message
        // (see getOrCreateTelegramUser in lib/bot.ts), so a stale row still
        // holds the count from lastUsedDate, not today. Mirror that same
        // reset rule here so "Analisa Hari Ini" doesn't show stale counts.
        dailyCount:   u.lastUsedDate === today ? (u.dailyCount ?? 0) : 0,
        lastUsedDate: u.lastUsedDate,
        linkedTo:     u.linkedTo ?? null,
        userId:       u.userId ?? null,
        createdAt:    u.createdAt,
      })),
    })
  } catch (e) {
    console.error('[telegram/stats] error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
