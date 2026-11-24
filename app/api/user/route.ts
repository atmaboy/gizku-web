import { NextRequest } from 'next/server'
import { sendVerificationEmailInBackground, resendVerification } from '@/lib/emailVerification'
import { db } from '@/lib/db'
import { users, meals, dailyUsage, telegramUsers, userGoals, premiumInterestEvents } from '@/drizzle/schema'
import { liveMeal } from '@/lib/mealQuery'
import { verifyToken, extractToken, hashPassword } from '@/lib/auth'
import { getGlobalLimit } from '@/lib/admin'
import { isFakeEmail } from '@/lib/emailDomain.server'
import { EMAIL_NOT_ALLOWED_CODE, EMAIL_NOT_ALLOWED_MESSAGE } from '@/lib/emailDomain'
import { ok, err, setCors, todayISO } from '@/lib/utils'
import { eq, and, count, sum, gt, sql } from 'drizzle-orm'
import { getGoalsConfig } from '@/lib/goalsConfig.server'
import { featureAccess } from '@/lib/goalsConfig'
import { resolveGoal, isPremiumNow } from '@/lib/goals.server'
import { validateProfile } from '@/lib/akg'

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
    // Fetch user row
    const [userData] = await db.select({
      id:              users.id,
      username:        users.username,
      email:           users.email,
      dailyLimit:      users.dailyLimit,
      createdAt:       users.createdAt,
      emailVerifiedAt: users.emailVerifiedAt,
      gender:          users.gender,
      birthDate:       users.birthDate,
      statsSeenAt:     users.statsSeenAt,
      premiumUntil:    users.premiumUntil,
    }).from(users).where(eq(users.id, user.userId)).limit(1)

    if (!userData) return err('User tidak ditemukan', 404)

    // Fetch linked Telegram account (if any) via the telegram_users relation table
    const [tgRow] = await db.select({
      telegramId:        telegramUsers.telegramId,
      telegramUsername:  telegramUsers.username,
      telegramFirstName: telegramUsers.firstName,
    }).from(telegramUsers)
      .where(eq(telegramUsers.userId, user.userId))
      .limit(1)

    const globalLimit = await getGlobalLimit()
    const limit       = userData.dailyLimit ?? globalLimit
    const today       = todayISO()

    const [usageRow] = await db.select().from(dailyUsage)
      .where(and(eq(dailyUsage.userId, user.userId), eq(dailyUsage.date, today))).limit(1)

    const [mealStats] = await db.select({
      total: count(), totalCals: sum(meals.totalCalories),
    }).from(meals).where(and(eq(meals.userId, user.userId), liveMeal))

    const { premiumUntil, ...publicUser } = userData
    return ok({
      user: {
        ...publicUser,
        isPremium:     isPremiumNow(premiumUntil),
        emailVerified: userData.emailVerifiedAt !== null,
        dailyLimit:    limit,
        todayUsage:    usageRow?.count ?? 0,
        remaining:     Math.max(0, limit - (usageRow?.count ?? 0)),
        totalMeals:    mealStats.total,
        totalCalories: mealStats.totalCals ?? 0,
        // Telegram linked account info — null when not linked
        telegramId:        tgRow?.telegramId?.toString() ?? null,
        telegramUsername:  tgRow?.telegramUsername  ?? null,
        telegramFirstName: tgRow?.telegramFirstName ?? null,
      },
    })
  }

  if (action === 'goals') {
    const cfg = await getGoalsConfig()
    return ok(await resolveGoal(user.userId, cfg))
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
    if (isFakeEmail(trimmedEmail)) return err(EMAIL_NOT_ALLOWED_MESSAGE, 400, EMAIL_NOT_ALLOWED_CODE)

    const [existing] = await db.select({ id: users.id })
      .from(users).where(eq(users.email, trimmedEmail)).limit(1)
    if (existing && existing.id !== user.userId) return err('Email sudah digunakan', 409)

    if (existing?.id === user.userId) {
      // Email tidak benar-benar berubah — jangan reset status verifikasi.
      return ok({ message: 'Email berhasil disimpan' })
    }

    // Email benar-benar berubah → selalu reset status verifikasi & kirim ulang
    // link verifikasi ke email yang baru, terlepas email lama sudah terverifikasi
    // atau belum.
    await db.update(users).set({ email: trimmedEmail, emailVerifiedAt: null, updatedAt: new Date() })
      .where(eq(users.id, user.userId))
    sendVerificationEmailInBackground({ userId: user.userId, email: trimmedEmail, username: user.username })

    return ok({ message: 'Email berhasil disimpan' })
  }

  if (action === 'resend_verification') {
    const result = await resendVerification(user.userId)
    if (!result.ok && result.code === 'already_verified') return err('Email sudah terverifikasi', 409)
    if (!result.ok && result.code === 'rate_limited')
      return err('Batas 3x pengiriman dalam 24 jam tercapai, coba lagi nanti', 429)

    return ok({ message: 'Email verifikasi telah dikirim ulang' })
  }

  if (action === 'update_profile') {
    const body = await req.json().catch(() => null)
    const { gender, birthDate } = body ?? {}
    const msg = validateProfile(gender, birthDate)
    if (msg) return err(msg)
    await db.update(users).set({ gender, birthDate, updatedAt: new Date() }).where(eq(users.id, user.userId))
    return ok({ message: 'Profil berhasil diperbarui', gender, birthDate })
  }

  if (action === 'stats_seen') {
    await db.update(users).set({ statsSeenAt: new Date() })
      .where(and(eq(users.id, user.userId), sql`${users.statsSeenAt} IS NULL`))
    return ok({ ok: true })
  }

  if (action === 'update_goals') {
    const cfg = await getGoalsConfig()
    if (!cfg.allowEdit) return err('Target tidak bisa diubah', 403, 'edit_disabled')
    const body = await req.json().catch(() => null)
    const kcal = body?.kcal
    const { minKcal, maxKcal } = cfg.target
    if (!Number.isInteger(kcal) || kcal < minKcal || kcal > maxKcal) {
      return err(`Isi angka antara ${minKcal.toLocaleString('id-ID')} dan ${maxKcal.toLocaleString('id-ID')} kkal.`)
    }
    const hasMacro = ['protein', 'carbs', 'fat'].some(k => body?.[k] !== undefined && body?.[k] !== null)
    let macro: { proteinG: number | null; carbsG: number | null; fatG: number | null } = { proteinG: null, carbsG: null, fatG: null }
    if (hasMacro) {
      const [u] = await db.select({ premiumUntil: users.premiumUntil }).from(users).where(eq(users.id, user.userId)).limit(1)
      if (featureAccess(cfg, 'macro', isPremiumNow(u?.premiumUntil)).locked || !cfg.features.macro.on) {
        return err('Target makro hanya untuk Premium', 403, 'premium_required')
      }
      const g = [body.protein, body.carbs, body.fat]
      if (!g.every(v => Number.isInteger(v) && v >= 0 && v <= 2000)) return err('Gram makro harus bilangan bulat ≥ 0')
      macro = { proteinG: body.protein, carbsG: body.carbs, fatG: body.fat }
    }
    // Makro tidak dikirim → hapus makro custom lama supaya kembali ke pembagian default dari kalori baru.
    await db.insert(userGoals).values({ userId: user.userId, kcal, ...macro })
      .onConflictDoUpdate({ target: userGoals.userId, set: { kcal, ...macro, updatedAt: new Date() } })
    return ok({ ...(await resolveGoal(user.userId, cfg)) })
  }

  if (action === 'premium_interest') {
    const body = await req.json().catch(() => null)
    const event = body?.event
    const source = body?.source ?? null
    if (!['cta_click', 'remind_yes', 'remind_no', 'macro_tab_locked'].includes(event)) return err('Event tidak valid')
    if (source !== null && !['weekly', 'monthly', 'goal_macro', 'goal'].includes(source)) return err('Source tidak valid')
    // Rate-limit ringan: maks 20 event per user per menit.
    const [{ n }] = await db.select({ n: count() }).from(premiumInterestEvents).where(and(
      eq(premiumInterestEvents.userId, user.userId),
      gt(premiumInterestEvents.createdAt, new Date(Date.now() - 60_000)),
    ))
    if (Number(n) >= 20) return err('Terlalu banyak permintaan, coba lagi nanti', 429)
    await db.insert(premiumInterestEvents).values({ userId: user.userId, event, source })
    return ok({ ok: true })
  }

  return err('Action tidak dikenal')
}
