/**
 * Resolve builder `Link`/`LinkTarget` values into real hrefs.
 *
 * `auto` targets depend on the visitor's login state, which only the browser
 * knows (localStorage), so they resolve to BOTH hrefs and the caller renders
 * the AuthAwareLink client island; everything else is a plain <a>.
 */
import { SECTION_ANCHORS, type LinkTarget, type Settings, type Visibility, type SectionKey } from './schema'

export type ResolvedHref =
  | { kind: 'static'; href: string; external: boolean }
  | { kind: 'auto'; guestHref: string; authHref: string }

/** Default destinations when settings are empty (same as the old per-section defaults). */
export const DEFAULT_CTA_URL_GUEST = '/login'
export const DEFAULT_CTA_URL_AUTH = '/main/riwayat'

export function sectionHref(section: SectionKey): string {
  return `#${SECTION_ANCHORS[section]}`
}

export function resolveTarget(target: LinkTarget, settings: Pick<Settings, 'ctaUrlGuest' | 'ctaUrlAuth'>): ResolvedHref {
  switch (target.kind) {
    case 'section':
      return { kind: 'static', href: sectionHref(target.section), external: false }
    case 'internal':
      return { kind: 'static', href: target.path || '/', external: false }
    case 'external':
      return { kind: 'static', href: target.url, external: /^https?:\/\//i.test(target.url) }
    case 'auto':
      return {
        kind: 'auto',
        guestHref: settings.ctaUrlGuest || DEFAULT_CTA_URL_GUEST,
        authHref: settings.ctaUrlAuth || DEFAULT_CTA_URL_AUTH,
      }
  }
}

/** A link to a hidden section is dropped at render time (not an error). */
export function isTargetVisible(target: LinkTarget, visibility: Visibility, rendered?: ReadonlySet<SectionKey>): boolean {
  if (target.kind !== 'section') return true
  if (rendered) return rendered.has(target.section)
  return visibility[target.section] !== false
}

/** Human description of a target, for the builder UI. */
export function describeTarget(target: LinkTarget, sectionLabel: (k: SectionKey) => string): string {
  switch (target.kind) {
    case 'section': return `Section: ${sectionLabel(target.section)}`
    case 'internal': return target.path || '/'
    case 'external': return target.url || 'URL eksternal'
    case 'auto': return 'Otomatis (login / aplikasi)'
  }
}

/**
 * Parse a legacy free-form URL (landing_content footer links, CTA urls) into a
 * structured target.
 */
export function targetFromUrl(url: string): LinkTarget {
  const u = (url ?? '').trim()
  if (u.startsWith('#')) {
    const anchor = u.slice(1)
    const hit = (Object.entries(SECTION_ANCHORS) as [SectionKey, string][]).find(([, a]) => a === anchor)
    if (hit) return { kind: 'section', section: hit[0] }
    return { kind: 'internal', path: `/${u}` }
  }
  if (u.startsWith('/')) return { kind: 'internal', path: u }
  if (/^(https?:|mailto:|tel:)/i.test(u)) return { kind: 'external', url: u }
  if (!u) return { kind: 'internal', path: '/' }
  return { kind: 'external', url: `https://${u}` }
}
