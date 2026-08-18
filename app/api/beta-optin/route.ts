/**
 * GET /api/beta-optin
 * Public endpoint — dikonsumsi oleh BetaOptinToggle di halaman register.
 * Tidak memerlukan autentikasi. Mengembalikan status enabled + konten popup
 * penjelasan untuk kedua bahasa sekaligus — client memilih bahasa mana yang
 * dipakai.
 */
import { getBetaOptinConfig } from '@/lib/betaOptinConfig'
import { ok, setCors } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  const h = new Headers()
  setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET() {
  const config = await getBetaOptinConfig()
  return ok(config)
}
