/**
 * Cron endpoint — menghapus permanen riwayat makanan yang sudah di-soft-delete user lebih dari
 * MEAL_DELETED_RETENTION_DAYS (90 hari). Dilindungi CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { pruneDeletedMeals } from '@/lib/mealQuery'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const deleted = await pruneDeletedMeals()
  return NextResponse.json({ deleted })
}
