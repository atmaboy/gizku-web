import { isNull, lt, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { meals } from '@/drizzle/schema'

/**
 * Riwayat yang dihapus user hanya di-soft-delete (meals.deleted_at) supaya backoffice masih bisa
 * melihatnya. Semua query meals yang menghitung, menampilkan ke user, atau melakukan dedup HARUS
 * menambahkan `liveMeal`. Hanya daftar riwayat di backoffice yang boleh menyertakan baris terhapus.
 */
export const liveMeal = isNull(meals.deletedAt)

/** Berapa lama baris yang dihapus user disimpan untuk backoffice sebelum dihapus permanen. */
export const MEAL_DELETED_RETENTION_DAYS = 90

export async function pruneDeletedMeals(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - MEAL_DELETED_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const rows = await db.delete(meals).where(and(lt(meals.deletedAt, cutoff))).returning({ id: meals.id })
  return rows.length
}
