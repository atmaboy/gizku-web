import { describe, expect, it } from 'vitest'
import { DEFAULT_CONTENT, cloneDefault } from './defaults'
import { countDiff, diffContent, totalChanges } from './diff'
import { applyYearToken, formatFloorPlus, htmlTextLength } from './format'
import { buildFromLegacy, toLegacyFooter, toLegacySectionMap, type LegacyRow } from './legacy'
import { resolveTarget, targetFromUrl } from './links'
import { validateForPublish } from './publish-rules'
import { buildRenderModel } from './render'
import { sanitizeFaqHtml, safeHref } from './sanitize'
import { LandingContent, PATCH_PATHS } from './schema'
import { applyMetrics } from './stats'

const at = new Date('2026-01-01T00:00:00Z')
const row = (id: number, section: string, slug: string, title: string, subtitle: string | null, meta: Record<string, unknown> | null = null, sortOrder = 0, isActive = true): LegacyRow =>
  ({ id, section, slug, title, subtitle, body: null, meta, isActive, sortOrder, createdAt: at, updatedAt: at })

const LEGACY: LegacyRow[] = [
  row(1, 'hero', 'hero-main', 'Kenali Isi Piringmu,\nTanpa Ribet', 'Sub hero', { cta_label: 'Mulai', cta_url_guest: '/daftar', cta_url_auth: '/main', benefit_list: ['A', 'B'], hero_image_url: 'https://x.test/h.png' }),
  row(2, 'how_it_works', 'step-1', 'Foto', 'Ambil foto', { icon: 'camera' }, 0),
  row(3, 'how_it_works', 'step-2', 'Analisa', 'AI', { icon: 'brain' }, 1),
  row(4, 'features', 'fitur-scan', 'Scan', 'Cepat', null, 0),
  row(5, 'stats', 's1', '10.000+', 'Pengguna Aktif', null, 0),
  row(6, 'stats', 's2', '95%', 'Akurasi Pengenalan', null, 1),
  row(7, 'cta', 'cta-bottom', 'CTA judul', 'CTA sub', { cta_label: 'Gas' }),
  row(8, 'blog_post', 'b1', 'Blog', 'x'),
  row(9, 'footer', 'footer-tagline', 'Tagline', 'Tag baru', { type: 'tagline' }),
  row(10, 'footer', 'footer-copyright', '© 2025 Gizku.', null, { type: 'copyright' }),
  row(11, 'footer', 'footer-g1', 'Produk', null, { type: 'links_group', links: [{ label: 'Fitur', url: '#fitur' }, { label: 'Web', url: 'https://gizku.com' }] }),
  row(12, 'footer', 'footer-social', 'Sosial', null, { type: 'social', links: [{ label: 'Instagram', url: 'https://instagram.com/gizku' }] }),
  row(13, 'features', 'fitur-off', 'Nonaktif', 'x', null, 5, false),
]

describe('schema', () => {
  it('default content is valid', () => {
    expect(() => LandingContent.parse(DEFAULT_CONTENT)).not.toThrow()
  })
  it('every PATCH path validates its slice of the default', () => {
    for (const [path, schema] of Object.entries(PATCH_PATHS)) {
      expect(() => schema.parse(DEFAULT_CONTENT[path as keyof typeof DEFAULT_CONTENT]), path).not.toThrow()
    }
  })
  it('rejects a broken order', () => {
    const c = cloneDefault()
    c.order = ['hero', 'hero', 'stats', 'howItWorks', 'features', 'faq', 'cta']
    expect(LandingContent.safeParse(c).success).toBe(false)
  })
  it('drafts may exceed copy limits (publish rules enforce them)', () => {
    const c = cloneDefault()
    c.settings.seo.description = 'x'.repeat(178)
    expect(LandingContent.safeParse(c).success).toBe(true)
  })
})

describe('format', () => {
  it.each([
    [0, '0'], [7, '7'], [437, '430+'], [999, '990+'], [1000, '1.000+'], [12431, '12.000+'],
    [99999, '99.000+'], [100000, '100.000+'], [523900, '520.000+'],
  ])('floor_plus(%i) = %s', (n, out) => expect(formatFloorPlus(n)).toBe(out))
  it('year token', () => expect(applyYearToken('© {tahun} Gizku', 2031)).toBe('© 2031 Gizku'))
  it('html text length', () => expect(htmlTextLength('<p>Ya <strong>bisa</strong></p>')).toBe(7))
})

describe('diff', () => {
  it('no changes → empty', () => {
    expect(diffContent(DEFAULT_CONTENT, cloneDefault())).toEqual({})
  })
  it('counts field edits, item edits, visibility and order', () => {
    const d = cloneDefault()
    d.hero.title = 'Baru'
    d.hero.subtitle = 'Baru juga'
    d.faq.items[1].status = 'live'
    d.visibility.faq = false
    d.order = ['hero', 'howItWorks', 'stats', 'features', 'testimonials', 'faq', 'cta']
    const ch = diffContent(DEFAULT_CONTENT, d)
    expect(ch).toEqual({ hero: 2, faq: 2, order: 1 })
    expect(totalChanges(ch)).toBe(5)
  })
  it('reordering items counts once', () => {
    const a = DEFAULT_CONTENT.howItWorks.items
    expect(countDiff(a, [...a].reverse())).toBe(1)
  })
  it('added + removed items', () => {
    const a = DEFAULT_CONTENT.howItWorks.items
    expect(countDiff(a, [...a.slice(1), { ...a[0], id: 'new' }])).toBe(2)
  })
})

describe('legacy', () => {
  const c = buildFromLegacy(LEGACY, { telegramBotUrl: 'https://t.me/gizku_bot' })
  it('maps legacy rows onto a valid document', () => {
    expect(() => LandingContent.parse(c)).not.toThrow()
    expect(c.hero.title).toBe('Kenali Isi Piringmu,\nTanpa Ribet')
    expect(c.hero.primary.label).toBe('Mulai')
    expect(c.hero.visual).toEqual({ kind: 'image', imageUrl: 'https://x.test/h.png' })
    expect(c.settings.ctaUrlGuest).toBe('/daftar')
    expect(c.howItWorks.items.map(s => s.icon)).toEqual(['camera', 'sparkle'])
    expect(c.features.rows[0].items).toHaveLength(1) // inactive row ignored
    expect(c.features.rows[1].items.map(f => f.id)).toEqual(['feat_telegram', 'feat_bahasa'])
    expect(c.stats.items[0]).toMatchObject({ source: 'auto', metric: 'users_active', resolvedValue: '10.000+' })
    expect(c.stats.items[1]).toMatchObject({ source: 'manual', value: '95%' })
    expect(c.footer.copyright).toBe('© {tahun} Gizku.')
    expect(c.footer.groups[0].links[0].target).toEqual({ kind: 'section', section: 'features' })
    expect(c.footer.socials[0].platform).toBe('instagram')
    expect(c.settings.stores.telegram).toEqual({ enabled: true, url: 'https://t.me/gizku_bot' })
    expect(c.testimonials.items).toEqual([])
    expect(c.visibility.testimonials).toBe(false)
  })

  it('toLegacySectionMap keeps the old /api/landing-content shape', () => {
    const map = toLegacySectionMap(applyMetrics(c, { users_active: 12431, users_login_30d: 1, meals_total: 5 }), at)
    expect(Object.keys(map)).toEqual(['hero', 'how_it_works', 'features', 'stats', 'cta', 'footer'])
    const keys = ['id', 'section', 'slug', 'title', 'subtitle', 'body', 'meta', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
    for (const rows of Object.values(map)) for (const r of rows) expect(Object.keys(r).sort()).toEqual([...keys].sort())
    expect(map.hero[0].meta).toMatchObject({ cta_label: 'Mulai', cta_url_guest: '/daftar', cta_url_auth: '/main', benefit_list: ['A', 'B'], hero_image_url: 'https://x.test/h.png' })
    expect(map.how_it_works.map(r => r.meta)).toEqual([{ step: 1, icon: 'camera' }, { step: 2, icon: 'brain' }])
    expect(map.stats.map(r => [r.title, r.subtitle])).toEqual([['12.000+', 'Pengguna Aktif'], ['95%', 'Akurasi Pengenalan']])
  })

  it('hidden sections are left out of the legacy map', () => {
    const d = cloneDefault()
    d.visibility.stats = false
    expect(toLegacySectionMap(d).stats).toBeUndefined()
  })

  it('toLegacyFooter keeps the old /api/footer-content slugs', () => {
    const f = toLegacyFooter(c, at, 1000, [{ label: 'Privasi', url: '/legal/privasi' }])
    expect(Object.keys(f)).toEqual(['footer-brand', 'footer-tagline', 'footer-group-1', 'footer-social', 'footer-copyright'])
    expect(f['footer-group-1'].meta).toEqual({ type: 'links_group', links: [{ label: 'Fitur', url: '#fitur' }, { label: 'Web', url: 'https://gizku.com' }] })
    expect(f['footer-social'].meta).toEqual({ type: 'social', links: [{ label: 'Instagram', url: 'https://instagram.com/gizku' }] })
    expect(f['footer-copyright'].title).toMatch(/^© \d{4} Gizku\.$/)
  })
})

describe('links', () => {
  it('resolves targets', () => {
    const s = { ctaUrlGuest: '/login', ctaUrlAuth: '/main/riwayat' }
    expect(resolveTarget({ kind: 'section', section: 'faq' }, s)).toEqual({ kind: 'static', href: '#faq', external: false })
    expect(resolveTarget({ kind: 'auto' }, s)).toEqual({ kind: 'auto', guestHref: '/login', authHref: '/main/riwayat' })
    expect(resolveTarget({ kind: 'external', url: 'https://x.id' }, s)).toMatchObject({ external: true })
  })
  it('parses legacy urls', () => {
    expect(targetFromUrl('#cara-kerja')).toEqual({ kind: 'section', section: 'howItWorks' })
    expect(targetFromUrl('/login')).toEqual({ kind: 'internal', path: '/login' })
    expect(targetFromUrl('mailto:a@b.co')).toEqual({ kind: 'external', url: 'mailto:a@b.co' })
  })
})

describe('render model', () => {
  it('hides sections without content and nav to them', () => {
    const m = buildRenderModel(DEFAULT_CONTENT)
    expect(m.sections).not.toContain('testimonials') // hidden
    expect(m.stores).toEqual([]) // stores default off
  })
  it('testimonials need live + consent', () => {
    const c = cloneDefault()
    c.visibility.testimonials = true
    c.testimonials.items = [{ id: 't', name: 'A', city: '', rating: 5, quote: 'q', avatarUrl: null, consentAt: null, status: 'live' }]
    expect(buildRenderModel(c).sections).not.toContain('testimonials')
    c.testimonials.items[0].consentAt = new Date().toISOString()
    expect(buildRenderModel(c).sections).toContain('testimonials')
  })
  it('store badge needs switch + url', () => {
    const c = cloneDefault()
    c.settings.stores.appStore = { enabled: true, url: '' }
    c.settings.stores.googlePlay = { enabled: true, url: 'https://play.google.com/x' }
    expect(buildRenderModel(c).stores.map(s => s.key)).toEqual(['googlePlay'])
  })
  it('legal group mirrors legal docs when synced', () => {
    const m = buildRenderModel(DEFAULT_CONTENT, { legalDocs: [{ slug: 'privasi', title: 'Privasi' }] })
    const legal = m.content.footer.groups.find(g => g.kind === 'legal')!
    expect(legal.links.map(l => l.label)).toEqual(['Privasi'])
  })
})

describe('publish rules', () => {
  it('default content publishes cleanly', () => {
    expect(validateForPublish(DEFAULT_CONTENT).errors).toEqual([])
  })
  it('SEO description > 160 blocks publish', () => {
    const c = cloneDefault()
    c.settings.seo.description = 'x'.repeat(161)
    expect(validateForPublish(c).errors.map(e => e.section)).toContain('settings')
  })
  it('live testimonial without consent blocks publish', () => {
    const c = cloneDefault()
    c.testimonials.items = [{ id: 't1', name: 'A', city: '', rating: 5, quote: 'q', avatarUrl: null, consentAt: null, status: 'live' }]
    expect(validateForPublish(c).errors).toEqual([expect.objectContaining({ section: 'testimonials', itemId: 't1' })])
  })
  it('visible testimonials with nothing live is a warning, not an error', () => {
    const c = cloneDefault()
    c.visibility.testimonials = true
    const r = validateForPublish(c)
    expect(r.errors).toEqual([])
    expect(r.warnings.map(w => w.section)).toContain('testimonials')
  })
  it('external links must be https (mailto allowed for FAQ contact)', () => {
    const c = cloneDefault()
    c.hero.primary = { label: 'X', target: { kind: 'external', url: 'http://insecure.test' } }
    c.faq.contact = { label: 'Mail', target: { kind: 'external', url: 'mailto:support@gizku.com' } }
    const sections = validateForPublish(c).errors.map(e => e.section)
    expect(sections).toContain('hero')
    expect(sections).not.toContain('faq')
  })
  it('title required for visible sections only', () => {
    const c = cloneDefault()
    c.howItWorks.title = ''
    expect(validateForPublish(c).errors.map(e => e.section)).toContain('howItWorks')
    c.visibility.howItWorks = false
    expect(validateForPublish(c).errors.map(e => e.section)).not.toContain('howItWorks')
  })
})

describe('sanitize', () => {
  it('keeps the allowlist and safe links', () => {
    expect(sanitizeFaqHtml('<p>Hi <strong>x</strong> <a href="/legal/a" onclick="x()">a</a></p>'))
      .toBe('<p>Hi <strong>x</strong> <a href="/legal/a">a</a></p>')
    expect(sanitizeFaqHtml('<p><a href="https://x.id">x</a></p>'))
      .toBe('<p><a href="https://x.id" target="_blank" rel="noopener noreferrer">x</a></p>')
  })
  it('drops scripts, handlers and javascript: urls', () => {
    const out = sanitizeFaqHtml('<script>alert(1)</script><p><img src=x onerror=alert(1)><a href="java&#10;script:alert(1)">y</a></p>')
    expect(out).toBe('<p>y</p>')
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('//evil.test')).toBeNull()
  })
  it('wraps bare text in <p>', () => {
    expect(sanitizeFaqHtml('Halo<div>dunia</div>')).toBe('<p>Halo</p><p>dunia</p>')
  })
})
