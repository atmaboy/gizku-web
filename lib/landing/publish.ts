/**
 * Landing Builder write operations (server only): autosave, publish,
 * discard, rollback. All draft writes use `revision` as an optimistic lock —
 * a stale revision gets a 409 instead of silently overwriting another
 * admin's edits (Acceptance #12).
 */
import { desc, eq, sql, and } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { landingPage, landingPageHistory } from '@/drizzle/schema'
import { diffContent, type Changes } from './diff'
import { applyMetrics, computeMetrics } from './metrics'
import { validateForPublish, type PublishIssue } from './publish-rules'
import { LANDING_CACHE_TAG, readRow } from './repo'
import { sanitizeFaqHtml } from './sanitize'
import { sectionHasContent } from './render'
import {
  LandingContent, PATCH_PATHS, SCHEMA_VERSION, parseStoredContent,
  type Faq, type PatchPath,
} from './schema'

export class ConflictError extends Error {
  constructor() { super('Diubah admin lain, muat ulang'); this.name = 'ConflictError' }
}
export class PublishValidationError extends Error {
  constructor(public issues: PublishIssue[], public warnings: PublishIssue[]) {
    super('Konten belum memenuhi aturan terbit'); this.name = 'PublishValidationError'
  }
}

/** Invalidate everything that renders published landing content. */
export function purgeLandingCache() {
  revalidateTag(LANDING_CACHE_TAG)
  // Legacy tags — the old API routes' cache entries.
  revalidateTag('landing-content')
  revalidateTag('footer-content')
  revalidatePath('/')
}

/** Server-side normalization applied to every write (defence in depth). */
function normalize<P extends PatchPath>(path: P, value: unknown): unknown {
  if (path === 'faq') {
    const faq = value as Faq
    return { ...faq, items: faq.items.map(it => ({ ...it, answerHtml: sanitizeFaqHtml(it.answerHtml) })) }
  }
  return value
}

export async function patchDraft(input: { revision: number; path: PatchPath; value: unknown; by: string }): Promise<{ revision: number; updatedAt: string }> {
  const schema = PATCH_PATHS[input.path]
  const parsed = schema.parse(input.value)
  const value = normalize(input.path, parsed)
  const now = new Date()
  const rows = await db.update(landingPage)
    .set({
      // path is from a closed enum (PatchPath), never user text.
      content: sql`jsonb_set(${landingPage.content}, ${`{${input.path}}`}::text[], ${JSON.stringify(value)}::jsonb, true)`,
      revision: sql`${landingPage.revision} + 1`,
      updatedBy: input.by,
      updatedAt: now,
    })
    .where(and(eq(landingPage.state, 'draft'), eq(landingPage.revision, input.revision)))
    .returning({ revision: landingPage.revision, updatedAt: landingPage.updatedAt })
  if (rows.length === 0) throw new ConflictError()
  return { revision: rows[0].revision, updatedAt: rows[0].updatedAt.toISOString() }
}

/**
 * The publishable version of a draft: FAQ HTML re-sanitized, automatic stats
 * frozen, and a visible Testimoni section with nothing live auto-hidden.
 */
export async function preparePublish(draft: LandingContent): Promise<{ content: LandingContent; warnings: PublishIssue[]; errors: PublishIssue[] }> {
  let content: LandingContent = { ...draft, faq: normalize('faq', draft.faq) as Faq }
  const { errors, warnings } = validateForPublish(content)
  if (content.stats.items.some(i => i.source === 'auto')) {
    content = applyMetrics(content, await computeMetrics())
  }
  if (content.visibility.testimonials && !sectionHasContent(content, 'testimonials')) {
    content = { ...content, visibility: { ...content.visibility, testimonials: false } }
  }
  return { content: LandingContent.parse(content), errors, warnings }
}

export async function publishDraft(input: { revision: number; by: string }): Promise<{ publishedAt: string; historyId: number; revision: number; changes: Changes; warnings: PublishIssue[] }> {
  const draftRow = await readRow('draft')
  if (!draftRow) throw new Error('Draf belum ada')
  if (draftRow.revision !== input.revision) throw new ConflictError()
  const draft = parseStoredContent(draftRow.content, draftRow.schemaVersion)
  const { content, errors, warnings } = await preparePublish(draft)
  if (errors.length) throw new PublishValidationError(errors, warnings)

  const publishedRow = await readRow('published')
  const published = publishedRow ? parseStoredContent(publishedRow.content, publishedRow.schemaVersion) : null
  const changes = diffContent(published, draft)
  const now = new Date()

  const result = await db.transaction(async tx => {
    // Lock the draft so a concurrent autosave can't slip in between check and copy.
    const locked = await tx.update(landingPage)
      .set({ content, revision: sql`${landingPage.revision} + 1`, updatedBy: input.by, updatedAt: now })
      .where(and(eq(landingPage.state, 'draft'), eq(landingPage.revision, input.revision)))
      .returning({ revision: landingPage.revision })
    if (locked.length === 0) throw new ConflictError()

    await tx.insert(landingPage)
      .values({ state: 'published', content, schemaVersion: SCHEMA_VERSION, revision: 1, updatedBy: input.by, updatedAt: now, publishedAt: now })
      .onConflictDoUpdate({
        target: landingPage.state,
        set: { content, schemaVersion: SCHEMA_VERSION, revision: sql`${landingPage.revision} + 1`, updatedBy: input.by, updatedAt: now, publishedAt: now },
      })

    const [h] = await tx.insert(landingPageHistory)
      .values({ content, schemaVersion: SCHEMA_VERSION, publishedBy: input.by, publishedAt: now, changeSummary: changes })
      .returning({ id: landingPageHistory.id })
    return { historyId: h.id, revision: locked[0].revision }
  })

  purgeLandingCache()
  return { publishedAt: now.toISOString(), historyId: result.historyId, revision: result.revision, changes, warnings }
}

export async function discardDraft(input: { revision: number; by: string }): Promise<{ revision: number }> {
  const published = await readRow('published')
  if (!published) throw new Error('Belum ada versi tayang')
  const rows = await db.update(landingPage)
    .set({ content: published.content, schemaVersion: published.schemaVersion, revision: sql`${landingPage.revision} + 1`, updatedBy: input.by, updatedAt: new Date() })
    .where(and(eq(landingPage.state, 'draft'), eq(landingPage.revision, input.revision)))
    .returning({ revision: landingPage.revision })
  if (rows.length === 0) throw new ConflictError()
  return { revision: rows[0].revision }
}

/** Copies a history snapshot into the DRAFT (never straight to published). */
export async function rollbackToHistory(input: { historyId: number; by: string }): Promise<{ revision: number }> {
  const [h] = await db.select().from(landingPageHistory).where(eq(landingPageHistory.id, input.historyId)).limit(1)
  if (!h) throw new Error('Riwayat tidak ditemukan')
  const content = parseStoredContent(h.content, h.schemaVersion)
  const rows = await db.update(landingPage)
    .set({ content, schemaVersion: SCHEMA_VERSION, revision: sql`${landingPage.revision} + 1`, updatedBy: input.by, updatedAt: new Date() })
    .where(eq(landingPage.state, 'draft'))
    .returning({ revision: landingPage.revision })
  if (rows.length === 0) throw new Error('Draf belum ada')
  return { revision: rows[0].revision }
}

export async function listHistory(limit = 10) {
  return db.select({
    id: landingPageHistory.id,
    publishedAt: landingPageHistory.publishedAt,
    publishedBy: landingPageHistory.publishedBy,
    changeSummary: landingPageHistory.changeSummary,
  }).from(landingPageHistory).orderBy(desc(landingPageHistory.publishedAt)).limit(limit)
}
