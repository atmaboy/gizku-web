/**
 * POST /api/admin/landing-builder/publish
 * body { revision } → { publishedAt, historyId, revision, changes, warnings }
 *
 * Full validation + publish rules (422 with per-section errors), freezes the
 * automatic stats, copies draft → published + history in one transaction,
 * then purges the landing cache.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { publishDraft } from '@/lib/landing/publish'
import { ADMIN_ACTOR, json, readJson, withAdmin } from '@/lib/landing/api'

const Body = z.object({ revision: z.number().int().positive() })

export async function POST(req: NextRequest) {
  return withAdmin(req, 'POST publish', async () => {
    const { revision } = Body.parse(await readJson(req))
    return json(await publishDraft({ revision, by: ADMIN_ACTOR }))
  })
}
