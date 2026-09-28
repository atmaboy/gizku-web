/**
 * Landing Builder — DB access (server only).
 *
 * Visitors: getPublishedLanding() — cached (tag 'landing', on-demand
 * revalidation only), never counts anything, falls back to the legacy
 * landing_content rows if the builder hasn't been seeded yet, and to the
 * static defaults if the DB is unreachable.
 *
 * Backoffice: readDraft()/ensureSeeded() — uncached.
 */
import { asc, eq } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { landingContent, landingPage, legalDocuments } from '@/drizzle/schema'
import { DEFAULT_CONTENT } from './defaults'
import { buildFromLegacy, type LegacyRow } from './legacy'
import type { LegalDocLink } from './render'
import { parseStoredContent, SCHEMA_VERSION, type LandingContent } from './schema'

export const LANDING_CACHE_TAG = 'landing'

export type LandingState = 'draft' | 'published'

/** Postgres "relation does not exist" — sql/018 hasn't been run yet. */
export function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code
  return code === '42P01'
}

export class LandingNotMigratedError extends Error {
  constructor() {
    super('Tabel landing_page belum ada. Jalankan sql/018_create_landing_builder.sql di database ini terlebih dahulu.')
    this.name = 'LandingNotMigratedError'
  }
}

export async function readRow(state: LandingState) {
  try {
    const [r] = await db.select().from(landingPage).where(eq(landingPage.state, state)).limit(1)
    return r ?? null
  } catch (e) {
    if (isMissingTable(e)) throw new LandingNotMigratedError()
    throw e
  }
}

export function telegramBotUrlFromEnv(): string | undefined {
  const u = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '').trim()
  return u ? `https://t.me/${u}` : undefined
}

export async function buildFromLegacyTable(): Promise<LandingContent> {
  const rows = await db.select().from(landingContent).orderBy(asc(landingContent.sortOrder))
  const legacy: LegacyRow[] = rows.map(r => ({ ...r, meta: (r.meta ?? null) as Record<string, unknown> | null }))
  return buildFromLegacy(legacy, { telegramBotUrl: telegramBotUrlFromEnv() })
}

export async function getLegalDocLinks(): Promise<LegalDocLink[]> {
  try {
    const docs = await db
      .select({ slug: legalDocuments.slug, title: legalDocuments.titleId })
      .from(legalDocuments)
      .orderBy(asc(legalDocuments.createdAt))
    return docs.filter(d => d.slug && d.title.trim())
  } catch (e) {
    console.error('[landing] gagal memuat dokumen legal', e)
    return []
  }
}

/**
 * Seed draft + published from the legacy table the first time the builder is
 * opened. Idempotent: ON CONFLICT DO NOTHING, and a no-op once rows exist
 * (pass force=true to rebuild both rows from landing_content).
 */
export async function ensureSeeded(opts: { force?: boolean; by?: string } = {}): Promise<{ seeded: boolean }> {
  const existing = await readRow('draft')
  if (existing && !opts.force) return { seeded: false }
  const content = await buildFromLegacyTable()
  const now = new Date()
  const values = (state: LandingState) => ({
    state, content, schemaVersion: SCHEMA_VERSION, revision: 1, updatedBy: opts.by ?? 'seed', updatedAt: now,
    publishedAt: state === 'published' ? now : null,
  })
  if (opts.force) {
    await db.transaction(async tx => {
      for (const state of ['published', 'draft'] as const) {
        await tx.insert(landingPage).values(values(state)).onConflictDoUpdate({
          target: landingPage.state,
          set: { content, schemaVersion: SCHEMA_VERSION, updatedBy: opts.by ?? 'seed', updatedAt: now, publishedAt: state === 'published' ? now : null },
        })
      }
    })
  } else {
    await db.insert(landingPage).values([values('published'), values('draft')]).onConflictDoNothing()
  }
  return { seeded: true }
}

export type PublishedLanding = {
  content: LandingContent
  legalDocs: LegalDocLink[]
  publishedAt: string | null
  source: 'published' | 'legacy' | 'fallback'
}

async function loadPublishedUncached(): Promise<PublishedLanding> {
  let row = null
  try {
    row = await readRow('published')
  } catch (e) {
    if (!(e instanceof LandingNotMigratedError)) throw e
  }
  const legalDocs = await getLegalDocLinks()
  if (row) {
    return {
      content: parseStoredContent(row.content, row.schemaVersion),
      legalDocs,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      source: 'published',
    }
  }
  // Builder not seeded yet → keep serving the legacy content in the new layout.
  return { content: await buildFromLegacyTable(), legalDocs, publishedAt: null, source: 'legacy' }
}

const loadPublishedCached = unstable_cache(loadPublishedUncached, ['landing-published-v1'], {
  tags: [LANDING_CACHE_TAG],
  revalidate: false,
})

/** For visitors. Never throws — DB failure → static defaults + error log. */
export async function getPublishedLanding(): Promise<PublishedLanding> {
  try {
    return await loadPublishedCached()
  } catch (e) {
    console.error('[landing] gagal memuat konten tayang — memakai fallback statis', e)
    return { content: DEFAULT_CONTENT, legalDocs: [], publishedAt: null, source: 'fallback' }
  }
}

/** Draft for the preview mode on `/` (admin only, uncached). */
export async function getDraftLanding(): Promise<PublishedLanding> {
  const row = await readRow('draft')
  if (!row) return getPublishedLanding()
  return {
    content: parseStoredContent(row.content, row.schemaVersion),
    legalDocs: await getLegalDocLinks(),
    publishedAt: null,
    source: 'published',
  }
}
