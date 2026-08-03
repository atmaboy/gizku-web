/**
 * Cron endpoint — dipanggil Vercel Cron secara berkala untuk mengirim
 * notification_blasts yang sudah dijadwalkan (status='scheduled' dan
 * scheduled_at <= sekarang). Dilindungi CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notificationBlasts } from '@/drizzle/schema'
import { and, eq, lte } from 'drizzle-orm'
import { dispatchBlast } from '@/lib/blast'

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

  const due = await db.select({ id: notificationBlasts.id }).from(notificationBlasts)
    .where(and(eq(notificationBlasts.status, 'scheduled'), lte(notificationBlasts.scheduledAt, new Date())))

  for (const b of due) {
    await dispatchBlast(b.id)
  }

  return NextResponse.json({ processed: due.length })
}
