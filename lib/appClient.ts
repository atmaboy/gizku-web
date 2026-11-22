import { db } from '@/lib/db'
import { userAppClients } from '@/drizzle/schema'
import { sql } from 'drizzle-orm'

/**
 * Identitas app mobile yang dilaporkan lewat header di setiap request:
 *   X-App-Platform: android | ios
 *   X-App-Version:  semver binary terpasang (mis. 1.2.1)
 *   X-App-Build:    versionCode / buildNumber (opsional)
 * Request tanpa header (app lama, web, Telegram) tidak dicatat.
 */
export type AppClient = { platform: 'android' | 'ios'; version: string; build: string | null }

const VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,4}(?:[-+][0-9A-Za-z.-]{1,32})?$/
const BUILD_RE = /^[0-9A-Za-z.-]{1,32}$/

/** Header dikontrol klien: validasi ketat supaya tabel tidak terisi sampah. */
export function parseAppClient(headers: Pick<Headers, 'get'>): AppClient | null {
  const platform = headers.get('x-app-platform')?.trim().toLowerCase()
  if (platform !== 'android' && platform !== 'ios') return null
  const version = headers.get('x-app-version')?.trim()
  if (!version || !VERSION_RE.test(version)) return null
  const rawBuild = headers.get('x-app-build')?.trim()
  return { platform, version, build: rawBuild && BUILD_RE.test(rawBuild) ? rawBuild : null }
}

/** Tulis ke DB paling banyak sekali per 5 menit per (user, platform, versi); selebihnya no-op di sisi SQL. */
export const APP_CLIENT_TOUCH_INTERVAL = '5 minutes'

/**
 * Catat bahwa user terlihat memakai app versi ini sekarang. Tidak pernah melempar error:
 * info tambahan tidak boleh menggagalkan request utama (mis. migrasi 021 belum dijalankan).
 */
export async function recordAppClient(userId: string, client: AppClient | null): Promise<void> {
  if (!client) return
  try {
    await db.insert(userAppClients)
      .values({ userId, platform: client.platform, appVersion: client.version, appBuild: client.build })
      .onConflictDoUpdate({
        target: [userAppClients.userId, userAppClients.platform, userAppClients.appVersion],
        set: { appBuild: client.build, lastSeenAt: new Date() },
        setWhere: sql`${userAppClients.lastSeenAt} < now() - interval '5 minutes'`,
      })
  } catch (e) {
    console.error('[appClient]', e)
  }
}
