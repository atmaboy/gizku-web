/**
 * POST /api/admin/landing-builder/seed[?force=1]
 *
 * Builds the landing document from the legacy landing_content rows and writes
 * identical draft + published rows. Idempotent: a no-op when rows already
 * exist, unless ?force=1 (overwrites BOTH draft and published — then purges
 * the cache). GET /api/admin/landing-builder also seeds automatically on
 * first use, so this is only needed to re-import.
 */
import { NextRequest } from 'next/server'
import { purgeLandingCache } from '@/lib/landing/publish'
import { ensureSeeded } from '@/lib/landing/repo'
import { ADMIN_ACTOR, json, withAdmin } from '@/lib/landing/api'

export async function POST(req: NextRequest) {
  return withAdmin(req, 'POST seed', async () => {
    const force = req.nextUrl.searchParams.get('force') === '1'
    const r = await ensureSeeded({ force, by: ADMIN_ACTOR })
    if (r.seeded) purgeLandingCache()
    return json(r)
  })
}
