// app/api/admin/migrate/route.ts
import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import {
  adminConfig, users, meals, reports, dailyUsage, maintenanceConfig,
} from '@/drizzle/schema'
import { verifyToken, extractToken } from '@/lib/auth'
import { setCors } from '@/lib/utils'
import { eq } from 'drizzle-orm'

function jsonResp(data: unknown, status = 200) {
  const h = new Headers()
  setCors(h)
  h.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(data), { status, headers: h })
}

function stableUuid(seed: string) {
  const hex = createHash('sha256').update(seed).digest('hex')
  const b = (parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${b.toString(16).padStart(2, '0')}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join('-')
}

function toNum(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function toDate(v: unknown): Date {
  if (!v) return new Date()
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function parseMaybeJson(v: unknown): unknown {
  if (typeof v !== 'string') return v
  const s = v.trim()
  if (!s) return s
  try { return JSON.parse(s) } catch { return v }
}

async function fetchKvStore() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum di-set')

  const res = await fetch(
    `${url}/rest/v1/kv_store?select=key,value,updated_at&limit=10000`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Prefer': 'count=none',
      },
      cache: 'no-store',
    },
  )
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Gagal membaca kv_store: ${res.status} ${txt}`)
  }
  const data = await res.json() as unknown
  return Array.isArray(data) ? data as { key: string; value: unknown; updated_at: string | null }[] : []
}

async function authAdmin(req: NextRequest) {
  const bearer = extractToken(req.headers.get('Authorization'))
  const cookieToken = req.cookies.get('nl_admin_token')?.value ?? null
  const token = bearer || cookieToken
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    return payload?.role === 'admin' ? payload : null
  } catch { return null }
}

export async function OPTIONS() {
  const h = new Headers()
  setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function POST(req: NextRequest) {
  try {
    const admin = await authAdmin(req)
    if (!admin) return jsonResp({ error: 'Unauthorized' }, 401)

    const rows = await fetchKvStore()
    const log: string[] = []

    type LegacyUser = {
      id: string
      username: string
      passwordHash?: string
      dailyLimit?: number | null
      isActive?: boolean
      createdAt?: string
    }

    type MealIndex = {
      id: string
      timestamp: string
      dishNames: string[]
      totalCalories: number
      totalProtein: number
      totalCarbs: number
      totalFat: number
      healthScore?: number
    }

    type MealData = {
      id: string
      timestamp: string
      imageData?: string
      analysis?: unknown
      dishNames?: string[]
      totalCalories?: number
      totalProtein?: number
      totalCarbs?: number
      totalFat?: number
    }

    type ReportData = {
      id: string
      userId: string
      username: string
      message: string
      timestamp?: string
      status?: string
    }

    const legacyUsersById = new Map<string, LegacyUser>()
    const mealIndexByUserId = new Map<string, MealIndex[]>()
    const mealDataById = new Map<string, MealData>()
    const usageMap = new Map<string, number>()
    const legacyReports: ReportData[] = []
    let   legacyConfig: Record<string, unknown> = {}

    for (const row of rows) {
      const key   = row.key ?? ''
      const value = parseMaybeJson(row.value)

      if (key === 'users/index') {
        const arr = Array.isArray(value) ? value as LegacyUser[] : []
        for (const u of arr) {
          if (u?.id && u?.username) {
            legacyUsersById.set(u.id, {
              id: u.id,
              username: String(u.username).toLowerCase().trim(),
              createdAt: u.createdAt,
            })
          }
        }
        continue
      }

      if (key.startsWith('users/u_')) {
        const obj = value as Record<string, unknown>
        if (obj?.id && obj?.username) {
          const prev = legacyUsersById.get(obj.id as string) ?? {} as LegacyUser
          legacyUsersById.set(obj.id as string, {
            ...prev,
            id: obj.id as string,
            username: String(obj.username).toLowerCase().trim(),
            passwordHash: (obj.passwordHash as string) ?? prev.passwordHash,
            dailyLimit: (obj.dailyLimit as number) ?? prev.dailyLimit ?? null,
            isActive: (obj.isActive as boolean) ?? prev.isActive ?? true,
            createdAt: (obj.createdAt as string) ?? prev.createdAt,
          })
        }
        continue
      }

      if (key.startsWith('meals/index/')) {
        const legacyUserId = key.replace('meals/index/', '')
        const arr = Array.isArray(value) ? value as MealIndex[] : []
        const existing = mealIndexByUserId.get(legacyUserId) ?? []
        const ids = new Set(existing.map((m: MealIndex) => m.id))
        for (const m of arr) {
          if (m?.id && !ids.has(m.id)) {
            existing.push(m)
            ids.add(m.id)
          }
        }
        mealIndexByUserId.set(legacyUserId, existing)
        continue
      }

      if (key.startsWith('meals/data/')) {
        const parts  = key.split('/')
        const mealId = parts[3]
        if (mealId) {
          const obj = value as MealData
          mealDataById.set(mealId, obj)
        }
        continue
      }

      if (key.startsWith('usage/')) {
        const parts = key.split('/')
        if (parts.length === 3) {
          const [, uid, date] = parts
          const usageCount = typeof value === 'number'
            ? value
            : parseInt(String(parseMaybeJson(row.value) ?? '0'), 10)
          usageMap.set(`${uid}/${date}`, Number.isNaN(usageCount) ? 0 : usageCount)
        }
        continue
      }

      if (key === 'reports/index') {
        continue
      }

      if (key.startsWith('reports/r_')) {
        const obj = value as Record<string, unknown>
        if (obj?.message || obj?.preview) {
          legacyReports.push({
            id:       (obj.id as string) ?? key.replace('reports/', ''),
            userId:   (obj.userId as string) ?? '',
            username: (obj.username as string) ?? '',
            message:  (obj.message as string) ?? (obj.preview as string) ?? '',
            timestamp: (obj.timestamp as string) ?? (obj.createdAt as string),
            status:   (obj.status as string) ?? 'open',
          })
        }
        continue
      }

      if (key === 'config/global') {
        legacyConfig = (value as Record<string, unknown>) ?? {}
        continue
      }
    }

    log.push(`Rows dibaca dari kv_store: ${rows.length}`)
    log.push(`Legacy users ditemukan: ${legacyUsersById.size}`)
    log.push(`Meal index entries: ${Array.from(mealIndexByUserId.values()).flat().length}`)
    log.push(`Meal data entries: ${mealDataById.size}`)
    log.push(`Usage entries: ${usageMap.size}`)
    log.push(`Reports: ${legacyReports.length}`)

    const newUuidByLegacyId = new Map<string, string>()
    let migratedUsers = 0
    let skippedUsers  = 0

    for (const user of Array.from(legacyUsersById.values())) {
      if (!user.username) { skippedUsers++; continue }

      const newUuid = stableUuid(`user:${user.username}`)
      newUuidByLegacyId.set(user.id, newUuid)

      const passwordHash = user.passwordHash ?? ''

      await db.insert(users).values({
        id:           newUuid,
        username:     user.username,
        passwordHash: passwordHash || await (async () => {
          const { hashPassword } = await import('@/lib/auth')
          return hashPassword(`legacy-${user.username}`)
        })(),
        dailyLimit:   user.dailyLimit ?? null,
        isActive:     user.isActive ?? true,
        createdAt:    toDate(user.createdAt),
        updatedAt:    toDate(user.createdAt),
      }).onConflictDoUpdate({
        target: users.username,
        set: {
          passwordHash: passwordHash || undefined,
          dailyLimit:   user.dailyLimit ?? null,
          isActive:     user.isActive ?? true,
          updatedAt:    new Date(),
        },
      })
      migratedUsers++
    }
    log.push(`Users dimigrasikan: ${migratedUsers}, dilewati: ${skippedUsers}`)

    let migratedMeals = 0
    let skippedMeals  = 0

    for (const [legacyUserId, mealList] of Array.from(mealIndexByUserId.entries())) {
      const newUserId = newUuidByLegacyId.get(legacyUserId)
      if (!newUserId) {
        log.push(`⚠ legacyUserId ${legacyUserId} tidak ditemukan di users → ${mealList.length} meal dilewati`)
        skippedMeals += mealList.length
        continue
      }

      for (const mealSummary of mealList) {
        const detail     = mealDataById.get(mealSummary.id)
        const loggedAt   = toDate(mealSummary.timestamp)
        const mealUuid   = stableUuid(`meal:${legacyUserId}:${mealSummary.id}`)

        const dishNames = Array.isArray(mealSummary.dishNames)
          ? mealSummary.dishNames.map((d: string) => String(d).trim()).filter(Boolean)
          : []

        let rawAnalysis: unknown = null
        if (detail) {
          const { imageData: _drop, ...rest } = detail
          void _drop
          rawAnalysis = Object.keys(rest).length > 0 ? rest : null
        }

        await db.insert(meals).values({
          id:            mealUuid,
          userId:        newUserId,
          dishNames,
          totalCalories: toNum(mealSummary.totalCalories),
          totalProtein:  String(toNum(mealSummary.totalProtein)),
          totalCarbs:    String(toNum(mealSummary.totalCarbs)),
          totalFat:      String(toNum(mealSummary.totalFat)),
          imageUrl:      null,
          rawAnalysis,
          loggedAt,
          scannedAt:     loggedAt,
        }).onConflictDoNothing({ target: meals.id })

        migratedMeals++
      }
    }
    log.push(`Meals dimigrasikan: ${migratedMeals}, dilewati: ${skippedMeals}`)

    let migratedUsage = 0

    for (const [key, usageCount] of Array.from(usageMap.entries())) {
      const [legacyUserId, date] = key.split('/')
      const newUserId = newUuidByLegacyId.get(legacyUserId)
      if (!newUserId || !date) continue

      await db.insert(dailyUsage).values({
        userId: newUserId,
        date,
        count: usageCount,
      }).onConflictDoUpdate({
        target: [dailyUsage.userId, dailyUsage.date],
        set: { count: usageCount },
      })
      migratedUsage++
    }
    log.push(`Daily usage dimigrasikan: ${migratedUsage}`)

    let migratedReports = 0

    for (const rep of legacyReports) {
      if (!rep.message?.trim()) continue
      const reportUuid = stableUuid(`report:${rep.id}`)
      const newUserId  = rep.userId ? (newUuidByLegacyId.get(rep.userId) ?? null) : null
      const createdAt  = toDate(rep.timestamp)

      await db.insert(reports).values({
        id:        reportUuid,
        userId:    newUserId,
        username:  rep.username || null,
        message:   rep.message.trim(),
        status:    rep.status || 'open',
        createdAt,
        updatedAt: createdAt,
      }).onConflictDoNothing({ target: reports.id })
      migratedReports++
    }
    log.push(`Reports dimigrasikan: ${migratedReports}`)

    let migratedConfig = 0
    const cfg = legacyConfig

    if (cfg.dailyLimit !== undefined) {
      await db.insert(adminConfig).values({
        key: 'default_daily_limit', value: String(cfg.dailyLimit), updatedAt: new Date(),
      }).onConflictDoUpdate({ target: adminConfig.key, set: { value: String(cfg.dailyLimit), updatedAt: new Date() } })
      migratedConfig++
    }
    if (typeof cfg.apiKey === 'string' && cfg.apiKey) {
      await db.insert(adminConfig).values({
        key: 'anthropic_api_key', value: cfg.apiKey, updatedAt: new Date(),
      }).onConflictDoUpdate({ target: adminConfig.key, set: { value: cfg.apiKey, updatedAt: new Date() } })
      migratedConfig++
    }
    if (typeof cfg.adminPasswordHash === 'string' && cfg.adminPasswordHash) {
      await db.insert(adminConfig).values({
        key: 'admin_password_hash', value: cfg.adminPasswordHash, updatedAt: new Date(),
      }).onConflictDoUpdate({ target: adminConfig.key, set: { value: cfg.adminPasswordHash, updatedAt: new Date() } })
      migratedConfig++
    }
    if (cfg.maintenance && typeof cfg.maintenance === 'object') {
      const m = cfg.maintenance as Record<string, unknown>
      await db.insert(maintenanceConfig).values({
        enabled:     (m.enabled as boolean) ?? false,
        title:       (m.title as string) ?? 'NutriLog sedang dalam perbaikan',
        description: (m.description as string) ?? 'Kami sedang melakukan peningkatan sistem.',
        updatedAt:   toDate(m.updatedAt),
      }).onConflictDoUpdate({
        target: maintenanceConfig.id,
        set: {
          enabled:     (m.enabled as boolean) ?? false,
          title:       m.title as string,
          description: m.description as string,
          updatedAt:   toDate(m.updatedAt),
        },
      })
      migratedConfig++
    }
    log.push(`Config dimigrasikan: ${migratedConfig}`)

    return jsonResp({
      ok: true,
      message: 'Migrasi selesai',
      migrated: {
        users:      migratedUsers,
        meals:      migratedMeals,
        dailyUsage: migratedUsage,
        reports:    migratedReports,
        config:     migratedConfig,
      },
      skipped: { users: skippedUsers, meals: skippedMeals },
      log,
    })
  } catch (e) {
    console.error('[POST /api/admin/migrate] error:', e)
    return jsonResp({
      error: e instanceof Error ? e.message : 'Internal server error',
    }, 500)
  }
}
