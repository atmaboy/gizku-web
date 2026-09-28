/**
 * Render-time view of a LandingContent document — shared by the public page
 * (server) and the builder preview (client), so both apply the exact same
 * "what actually shows" rules:
 *  - a section renders only if it's visible AND has something to show
 *    (live testimonials with consent, live FAQ items, ≥1 step/feature/stat);
 *  - nav/footer links to a section that doesn't render are dropped;
 *  - store badges need the global switch on AND a URL;
 *  - legal footer group mirrors the Legal Documents when auto-sync is on.
 */
import { applyYearToken } from './format'
import type { FooterLink, LandingContent, SectionKey, StoreKey } from './schema'

export type LegalDocLink = { slug: string; title: string }

export type RenderModel = {
  content: LandingContent
  /** Middle sections in display order that actually render. */
  sections: SectionKey[]
  rendered: ReadonlySet<SectionKey>
  /** Stores with a URL and the switch on, in badge order. */
  stores: { key: StoreKey; url: string }[]
  copyright: string
}

export function sectionHasContent(c: LandingContent, k: SectionKey): boolean {
  switch (k) {
    case 'hero': return !!c.hero.title.trim()
    case 'stats': return c.stats.items.length > 0
    case 'howItWorks': return c.howItWorks.items.length > 0
    case 'features': return c.features.rows.some(r => r.items.length > 0)
    case 'testimonials': return c.testimonials.items.some(t => t.status === 'live' && !!t.consentAt)
    case 'faq': return c.faq.items.some(f => f.status === 'live')
    case 'cta': return !!c.cta.title.trim()
  }
}

export function buildRenderModel(content: LandingContent, opts: { legalDocs?: LegalDocLink[]; year?: number } = {}): RenderModel {
  const sections = content.order.filter(k => content.visibility[k] !== false && sectionHasContent(content, k))
  const rendered = new Set(sections)

  let c = content
  if (content.footer.legalAutoSync && opts.legalDocs && opts.legalDocs.length) {
    const synced: FooterLink[] = opts.legalDocs.map(d => ({
      id: `legal_${d.slug}`, label: d.title, target: { kind: 'internal', path: `/legal/${d.slug}` },
    }))
    c = {
      ...content,
      footer: { ...content.footer, groups: content.footer.groups.map(g => g.kind === 'legal' ? { ...g, links: synced } : g) },
    }
  }

  const s = content.settings.stores
  const stores = (['appStore', 'googlePlay', 'telegram'] as const)
    .filter(k => s[k].enabled && s[k].url.trim())
    .map(k => ({ key: k, url: s[k].url.trim() }))

  return { content: c, sections, rendered, stores, copyright: applyYearToken(content.footer.copyright, opts.year) }
}
