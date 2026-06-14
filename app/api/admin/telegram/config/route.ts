/**
 * GET  /api/admin/telegram/config  — fetch current telegram config keys
 * POST /api/admin/telegram/config  — bulk-upsert telegram config keys
 *
 * Managed keys:
 *   telegram_free_daily_limit        (integer, default 3)
 *   telegram_linked_daily_limit      (integer, default 10)
 *   telegram_welcome_message         (text)
 *   telegram_help_message            (text)
 *   telegram_limit_reached_message   (text)
 *   telegram_after_analysis_cta      (text)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { adminConfig } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { verifyToken } from '@/lib/auth'

const TELEGRAM_KEYS = [
  'telegram_free_daily_limit',
  'telegram_linked_daily_limit',
  'telegram_welcome_message',
  'telegram_help_message',
  'telegram_limit_reached_message',
  'telegram_after_analysis_cta',
] as const

async function requireAdmin(req: NextRequest) {
  const authHeader  = req.headers.get('authorization') ?? ''
  const cookieToken = req.cookies.get('admin_token')?.value ?? req.cookies.get('auth_token')?.value ?? ''
  const raw = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken
  if (!raw) return null
  try {
    return await verifyToken(raw) as { userId?: string } | null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(adminConfig)
    .where(
      // Use SQL IN via multiple selects merged, drizzle doesn't have inArray for text column easily
      // so we fetch all and filter
    )

  // Filter to telegram keys
  const all = await db.select().from(adminConfig)
  const cfg: Record<string, string | null> = {}
  for (const key of TELEGRAM_KEYS) {
    const row = all.find(r => r.key === key)
    cfg[key] = row?.value ?? null
  }

  return NextResponse.json({ config: cfg })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, string>

  // Only allow updating known telegram keys
  const updates = Object.entries(body).filter(([k]) => (TELEGRAM_KEYS as readonly string[]).includes(k))
  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid keys provided' }, { status: 400 })
  }

  for (const [key, value] of updates) {
    await db
      .insert(adminConfig)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: adminConfig.key,
        set:    { value: String(value), updatedAt: new Date() },
      })
  }

  return NextResponse.json({ ok: true, updated: updates.map(([k]) => k) })
}
