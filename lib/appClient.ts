import { db } from '@/lib/db'
import { userAppClients, userDevices } from '@/drizzle/schema'
import { sql } from 'drizzle-orm'

/**
 * Identitas app mobile yang dilaporkan lewat header di setiap request:
 *   X-App-Platform: android | ios
 *   X-App-Version:  semver binary terpasang (mis. 1.2.1)
 *   X-App-Build:    versionCode / buildNumber (opsional)
 *   X-Device-Id:    ID instalasi acak (UUID) dari app, untuk mengelompokkan perangkat (opsional)
 * Request tanpa header (app lama, web, Telegram) tidak dicatat.
 */
export type AppClient = { platform: 'android' | 'ios'; version: string; build: string | null; deviceId: string | null }

const VERSION_RE = /^\d{1,4}\.\d{1,4}\.\d{1,4}(?:[-+][0-9A-Za-z.-]{1,32})?$/
const DEVICE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BUILD_RE = /^[0-9A-Za-z.-]{1,32}$/

/** Header dikontrol klien: validasi ketat supaya tabel tidak terisi sampah. */
export function parseAppClient(headers: Pick<Headers, 'get'>): AppClient | null {
  const platform = headers.get('x-app-platform')?.trim().toLowerCase()
  if (platform !== 'android' && platform !== 'ios') return null
  const version = headers.get('x-app-version')?.trim()
  if (!version || !VERSION_RE.test(version)) return null
  const rawBuild = headers.get('x-app-build')?.trim()
  const rawDevice = headers.get('x-device-id')?.trim().toLowerCase()
  return {
    platform, version,
    build: rawBuild && BUILD_RE.test(rawBuild) ? rawBuild : null,
    deviceId: rawDevice && DEVICE_ID_RE.test(rawDevice) ? rawDevice : null,
  }
}

/**
 * Catat bahwa user terlihat memakai app versi ini sekarang (riwayat versi + baris perangkat bila ada device id).
 * Tidak pernah melempar error: info tambahan tidak boleh menggagalkan request utama
 * (mis. migrasi 021/023 belum dijalankan). Dua tabel dicatat terpisah supaya satu yang belum ada tidak
 * menghalangi yang lain.
 */
export async function recordAppClient(userId: string, client: AppClient | null): Promise<void> {
  if (!client) return
  await Promise.all([
    db.insert(userAppClients)
      .values({ userId, platform: client.platform, appVersion: client.version, appBuild: client.build })
      .onConflictDoUpdate({
        target: [userAppClients.userId, userAppClients.platform, userAppClients.appVersion],
        set: { appBuild: client.build, lastSeenAt: new Date() },
        setWhere: sql`${userAppClients.lastSeenAt} < now() - interval '5 minutes'`,
      })
      .then(() => undefined, e => console.error('[appClient] user_app_clients', e)),
    client.deviceId
      ? db.insert(userDevices)
          .values({ userId, deviceId: client.deviceId, platform: client.platform, appVersion: client.version, appBuild: client.build })
          .onConflictDoUpdate({
            target: [userDevices.userId, userDevices.deviceId],
            set: { platform: client.platform, appVersion: client.version, appBuild: client.build, lastSeenAt: new Date() },
            // Throttle tulis, kecuali versi berubah (update app harus langsung terlihat).
            setWhere: sql`${userDevices.lastSeenAt} < now() - interval '5 minutes' OR ${userDevices.appVersion} <> excluded.app_version`,
          })
          .then(() => undefined, e => console.error('[appClient] user_devices', e))
      : Promise.resolve(),
  ])
}
