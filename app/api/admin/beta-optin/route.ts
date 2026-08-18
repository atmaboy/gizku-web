/**
 * Backoffice API for the Closed Beta Tester Android opt-in feature —
 * feature on/off switch + per-language explainer popup content
 * (app/admin/config's "Closed Beta Tester Android" section).
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { betaOptinConfig } from '@/drizzle/schema'
import { requireAdmin } from '@/lib/admin'
import { invalidateBetaOptinConfigCache } from '@/lib/betaOptinConfig'
import { ok, err, setCors } from '@/lib/utils'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  const h = new Headers()
  setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const [row] = await db.select().from(betaOptinConfig).limit(1)
  return ok({
    enabled: row?.enabled ?? false,
    id: { title: row?.titleId ?? '', points: row?.pointsId ?? [], callout: row?.calloutId ?? '' },
    en: { title: row?.titleEn ?? '', points: row?.pointsEn ?? [], callout: row?.calloutEn ?? '' },
    updatedAt: row?.updatedAt ?? null,
  })
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  const action = req.nextUrl.searchParams.get('action')

  if (action === 'update_enabled') {
    const { enabled } = await req.json()
    const existing = await db.select({ id: betaOptinConfig.id }).from(betaOptinConfig).limit(1)
    if (existing.length > 0) {
      await db.update(betaOptinConfig).set({ enabled: !!enabled, updatedAt: new Date() }).where(eq(betaOptinConfig.id, existing[0].id))
    } else {
      await db.insert(betaOptinConfig).values({ enabled: !!enabled })
    }
    invalidateBetaOptinConfigCache()
    return ok({ message: `Opsi opt-in ${enabled ? 'diaktifkan' : 'dinonaktifkan'}` })
  }

  if (action === 'update_content') {
    const body = await req.json()
    const langs = ['id', 'en'] as const
    for (const lang of langs) {
      const content = body?.[lang]
      if (!content || typeof content.title !== 'string' || !Array.isArray(content.points) || typeof content.callout !== 'string') {
        return err(`Konten bahasa "${lang}" tidak valid`)
      }
    }
    const points = (arr: unknown[]) => arr.map(p => String(p).trim()).filter(Boolean)

    const existing = await db.select({ id: betaOptinConfig.id }).from(betaOptinConfig).limit(1)
    const values = {
      titleId:   body.id.title.trim(),
      pointsId:  points(body.id.points),
      calloutId: body.id.callout.trim(),
      titleEn:   body.en.title.trim(),
      pointsEn:  points(body.en.points),
      calloutEn: body.en.callout.trim(),
      updatedAt: new Date(),
    }
    if (existing.length > 0) {
      await db.update(betaOptinConfig).set(values).where(eq(betaOptinConfig.id, existing[0].id))
    } else {
      await db.insert(betaOptinConfig).values(values)
    }
    invalidateBetaOptinConfigCache()
    return ok({ message: 'Konten popup tersimpan' })
  }

  return err('Action tidak dikenal')
}
