import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users, meals, dailyUsage } from '@/drizzle/schema'
import { verifyToken, extractToken, hashPassword } from '@/lib/auth'
import { getGlobalLimit } from '@/lib/admin'
import { ok, err, setCors, todayISO } from '@/lib/utils'
import { eq, and, count, sum } from 'drizzle-orm'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

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

export async function GET(req: NextRequest) {
  const user = await authUser(req)
  if (!user) return err('Token tidak valid', 401)

  const action = req.nextUrl.searchParams.get('action') || 'profile'

  if (action === 'profile') {
    const [userData] = await db.select({
      id: users.id, username: users.username,
      email: users.email,
      dailyLimit: users.dailyLimit, createdAt: users.createdAt,
      // Telegram link fields — required by Settings page to detect linked state
      telegramId: users.telegramId,
      telegramUsername: users.telegramUsername,
      telegramFirstName: users.telegramFirstName,
    }).from(users).where(eq(users.id, user.userId)).limit(1)

    if (!userData) return err('User tidak ditemukan', 404)

    const globalLimit = await getGlobalLimit()
    const limit       = userData.dailyLimit ?? globalLimit
    const today       = todayISO()

    const [usageRow] = await db.select().from(dailyUsage)
      .where(and(eq(dailyUsage.userId, user.userId), eq(dailyUsage.date, today))).limit(1)

    const [mealStats] = await db.select({
      total: count(), totalCals: sum(meals.totalCalories),
    }).from(meals).where(eq(meals.userId, user.userId))

    return ok({
      user: {
        ...userData,
        dailyLimit: limit,
        todayUsage: usageRow?.count ?? 0,
        remaining:  Math.max(0, limit - (usageRow?.count ?? 0)),
        totalMeals: mealStats.total,
        totalCalories: mealStats.totalCals ?? 0,
      },
    })
  }

  return err('Action tidak dikenal')
}

export async function POST(req: NextRequest) {
  const user = await authUser(req)
  if (!user) return err('Token tidak valid', 401)

  const action = req.nextUrl.searchParams.get('action')

  if (action === 'change_password') {
    const { oldPassword, newPassword } = await req.json()
    if (!oldPassword || !newPassword) return err('Password lama dan baru diperlukan')
    if (newPassword.length < 6) return err('Password baru minimal 6 karakter')

    const [userData] = await db.select({ passwordHash: users.passwordHash })
      .from(users).where(eq(users.id, user.userId)).limit(1)
    if (!userData) return err('User tidak ditemukan', 404)

    const oldHash = await hashPassword(oldPassword)
    if (oldHash !== userData.passwordHash) return err('Password lama salah', 401)

    const newHash = await hashPassword(newPassword)
    await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, user.userId))

    return ok({ message: 'Password berhasil diubah' })
  }

  if (action === 'update_email') {
    const { email } = await req.json()
    if (!email) return err('Email diperlukan')
    const trimmedEmail = email.trim().toLowerCase()
    if (!isValidEmail(trimmedEmail)) return err('Format email tidak valid')

    const [existing] = await db.select({ id: users.id })
      .from(users).where(eq(users.email, trimmedEmail)).limit(1)
    if (existing && existing.id !== user.userId) return err('Email sudah digunakan', 409)

    await db.update(users).set({ email: trimmedEmail, updatedAt: new Date() })
      .where(eq(users.id, user.userId))

    return ok({ message: 'Email berhasil disimpan' })
  }

  return err('Action tidak dikenal')
}
