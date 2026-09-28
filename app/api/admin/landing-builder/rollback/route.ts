/**
 * POST /api/admin/landing-builder/rollback
 * body { historyId } → { revision }
 * Copies an old published version into the DRAFT (review, then Terbitkan).
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { rollbackToHistory } from '@/lib/landing/publish'
import { ADMIN_ACTOR, json, readJson, withAdmin } from '@/lib/landing/api'

const Body = z.object({ historyId: z.number().int().positive() })

export async function POST(req: NextRequest) {
  return withAdmin(req, 'POST rollback', async () => {
    const { historyId } = Body.parse(await readJson(req))
    return json(await rollbackToHistory({ historyId, by: ADMIN_ACTOR }))
  })
}
