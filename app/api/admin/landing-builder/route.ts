/**
 * GET /api/admin/landing-builder
 * → { draft, published, revision, updatedAt, publishedAt, changes, totalChanges, metrics, legalDocs, check }
 *
 * Seeds draft + published from the legacy landing_content rows on first use.
 * `changes` = draft vs published diff per section; `metrics` = current counts
 * for automatic stats (for the preview only — frozen at publish time);
 * `check` = publish-rule errors/warnings, so the builder can flag problems
 * before the admin hits "Terbitkan".
 */
import { NextRequest } from 'next/server'
import { diffContent, totalChanges } from '@/lib/landing/diff'
import { computeMetrics, type MetricValues } from '@/lib/landing/metrics'
import { validateForPublish } from '@/lib/landing/publish-rules'
import { ensureSeeded, getLegalDocLinks, readRow } from '@/lib/landing/repo'
import { parseStoredContent } from '@/lib/landing/schema'
import { ADMIN_ACTOR, json, withAdmin } from '@/lib/landing/api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withAdmin(req, 'GET', async () => {
    await ensureSeeded({ by: ADMIN_ACTOR })
    const [draftRow, publishedRow] = [await readRow('draft'), await readRow('published')]
    if (!draftRow) throw new Error('Draf belum ada')
    const draft = parseStoredContent(draftRow.content, draftRow.schemaVersion)
    const published = publishedRow ? parseStoredContent(publishedRow.content, publishedRow.schemaVersion) : null
    const changes = diffContent(published, draft)
    let metrics: MetricValues | null = null
    try { metrics = await computeMetrics() } catch (e) { console.error('[landing-builder GET] metrics', e) }
    return json({
      draft,
      published,
      revision: draftRow.revision,
      updatedAt: draftRow.updatedAt.toISOString(),
      publishedAt: publishedRow?.publishedAt?.toISOString() ?? null,
      changes,
      totalChanges: totalChanges(changes),
      metrics,
      legalDocs: await getLegalDocLinks(),
      check: validateForPublish(draft),
    })
  })
}
