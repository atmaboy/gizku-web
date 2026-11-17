import { db } from '@/lib/db'
import { pushTokens, meals } from '@/drizzle/schema'
import { and, inArray, max, desc } from 'drizzle-orm'

export type DeviceRow = {
  platform: string
  provider: string
  language: string
  isActive: boolean
  createdAt: Date
  lastSeenAt: Date
}

export type UserDeviceInfo = {
  devices: DeviceRow[]
  /** Platform app dari riwayat makanan (meals.source app-android / app-ios), untuk user tanpa push token. */
  mealPlatforms: ('android' | 'ios')[]
  lastMealAt: Date | null
}

export const emptyInfo = (): UserDeviceInfo => ({ devices: [], mealPlatforms: [], lastMealAt: null })

/** Info perangkat + platform + aktivitas makanan terakhir untuk sekumpulan user (satu query per sumber). */
export async function getDeviceInfo(userIds: string[]): Promise<Map<string, UserDeviceInfo>> {
  try { return await loadDeviceInfo(userIds) } catch (e) {
    // Info tambahan saja — jangan sampai halaman user error (mis. migrasi 020 belum jalan).
    console.error('[userDevices]', e)
    return new Map(userIds.map(id => [id, emptyInfo()]))
  }
}

async function loadDeviceInfo(userIds: string[]): Promise<Map<string, UserDeviceInfo>> {
  const out = new Map<string, UserDeviceInfo>(userIds.map(id => [id, emptyInfo()]))
  if (userIds.length === 0) return out

  const [tokens, sources, last] = await Promise.all([
    db.select({
      userId: pushTokens.userId, platform: pushTokens.platform, provider: pushTokens.provider, language: pushTokens.language,
      isActive: pushTokens.isActive, createdAt: pushTokens.createdAt, lastSeenAt: pushTokens.lastSeenAt,
    }).from(pushTokens).where(inArray(pushTokens.userId, userIds)).orderBy(desc(pushTokens.lastSeenAt)),
    db.select({ userId: meals.userId, source: meals.source }).from(meals)
      .where(and(inArray(meals.userId, userIds), inArray(meals.source, ['app-android', 'app-ios'])))
      .groupBy(meals.userId, meals.source),
    db.select({ userId: meals.userId, at: max(meals.loggedAt) }).from(meals)
      .where(inArray(meals.userId, userIds)).groupBy(meals.userId),
  ])

  for (const t of tokens) out.get(t.userId)?.devices.push(t)
  for (const s of sources) {
    const info = out.get(s.userId)
    const p = s.source === 'app-ios' ? 'ios' : 'android'
    if (info && !info.mealPlatforms.includes(p)) info.mealPlatforms.push(p)
  }
  for (const l of last) { const info = out.get(l.userId); if (info) info.lastMealAt = l.at }
  return out
}

export const platformName = (p: string) => (p === 'ios' ? 'iOS' : 'Android')

/** "Android · FCM" (app 1.2.0+), "Android · Expo" (app lebih lama), "iOS". */
export function deviceLabel(d: Pick<DeviceRow, 'platform' | 'provider'>): string {
  if (d.platform === 'ios') return 'iOS'
  return d.provider === 'fcm' ? 'Android · FCM' : 'Android · Expo'
}

/** Label platform untuk daftar user: perangkat aktif dulu; kalau tidak ada, dari riwayat makanan (fromHistory). */
export function platformSummary(info: UserDeviceInfo): { labels: string[]; fromHistory: boolean } {
  const active = Array.from(new Set(info.devices.filter(d => d.isActive).map(deviceLabel)))
  if (active.length > 0) return { labels: active, fromHistory: false }
  return { labels: info.mealPlatforms.map(platformName), fromHistory: info.mealPlatforms.length > 0 }
}

/** Bahasa app dari perangkat aktif terbaru; null kalau user tidak punya push token aktif. */
export function primaryLanguage(info: UserDeviceInfo): 'id' | 'en' | null {
  const d = info.devices.find(x => x.isActive)
  return d ? (d.language === 'en' ? 'en' : 'id') : null
}

/**
 * Aktivitas terakhir = yang terbaru dari login, makanan terakhir dicatat, dan token push terakhir terdaftar.
 * Pendekatan dari data yang sudah ada: app tidak melapor tiap dibuka, jadi user yang hanya membuka app
 * (tanpa login baru / catat makanan) tidak terhitung.
 */
export function lastActivity(lastLoginAt: Date | null, info: UserDeviceInfo): Date | null {
  const times = [lastLoginAt, info.lastMealAt, ...info.devices.filter(d => d.isActive).map(d => d.lastSeenAt)]
    .filter((t): t is Date => t instanceof Date)
  return times.length ? new Date(Math.max(...times.map(t => t.getTime()))) : null
}

