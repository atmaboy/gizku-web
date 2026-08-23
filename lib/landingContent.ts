/**
 * Shared data access for the landing page: hero/how_it_works/features/stats/cta
 * rows and footer rows, both stored in `landing_content`.
 *
 * Used by the public API routes (app/api/landing-content, app/api/footer-content)
 * *and* directly by the landing page Server Component (app/page.tsx) so the
 * marketing copy is part of the initial server-rendered HTML instead of only
 * appearing after a client-side fetch — search engine crawlers and link-preview
 * bots that don't run JS need this to see real content.
 *
 * Cached with unstable_cache (revalidate: false — on-demand only) and busted by
 * revalidateTag() from the admin CRUD routes whenever content changes.
 */
import { db } from '@/lib/db'
import { landingContent } from '@/drizzle/schema'
import { eq, and, asc } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

// `meta` is an untyped jsonb column (no `.$type<>()` on the schema), so
// $inferSelect gives it `unknown` — narrow it here to the shape every caller
// actually relies on, same as the admin editor's own ContentRow type does.
export type LandingContentRow = {
  id: number
  section: string
  slug: string
  title: string
  subtitle: string | null
  body: string | null
  meta: Record<string, unknown> | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
export type SectionMap = Record<string, LandingContentRow[]>
export type FooterBySlug = Record<string, LandingContentRow>

function toRow(r: typeof landingContent.$inferSelect): LandingContentRow {
  return { ...r, meta: (r.meta ?? null) as Record<string, unknown> | null }
}

export const getLandingContentGrouped = unstable_cache(
  async (): Promise<SectionMap> => {
    const rows = await db
      .select()
      .from(landingContent)
      .where(eq(landingContent.isActive, true))
      .orderBy(asc(landingContent.sortOrder))

    const grouped: SectionMap = {}
    for (const raw of rows) {
      const row = toRow(raw)
      if (!grouped[row.section]) grouped[row.section] = []
      grouped[row.section].push(row)
    }
    return grouped
  },
  ['landing-content-grouped'],
  { tags: ['landing-content'], revalidate: false }
)

export const getFooterContentBySlug = unstable_cache(
  async (): Promise<FooterBySlug> => {
    const rows = await db
      .select()
      .from(landingContent)
      .where(
        and(
          eq(landingContent.section, 'footer'),
          eq(landingContent.isActive, true),
        )
      )
      .orderBy(asc(landingContent.sortOrder))

    const bySlug: FooterBySlug = {}
    for (const raw of rows) {
      const row = toRow(raw)
      bySlug[row.slug] = row
    }
    return bySlug
  },
  ['footer-content-by-slug'],
  { tags: ['footer-content'], revalidate: false }
)
