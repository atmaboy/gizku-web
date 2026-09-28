/**
 * PATCH /api/admin/landing-builder/draft
 * body { revision, path, value } → { revision, updatedAt }
 *
 * Autosave. Validates only the targeted part (`path` = a top-level key such
 * as 'hero', 'order', 'settings'). 409 when `revision` is stale — another
 * admin (or tab) saved in between.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { patchDraft } from '@/lib/landing/publish'
import { PatchPath } from '@/lib/landing/schema'
import { ADMIN_ACTOR, json, readJson, withAdmin } from '@/lib/landing/api'

const Body = z.object({ revision: z.number().int().positive(), path: PatchPath, value: z.unknown() })

export async function PATCH(req: NextRequest) {
  return withAdmin(req, 'PATCH draft', async () => {
    const body = Body.parse(await readJson(req))
    return json(await patchDraft({ revision: body.revision, path: body.path, value: body.value, by: ADMIN_ACTOR }))
  })
}
