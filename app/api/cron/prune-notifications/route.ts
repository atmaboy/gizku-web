/**
 * Cron endpoint — menghapus notifikasi inbox (user_notifications) yang lebih dari
 * INBOX_RETENTION_DAYS (90 hari ≈ 3 bulan). Dilindungi CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { pruneOldNotifications } from '@/lib/inbox'

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

  const deleted = await pruneOldNotifications()
  return NextResponse.json({ deleted })
}
