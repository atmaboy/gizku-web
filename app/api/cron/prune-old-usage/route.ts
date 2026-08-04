/**
 * Cron endpoint — dipanggil Vercel Cron secara berkala untuk menghapus baris
 * daily_usage yang lebih dari USAGE_RETENTION_DAYS (90 hari), di semua user.
 * Ini murni data telemetri pemakaian harian (dipakai untuk ledger "Riwayat
 * Limit"), bukan data transaksi/approval — limitRequests tidak disentuh.
 * Dilindungi CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { pruneOldDailyUsage } from '@/lib/limitLedger'

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

  const deleted = await pruneOldDailyUsage()

  return NextResponse.json({ deleted })
}
