/** Backoffice API Goals & Tracker: config (wajib password admin untuk menyimpan), progres, export waitlist. */
import { NextRequest } from 'next/server'
import { requireAdmin, assertAdminPassword } from '@/lib/admin'
import { getGoalsConfig, saveGoalsConfig } from '@/lib/goalsConfig.server'
import { mergeGoalsConfig, validateGoalsConfig } from '@/lib/goalsConfig'
import { getGoalsAdminStats, getWaitlist } from '@/lib/goalsStats.server'
import { waitlistCsv } from '@/lib/goalsCsv'
import { ok, err, setCors } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError
  const action = req.nextUrl.searchParams.get('action') || 'overview'

  if (action === 'overview') {
    const [config, stats] = await Promise.all([getGoalsConfig(), getGoalsAdminStats()])
    return ok({ config, stats })
  }

  if (action === 'export_waitlist') {
    const csv = waitlistCsv(await getWaitlist())
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="waitlist-premium.csv"',
      },
    })
  }

  return err('Action tidak dikenal')
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'update_config') {
    const body = await req.json().catch(() => null)
    const pwdError = await assertAdminPassword(body?.adminPassword)
    if (pwdError) return pwdError
    const patch = body?.patch
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return err('Data tidak valid')
    // Tiap kartu menyimpan sub-objek utuhnya; kunci top-level lain tetap dari config tersimpan.
    const current = await getGoalsConfig()
    const next = mergeGoalsConfig({ ...current, ...patch })
    const msg = validateGoalsConfig(next)
    if (msg) return err(msg)
    await saveGoalsConfig(next)
    return ok({ config: next })
  }

  return err('Action tidak dikenal')
}
