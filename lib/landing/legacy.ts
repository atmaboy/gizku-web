/**
 * Bridges between the legacy `landing_content` table and the Landing Builder
 * document. Pure functions only (no DB) so they're unit-testable.
 *
 *  - buildFromLegacy(): landing_content rows → LandingContent (initial seed).
 *  - toLegacySectionMap() / toLegacyFooter(): published LandingContent → the
 *    exact response shapes of GET /api/landing-content and
 *    GET /api/footer-content, which other clients (gizku-mobile) may still
 *    read. Don't change these shapes.
 */
import { cloneDefault } from './defaults'
import { applyYearToken } from './format'
import { resolveTarget, targetFromUrl } from './links'
import {
  SOCIAL_PLATFORMS, newId,
  type IconKey, type LandingContent, type Link, type SectionKey, type StatItem,
} from './schema'

export type LegacyRow = {
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
export type LegacySectionMap = Record<string, LegacyRow[]>
export type LegacyFooterBySlug = Record<string, LegacyRow>

export type LegacyLink = { label: string; url: string }

const metaStr = (m: LegacyRow['meta'], k: string): string | null => {
  const v = m?.[k]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
const metaList = (m: LegacyRow['meta'], k: string): unknown[] | null => {
  const v = m?.[k]
  return Array.isArray(v) ? v : null
}
const metaLinks = (m: LegacyRow['meta']): LegacyLink[] =>
  (metaList(m, 'links') ?? [])
    .filter((l): l is LegacyLink => typeof l === 'object' && l !== null && typeof (l as LegacyLink).label === 'string' && typeof (l as LegacyLink).url === 'string')

const STEP_ICON: Record<string, IconKey> = { camera: 'camera', brain: 'sparkle', chart: 'chart', scan: 'scan', history: 'history', send: 'send' }
const FEATURE_ICON: Record<string, IconKey> = { 'fitur-scan': 'scan', 'fitur-history': 'history', 'fitur-insight': 'bolt' }

function detectPlatform(label: string, url: string): typeof SOCIAL_PLATFORMS[number] | null {
  const s = `${label} ${url}`.toLowerCase()
  if (s.includes('instagram')) return 'instagram'
  if (s.includes('tiktok')) return 'tiktok'
  if (s.includes('t.me') || s.includes('telegram')) return 'telegram'
  if (s.includes('facebook') || s.includes('fb.com')) return 'facebook'
  if (s.includes('youtube') || s.includes('youtu.be')) return 'youtube'
  if (s.includes('linkedin')) return 'linkedin'
  if (s.includes('wa.me') || s.includes('whatsapp')) return 'whatsapp'
  if (s.includes('threads.net') || s.includes('threads')) return 'threads'
  if (s.includes('twitter') || s.includes('x.com')) return 'x'
  return null
}

/**
 * Map legacy rows onto the new document. Sections with no active legacy rows
 * keep the design defaults (lib/landing/defaults.ts); `blog_post` rows and
 * every `body` column are ignored.
 */
export function buildFromLegacy(allRows: LegacyRow[], opts: { telegramBotUrl?: string } = {}): LandingContent {
  const c = cloneDefault()
  const rows = allRows.filter(r => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  const bySection = (s: string) => rows.filter(r => r.section === s)

  // Hero (+ the per-section CTA urls → one global setting)
  const hero = bySection('hero')[0]
  if (hero) {
    if (hero.title.trim()) c.hero.title = hero.title
    if (hero.subtitle?.trim()) c.hero.subtitle = hero.subtitle
    const label = metaStr(hero.meta, 'cta_label')
    if (label) c.hero.primary = { label, target: { kind: 'auto' } }
    const benefits = metaList(hero.meta, 'benefit_list')
    if (benefits) c.hero.benefits = benefits.filter((b): b is string => typeof b === 'string' && !!b.trim()).slice(0, 4).map(b => b.trim().slice(0, 40))
    const img = metaStr(hero.meta, 'hero_image_url')
    if (img) c.hero.visual = { kind: 'image', imageUrl: img }
    const guest = metaStr(hero.meta, 'cta_url_guest')
    const auth = metaStr(hero.meta, 'cta_url_auth')
    if (guest) c.settings.ctaUrlGuest = guest
    if (auth) c.settings.ctaUrlAuth = auth
  }

  // Cara Kerja
  const steps = bySection('how_it_works')
  if (steps.length) {
    c.howItWorks.items = steps.slice(0, 4).map(r => ({
      id: `step_${r.id}`,
      icon: STEP_ICON[metaStr(r.meta, 'icon') ?? ''] ?? 'sparkle',
      title: r.title,
      description: r.subtitle ?? '',
    }))
  }

  // Fitur → row 1 (row 2 keeps the new Telegram & Dua Bahasa defaults)
  const feats = bySection('features')
  if (feats.length) {
    c.features.rows[0].items = feats.slice(0, 4).map(r => ({
      id: `feat_${r.id}`,
      icon: FEATURE_ICON[r.slug] ?? 'sparkle',
      title: r.title,
      description: r.subtitle ?? '',
    }))
  }

  // Statistik — user/meal counts become automatic metrics (no stale numbers);
  // anything else is kept as a manual value (with the builder's warning).
  const stats = bySection('stats')
  if (stats.length) {
    c.stats.items = stats.slice(0, 4).map((r): StatItem => {
      const label = r.subtitle ?? ''
      const auto = /pengguna|user/i.test(label) ? 'users_active' as const
        : /makanan|meal|catat/i.test(label) ? 'meals_total' as const
        : null
      return auto
        // Keep the old number as the shown value until the first publish recounts it.
        ? { id: `stat_${r.id}`, source: 'auto', metric: auto, format: 'floor_plus', value: '', label, resolvedValue: r.title.trim() || null }
        : { id: `stat_${r.id}`, source: 'manual', metric: null, format: 'full', value: r.title, label, resolvedValue: null }
    })
  }

  // CTA bawah
  const cta = bySection('cta')[0]
  if (cta) {
    if (cta.title.trim()) c.cta.title = cta.title
    if (cta.subtitle?.trim()) c.cta.subtitle = cta.subtitle
    const label = metaStr(cta.meta, 'cta_label')
    if (label) c.cta.button = { label, target: { kind: 'auto' } }
  }

  // Footer rows (section = 'footer', typed by meta.type)
  const footer = bySection('footer')
  if (footer.length) {
    const brand = footer.find(r => r.meta?.type === 'brand' || r.slug === 'footer-brand')
    if (brand?.title.trim()) c.header.brandName = brand.title.trim().slice(0, 30)
    const tagline = footer.find(r => r.meta?.type === 'tagline' || r.slug === 'footer-tagline')
    if (tagline?.subtitle?.trim()) c.footer.tagline = tagline.subtitle.trim()
    const copyright = footer.find(r => r.meta?.type === 'copyright' || r.slug === 'footer-copyright')
    if (copyright?.title.trim()) c.footer.copyright = copyright.title.trim().replace(/\b(19|20)\d{2}\b/, '{tahun}')

    const social = footer.find(r => r.meta?.type === 'social' || r.slug === 'footer-social')
    if (social) {
      const socials = metaLinks(social.meta).flatMap(l => {
        const platform = detectPlatform(l.label, l.url)
        return platform ? [{ id: newId('soc'), platform, url: platform === 'telegram' ? '' : l.url }] : []
      })
      if (socials.length) c.footer.socials = socials
    }

    const groups = footer.filter(r => r.meta?.type === 'links_group')
    if (groups.length) {
      c.footer.groups = groups.slice(0, 4).map(g => ({
        id: `grp_${g.id}`,
        name: g.title,
        kind: /legal/i.test(g.title) ? 'legal' as const : 'custom' as const,
        links: metaLinks(g.meta).map(l => ({ id: newId('lnk'), label: l.label, target: targetFromUrl(l.url) })),
      }))
      // Migrated groups keep their exact links; the admin can switch on sync.
      c.footer.legalAutoSync = false
    }
  }

  if (opts.telegramBotUrl) {
    c.settings.stores.telegram = { enabled: true, url: opts.telegramBotUrl }
  }

  return c
}

// ── New document → legacy API shapes ────────────────────────────────────────

const EPOCH = new Date(0)
function row(id: number, section: string, slug: string, title: string, subtitle: string | null, meta: Record<string, unknown> | null, sortOrder: number, at: Date): LegacyRow {
  return { id, section, slug, title, subtitle, body: null, meta, isActive: true, sortOrder, createdAt: at, updatedAt: at }
}

function linkUrl(l: Link, c: LandingContent): string {
  const r = resolveTarget(l.target, c.settings)
  return r.kind === 'auto' ? r.guestHref : r.href
}

const LEGACY_STEP_ICON: Partial<Record<IconKey, string>> = { camera: 'camera', sparkle: 'brain', chart: 'chart' }

/** Same shape as the old getLandingContentGrouped() — only visible sections. */
export function toLegacySectionMap(c: LandingContent, updatedAt: Date = EPOCH, legalLinks?: LegacyLink[]): LegacySectionMap {
  const out: LegacySectionMap = {}
  const vis = (k: SectionKey) => c.visibility[k] !== false
  let id = 1

  if (vis('hero')) {
    out.hero = [row(id++, 'hero', 'hero-main', c.hero.title, c.hero.subtitle, {
      cta_label: c.hero.primary.label,
      cta_note: '',
      cta_url_guest: c.settings.ctaUrlGuest,
      cta_url_auth: c.settings.ctaUrlAuth,
      benefit_list: c.hero.benefits,
      ...(c.hero.visual.kind === 'image' && c.hero.visual.imageUrl ? { hero_image_url: c.hero.visual.imageUrl } : {}),
    }, 0, updatedAt)]
  }
  if (vis('howItWorks') && c.howItWorks.items.length) {
    out.how_it_works = c.howItWorks.items.map((s, i) =>
      row(id++, 'how_it_works', `step-${s.id}`, s.title, s.description, { step: i + 1, icon: LEGACY_STEP_ICON[s.icon] ?? s.icon }, i, updatedAt))
  }
  const features = c.features.rows.flatMap(r => r.items)
  if (vis('features') && features.length) {
    out.features = features.map((f, i) => row(id++, 'features', `fitur-${f.id}`, f.title, f.description, null, i, updatedAt))
  }
  if (vis('stats') && c.stats.items.length) {
    out.stats = c.stats.items.map((s, i) =>
      row(id++, 'stats', `stat-${s.id}`, (s.source === 'auto' ? s.resolvedValue : s.value) ?? '', s.label, null, i, updatedAt))
  }
  if (vis('cta')) {
    out.cta = [row(id++, 'cta', 'cta-bottom', c.cta.title, c.cta.subtitle, {
      cta_label: c.cta.button.label,
      cta_note: '',
      cta_url_guest: c.settings.ctaUrlGuest,
      cta_url_auth: c.settings.ctaUrlAuth,
      benefit_list: [],
    }, 0, updatedAt)]
  }
  const footerRows = Object.values(toLegacyFooter(c, updatedAt, 1000, legalLinks))
  if (footerRows.length) out.footer = footerRows
  return out
}

/** Same shape as the old getFooterContentBySlug(). */
export function toLegacyFooter(c: LandingContent, updatedAt: Date = EPOCH, idBase = 1000, legalLinks?: LegacyLink[]): LegacyFooterBySlug {
  const out: LegacyFooterBySlug = {}
  let id = idBase
  let order = 0
  const add = (r: LegacyRow) => { out[r.slug] = r }
  add(row(id++, 'footer', 'footer-brand', c.header.brandName, 'AI Nutrition Companion', { type: 'brand' }, order++, updatedAt))
  add(row(id++, 'footer', 'footer-tagline', 'Tagline', c.footer.tagline, { type: 'tagline' }, order++, updatedAt))
  c.footer.groups.forEach((g, i) => {
    const links: LegacyLink[] = g.kind === 'legal' && c.footer.legalAutoSync && legalLinks
      ? legalLinks
      : g.links.map(l => ({ label: l.label, url: linkUrl(l, c) }))
    add(row(id++, 'footer', `footer-group-${i + 1}`, g.name, null, { type: 'links_group', links }, order++, updatedAt))
  })
  const telegramUrl = c.settings.stores.telegram.url
  const socials: LegacyLink[] = c.footer.socials.flatMap(s => {
    const url = s.platform === 'telegram' ? telegramUrl : s.url
    return url ? [{ label: s.platform.charAt(0).toUpperCase() + s.platform.slice(1), url }] : []
  })
  if (socials.length) add(row(id++, 'footer', 'footer-social', 'Sosial', null, { type: 'social', links: socials }, order++, updatedAt))
  add(row(id++, 'footer', 'footer-copyright', applyYearToken(c.footer.copyright), null, { type: 'copyright' }, order++, updatedAt))
  return out
}
