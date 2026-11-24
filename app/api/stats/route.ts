/**
 * Statistik nutrisi & target (app mobile). Semua batas hari memakai WIB dan hanya meal yang belum dihapus (liveMeal).
 *   GET ?action=config
 *   GET ?action=summary&period=daily|weekly|monthly&date=YYYY-MM-DD
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users, meals } from '@/drizzle/schema'
import { liveMeal } from '@/lib/mealQuery'
import { verifyToken, extractToken } from '@/lib/auth'
import { ok, err, setCors, todayISO, wibDayStart, wibDayEnd } from '@/lib/utils'
import { and, eq, gte, lte, asc } from 'drizzle-orm'
import { getGoalsConfig } from '@/lib/goalsConfig.server'
import { FEATURE_KEYS, featureAccess, type FeatureKey } from '@/lib/goalsConfig'
import { isPremiumNow, resolveGoal } from '@/lib/goals.server'
import { burnFor, isValidISODate } from '@/lib/akg'
import { bucketByWibDay, buildMonthly, buildWeekly, monthlyFetchRange, weekStart } from '@/lib/statsCalc'
import { addDaysISO } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

async function authUser(req: NextRequest) {
  const token = extractToken(req.headers.get('Authorization'))
  if (!token) return null
  try {
    const p = await verifyToken(token)
    return p.userId ? (p as { userId: string; username: string; role: string }) : null
  } catch { return null }
}

const PERIOD_FEATURE: Record<string, FeatureKey> = { daily: 'daily', weekly: 'weekly', monthly: 'monthly' }

/** "HH:mm" WIB dari sebuah instan. */
const wibTime = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(11, 16)

export async function GET(req: NextRequest) {
  const user = await authUser(req)
  if (!user) return err('Token tidak valid', 401)

  const action = req.nextUrl.searchParams.get('action') || 'config'
  const cfg = await getGoalsConfig()

  const [u] = await db.select({
    premiumUntil: users.premiumUntil, gender: users.gender, birthDate: users.birthDate,
  }).from(users).where(eq(users.id, user.userId)).limit(1)
  if (!u) return err('User tidak ditemukan', 404)
  const isPremium = isPremiumNow(u.premiumUntil)

  if (action === 'config') {
    const features = Object.fromEntries(FEATURE_KEYS.map(k => [k, featureAccess(cfg, k, isPremium)]))
    const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'id'
    return ok({
      enabled: cfg.enabled,
      allowEdit: cfg.allowEdit,
      isPremium,
      features,
      target: cfg.target,
      macroDefault: cfg.macroDefault,
      premiumSale: { mode: cfg.premiumSale.mode, copy: cfg.premiumSale.copy[lang] },
      recCountPerTab: cfg.recCountPerTab,
    })
  }

  if (action === 'summary') {
    if (!cfg.enabled) return err('Fitur tidak aktif', 404, 'feature_disabled')

    const period = req.nextUrl.searchParams.get('period') || 'daily'
    const key = PERIOD_FEATURE[period]
    if (!key) return err('Periode tidak valid')
    const access = featureAccess(cfg, key, isPremium)
    if (!access.on) return err('Fitur tidak aktif', 404, 'feature_disabled')
    if (access.locked) return err('Fitur ini hanya untuk Premium', 403, 'premium_required')

    const today = todayISO()
    const date = req.nextUrl.searchParams.get('date') || today
    if (!isValidISODate(date)) return err('Tanggal tidak valid')

    const goal = await resolveGoal(user.userId, cfg)
    const burn = burnFor(u.gender, u.birthDate, today)
    const tol = cfg.target.tolerancePct

    const rows = (from: string, to: string) => db.select({
      loggedAt: meals.loggedAt, kcal: meals.totalCalories, dishNames: meals.dishNames,
      protein: meals.totalProtein, carbs: meals.totalCarbs, fat: meals.totalFat,
    }).from(meals)
      .where(and(eq(meals.userId, user.userId), liveMeal, gte(meals.loggedAt, wibDayStart(from)), lte(meals.loggedAt, wibDayEnd(to))))
      .orderBy(asc(meals.loggedAt))

    if (period === 'daily') {
      const list = await rows(date, date)
      const sum = (f: 'protein' | 'carbs' | 'fat') => Math.round(list.reduce((s, m) => s + Number(m[f]), 0))
      return ok({
        period, date, today, goal, burn,
        totalKcal: list.reduce((s, m) => s + m.kcal, 0),
        macros: { p: sum('protein'), c: sum('carbs'), f: sum('fat') },
        meals: list.map(m => ({ time: wibTime(m.loggedAt), name: m.dishNames.join(', '), kcal: m.kcal })),
      })
    }

    if (period === 'weekly') {
      const start = weekStart(date)
      const byDay = bucketByWibDay((await rows(start, addDaysISO(start, 6))).map(r => ({ loggedAt: r.loggedAt, kcal: r.kcal })))
      return ok({ period, date, today, goal, burn, ...buildWeekly(date, byDay, goal.kcal, tol, today) })
    }

    const range = monthlyFetchRange(date)
    const byDay = bucketByWibDay((await rows(range.from, range.to)).map(r => ({ loggedAt: r.loggedAt, kcal: r.kcal })))
    return ok({ period, date, today, goal, burn, ...buildMonthly(date, byDay, goal.kcal, tol, today) })
  }

  return err('Action tidak dikenal')
}
