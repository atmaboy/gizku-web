import { db } from '@/lib/db'
import { pushTokens, meals, userAppClients, userDevices } from '@/drizzle/schema'
import { and, inArray, max, desc } from 'drizzle-orm'

export type DeviceRow = {
  /** Token push; dipakai untuk menautkan ke perangkat. */
  token?: string
  platform: string
  provider: string
  language: string
  isActive: boolean
  createdAt: Date
  lastSeenAt: Date
}

/** Versi app yang dilaporkan app mobile lewat header X-App-* (lib/appClient.ts); terbaru dulu. */
export type AppClientRow = {
  platform: 'android' | 'ios'
  appVersion: string
  appBuild: string | null
  firstSeenAt: Date
  lastSeenAt: Date
}

/** Satu perangkat fisik (ID instalasi dari app): versi app terbaru + semua token push yang pernah dipakai di sana. */
export type DeviceGroup = {
  deviceId: string
  platform: 'android' | 'ios'
  appVersion: string
  appBuild: string | null
  firstSeenAt: Date
  lastSeenAt: Date
  tokens: DeviceRow[]
}

export type UserDeviceInfo = {
  /** Semua push token (mentah). Kelompok per perangkat ada di deviceGroups + legacyTokens. */
  devices: DeviceRow[]
  deviceGroups: DeviceGroup[]
  /** Token tanpa ID perangkat (app lama atau token yang belum didaftarkan ulang). */
  legacyTokens: DeviceRow[]
  /** Satu baris per (platform, versi app) yang pernah dipakai user, terakhir terlihat paling atas. */
  appClients: AppClientRow[]
  /** Platform app dari riwayat makanan (meals.source app-android / app-ios), untuk user tanpa push token. */
  mealPlatforms: ('android' | 'ios')[]
  lastMealAt: Date | null
}

export const emptyInfo = (): UserDeviceInfo => ({ devices: [], deviceGroups: [], legacyTokens: [], appClients: [], mealPlatforms: [], lastMealAt: null })

/** Info perangkat + platform + aktivitas makanan terakhir untuk sekumpulan user (satu query per sumber). */
export async function getDeviceInfo(userIds: string[]): Promise<Map<string, UserDeviceInfo>> {
  try { return await loadDeviceInfo(userIds) } catch (e) {
    // Info tambahan saja — jangan sampai halaman user error (mis. migrasi 020 belum jalan).
    console.error('[userDevices]', e)
    return new Map(userIds.map(id => [id, emptyInfo()]))
  }
}

type DeviceGroupSource = {
  userId: string; deviceId: string; platform: string; appVersion: string; appBuild: string | null; firstSeenAt: Date; lastSeenAt: Date
}

/**
 * Kelompokkan token push per perangkat. Token yang device id-nya tidak punya baris perangkat (atau tanpa device id)
 * masuk legacyTokens. Perangkat tanpa token (push dimatikan) tetap tampil dengan tokens kosong.
 */
export function groupDevices(
  devices: Omit<DeviceGroupSource, 'userId'>[],
  tokens: (DeviceRow & { deviceId: string | null })[],
): { groups: DeviceGroup[]; legacyTokens: DeviceRow[] } {
  const groups: DeviceGroup[] = devices
    .map(d => ({
      deviceId: d.deviceId, platform: d.platform === 'ios' ? 'ios' as const : 'android' as const,
      appVersion: d.appVersion, appBuild: d.appBuild, firstSeenAt: d.firstSeenAt, lastSeenAt: d.lastSeenAt,
      tokens: [] as DeviceRow[],
    }))
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
  const byId = new Map(groups.map(g => [g.deviceId, g]))
  const legacyTokens: DeviceRow[] = []
  for (const { deviceId, ...row } of tokens) {
    const g = deviceId ? byId.get(deviceId) : undefined
    if (g) g.tokens.push(row)
    else legacyTokens.push(row)
  }
  return { groups, legacyTokens }
}

/** Token aktif terbaru di perangkat ini (jalur push + bahasa), atau null bila tidak ada token aktif. */
export function activeToken(g: Pick<DeviceGroup, 'tokens'>): DeviceRow | null {
  const active = g.tokens.filter(t => t.isActive).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
  return active[0] ?? null
}

async function loadDeviceInfo(userIds: string[]): Promise<Map<string, UserDeviceInfo>> {
  const out = new Map<string, UserDeviceInfo>(userIds.map(id => [id, emptyInfo()]))
  if (userIds.length === 0) return out

  const [tokens, sources, last, clients, tokenDevices, devices] = await Promise.all([
    db.select({
      userId: pushTokens.userId, token: pushTokens.token, platform: pushTokens.platform, provider: pushTokens.provider, language: pushTokens.language,
      isActive: pushTokens.isActive, createdAt: pushTokens.createdAt, lastSeenAt: pushTokens.lastSeenAt,
    }).from(pushTokens).where(inArray(pushTokens.userId, userIds)).orderBy(desc(pushTokens.lastSeenAt)),
    db.select({ userId: meals.userId, source: meals.source }).from(meals)
      .where(and(inArray(meals.userId, userIds), inArray(meals.source, ['app-android', 'app-ios'])))
      .groupBy(meals.userId, meals.source),
    db.select({ userId: meals.userId, at: max(meals.loggedAt) }).from(meals)
      .where(inArray(meals.userId, userIds)).groupBy(meals.userId),
    db.select({
      userId: userAppClients.userId, platform: userAppClients.platform, appVersion: userAppClients.appVersion,
      appBuild: userAppClients.appBuild, firstSeenAt: userAppClients.firstSeenAt, lastSeenAt: userAppClients.lastSeenAt,
    }).from(userAppClients).where(inArray(userAppClients.userId, userIds)).orderBy(desc(userAppClients.lastSeenAt))
      // Migrasi 021 belum jalan: versi app saja yang kosong, platform/bahasa/aktivitas tetap tampil.
      .catch(e => { console.error('[userDevices] user_app_clients', e); return [] as AppClientRow[] & { userId: string }[] }),
    // Migrasi 023 belum jalan: pengelompokan per perangkat saja yang kosong.
    db.select({ userId: pushTokens.userId, token: pushTokens.token, deviceId: pushTokens.deviceId })
      .from(pushTokens).where(inArray(pushTokens.userId, userIds))
      .catch(e => { console.error('[userDevices] push_tokens.device_id', e); return [] as { userId: string; token: string; deviceId: string | null }[] }),
    db.select({
      userId: userDevices.userId, deviceId: userDevices.deviceId, platform: userDevices.platform, appVersion: userDevices.appVersion,
      appBuild: userDevices.appBuild, firstSeenAt: userDevices.firstSeenAt, lastSeenAt: userDevices.lastSeenAt,
    }).from(userDevices).where(inArray(userDevices.userId, userIds)).orderBy(desc(userDevices.lastSeenAt))
      .catch(e => { console.error('[userDevices] user_devices', e); return [] as DeviceGroupSource[] }),
  ])

  for (const t of tokens) out.get(t.userId)?.devices.push(t)
  for (const s of sources) {
    const info = out.get(s.userId)
    const p = s.source === 'app-ios' ? 'ios' : 'android'
    if (info && !info.mealPlatforms.includes(p)) info.mealPlatforms.push(p)
  }
  for (const c of clients) {
    out.get(c.userId)?.appClients.push({
      platform: c.platform === 'ios' ? 'ios' : 'android', appVersion: c.appVersion, appBuild: c.appBuild,
      firstSeenAt: c.firstSeenAt, lastSeenAt: c.lastSeenAt,
    })
  }
  const deviceOfToken = new Map(tokenDevices.map(t => [t.token, t.deviceId]))
  for (const [userId, info] of out) {
    const grouped = groupDevices(
      devices.filter(d => d.userId === userId),
      info.devices.map(d => ({ ...d, deviceId: d.token ? deviceOfToken.get(d.token) ?? null : null })),
    )
    info.deviceGroups = grouped.groups
    info.legacyTokens = grouped.legacyTokens
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

/** Versi app yang terakhir terlihat (laporan app sendiri, jadi presisi); null untuk user yang belum memakai app yang melapor. */
export function latestAppClient(info: UserDeviceInfo): AppClientRow | null {
  return info.appClients.reduce<AppClientRow | null>((best, c) => (!best || c.lastSeenAt > best.lastSeenAt ? c : best), null)
}

/** "Android 1.2.1" / "iOS 1.3.0" */
export function appClientLabel(c: Pick<AppClientRow, 'platform' | 'appVersion'>): string {
  return `${platformName(c.platform)} ${c.appVersion}`
}

/**
 * Aktivitas terakhir = yang terbaru dari: app terlihat (header X-App-* / heartbeat, app 1.2.1+), login,
 * makanan terakhir dicatat, dan token push terakhir terdaftar. Untuk user yang masih di app lama
 * (tanpa heartbeat) tetap pendekatan dari data yang sudah ada: hanya membuka app tidak terhitung.
 */
export function lastActivity(lastLoginAt: Date | null, info: UserDeviceInfo): Date | null {
  const times = [lastLoginAt, info.lastMealAt, latestAppClient(info)?.lastSeenAt, ...info.devices.filter(d => d.isActive).map(d => d.lastSeenAt)]
    .filter((t): t is Date => t instanceof Date)
  return times.length ? new Date(Math.max(...times.map(t => t.getTime()))) : null
}
