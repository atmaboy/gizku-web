import { db } from '@/lib/db'
import { adminConfig } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

const KEY = 'push_expo_android_enabled'

/**
 * Apakah token Expo milik Android (app versi lama) masih dikirimi blast lewat Expo Push.
 * Default aktif. Matikan kalau semua app Android sudah migrasi ke token FCM. iOS selalu lewat Expo.
 */
export async function getExpoAndroidEnabled(): Promise<boolean> {
  try {
    const [row] = await db.select().from(adminConfig).where(eq(adminConfig.key, KEY)).limit(1)
    return row?.value !== 'false'
  } catch { return true }
}

export async function setExpoAndroidEnabled(enabled: boolean) {
  const value = enabled ? 'true' : 'false'
  await db.insert(adminConfig).values({ key: KEY, value })
    .onConflictDoUpdate({ target: adminConfig.key, set: { value, updatedAt: new Date() } })
}

/** Token ini boleh dikirimi sekarang? FCM selalu; Expo iOS selalu; Expo Android sesuai toggle. */
export function tokenDeliverable(t: { provider: string; platform: string }, expoAndroidEnabled: boolean) {
  if (t.provider === 'fcm') return true
  return t.platform !== 'android' || expoAndroidEnabled
}
