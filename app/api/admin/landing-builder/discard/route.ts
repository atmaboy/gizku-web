/**
 * POST /api/admin/landing-builder/discard
 * body { revision } → { revision }   — draft = published
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { discardDraft } from '@/lib/landing/publish'
import { ADMIN_ACTOR, json, readJson, withAdmin } from '@/lib/landing/api'

const Body = z.object({ revision: z.number().int().positive() })

export async function POST(req: NextRequest) {
  return withAdmin(req, 'POST discard', async () => {
    const { revision } = Body.parse(await readJson(req))
    return json(await discardDraft({ revision, by: ADMIN_ACTOR }))
  })
}
