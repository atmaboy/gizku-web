/**
 * "Aturan terbit" — the hard limits and rules checked when an admin clicks
 * Terbitkan (and shown live in the builder). Drafts may break these; the
 * published document never does.
 *
 * Errors block publishing (HTTP 422, listed per section in the modal).
 * Warnings don't block — e.g. a visible Testimoni section with 0 live items
 * is auto-hidden instead.
 */
import { htmlTextLength } from './format'
import type { BuilderSection, LandingContent, Link, LinkTarget } from './schema'

export const LIMITS = {
  linkLabel: 40,
  eyebrow: 40,
  heroTitle: 80,
  heroSubtitle: 160,
  benefits: 4,
  benefit: 40,
  statsIntro: 70,
  statItems: 4,
  statLabel: 40,
  statValue: 16,
  sectionTitle: 80,
  sectionSubtitle: 200,
  steps: 4,
  stepTitle: 40,
  stepDescription: 120,
  featuresPerRow: 4,
  featureTitle: 60,
  featureDescription: 160,
  testimonialName: 60,
  testimonialCity: 60,
  quote: 240,
  question: 140,
  answer: 500,
  ctaTitle: 70,
  ctaSubtitle: 200,
  nav: 5,
  footerGroups: 4,
  tagline: 160,
  seoTitle: 60,
  seoDescription: 160,
} as const

export type IssueSection = BuilderSection | 'settings'
export type PublishIssue = { section: IssueSection; message: string; itemId?: string }
export type PublishCheck = { errors: PublishIssue[]; warnings: PublishIssue[] }

const isHttps = (u: string) => /^https:\/\/[^\s/]+\.[^\s]+/i.test(u.trim())
const isMailto = (u: string) => /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(u.trim())

export function checkTarget(t: LinkTarget, opts: { allowMailto?: boolean } = {}): string | null {
  if (t.kind === 'external') {
    if (!t.url.trim()) return 'URL belum diisi'
    if (isHttps(t.url)) return null
    if (opts.allowMailto && isMailto(t.url)) return null
    return opts.allowMailto ? 'URL harus diawali https:// atau mailto:' : 'URL eksternal harus diawali https://'
  }
  if (t.kind === 'internal') {
    if (!t.path.startsWith('/') || t.path.startsWith('//')) return 'URL internal harus diawali /'
  }
  return null
}

export function validateForPublish(c: LandingContent): PublishCheck {
  const errors: PublishIssue[] = []
  const warnings: PublishIssue[] = []
  const err = (section: IssueSection, message: string, itemId?: string) => errors.push({ section, message, itemId })
  const warn = (section: IssueSection, message: string, itemId?: string) => warnings.push({ section, message, itemId })
  const max = (section: IssueSection, label: string, v: string, n: number, itemId?: string) => {
    if (v.length > n) err(section, `${label} maksimal ${n} karakter (sekarang ${v.length})`, itemId)
  }
  const required = (section: IssueSection, label: string, v: string, itemId?: string) => {
    if (!v.trim()) err(section, `${label} wajib diisi`, itemId)
  }
  const link = (section: IssueSection, label: string, l: Link, opts: { allowMailto?: boolean; optionalLabel?: boolean } = {}) => {
    if (!opts.optionalLabel) required(section, `Label ${label}`, l.label)
    max(section, `Label ${label}`, l.label, LIMITS.linkLabel)
    const e = checkTarget(l.target, opts)
    if (e) err(section, `${label}: ${e}`)
  }
  const vis = c.visibility

  // ── Settings ──
  const s = c.settings
  for (const [label, url] of [['Tujuan otomatis (belum login)', s.ctaUrlGuest], ['Tujuan otomatis (sudah login)', s.ctaUrlAuth]] as const) {
    if (!(url.startsWith('/') && !url.startsWith('//')) && !isHttps(url)) err('settings', `${label} harus diawali / atau https://`)
  }
  const storeNames = { appStore: 'App Store', googlePlay: 'Google Play', telegram: 'Telegram' } as const
  for (const k of ['appStore', 'googlePlay', 'telegram'] as const) {
    const st = s.stores[k]
    if (st.url.trim() && !isHttps(st.url)) err('settings', `Tautan ${storeNames[k]} harus diawali https://`)
    if (st.enabled && !st.url.trim()) warn('settings', `${storeNames[k]} aktif tapi tautannya kosong — badge tidak ditampilkan`)
  }
  required('settings', 'Judul halaman (SEO)', s.seo.title)
  max('settings', 'Judul halaman (SEO)', s.seo.title, LIMITS.seoTitle)
  required('settings', 'Deskripsi (SEO)', s.seo.description)
  max('settings', 'Deskripsi (SEO)', s.seo.description, LIMITS.seoDescription)
  if (s.seo.ogImageUrl && !isHttps(s.seo.ogImageUrl)) err('settings', 'Gambar OG harus berupa URL https://')

  // ── Header ──
  const h = c.header
  required('header', 'Nama brand', h.brandName)
  max('header', 'Nama brand', h.brandName, 30)
  if (h.nav.length > LIMITS.nav) err('header', `Menu navigasi maksimal ${LIMITS.nav}`)
  h.nav.forEach((n, i) => {
    if (!n.active) return
    required('header', `Label menu #${i + 1}`, n.label, n.id)
    max('header', `Label menu #${i + 1}`, n.label, LIMITS.linkLabel, n.id)
    const e = checkTarget(n.target)
    if (e) err('header', `Menu "${n.label || i + 1}": ${e}`, n.id)
  })
  link('header', 'tombol kanan', h.button)
  if (h.logoUrl && !isHttps(h.logoUrl)) err('header', 'Logo harus berupa URL https://')

  // ── Hero ──
  if (vis.hero) {
    const x = c.hero
    max('hero', 'Label kecil', x.eyebrow, LIMITS.eyebrow)
    required('hero', 'Judul', x.title)
    max('hero', 'Judul', x.title, LIMITS.heroTitle)
    max('hero', 'Deskripsi', x.subtitle, LIMITS.heroSubtitle)
    link('hero', 'tombol utama', x.primary)
    if (x.secondary && x.secondary.label.trim()) link('hero', 'tombol kedua', x.secondary)
    if (x.benefits.length > LIMITS.benefits) err('hero', `Poin keunggulan maksimal ${LIMITS.benefits}`)
    x.benefits.forEach(b => max('hero', `Poin "${b.slice(0, 20)}…"`, b, LIMITS.benefit))
    if (x.visual.kind === 'image' && !x.visual.imageUrl) err('hero', 'Visual "Gambar kustom" dipilih tapi gambar belum diupload')
  }

  // ── Stats ──
  if (vis.stats) {
    const x = c.stats
    max('stats', 'Kalimat pengantar', x.intro, LIMITS.statsIntro)
    if (x.items.length > LIMITS.statItems) err('stats', `Angka maksimal ${LIMITS.statItems}`)
    x.items.forEach((it, i) => {
      required('stats', `Label angka #${i + 1}`, it.label, it.id)
      max('stats', `Label angka #${i + 1}`, it.label, LIMITS.statLabel, it.id)
      if (it.source === 'auto' && !it.metric) err('stats', `Angka #${i + 1}: pilih metrik otomatis`, it.id)
      if (it.source === 'manual') {
        required('stats', `Nilai angka #${i + 1}`, it.value, it.id)
        max('stats', `Nilai angka #${i + 1}`, it.value, LIMITS.statValue, it.id)
      }
    })
    if (x.items.length === 0) warn('stats', 'Belum ada angka — section Statistik tidak ditampilkan')
  }

  // ── Cara Kerja ──
  if (vis.howItWorks) {
    const x = c.howItWorks
    max('howItWorks', 'Label kecil', x.eyebrow, LIMITS.eyebrow)
    required('howItWorks', 'Judul', x.title)
    max('howItWorks', 'Judul', x.title, LIMITS.sectionTitle)
    max('howItWorks', 'Deskripsi', x.subtitle, LIMITS.sectionSubtitle)
    if (x.items.length > LIMITS.steps) err('howItWorks', `Langkah maksimal ${LIMITS.steps}`)
    x.items.forEach((it, i) => {
      required('howItWorks', `Judul langkah ${i + 1}`, it.title, it.id)
      max('howItWorks', `Judul langkah ${i + 1}`, it.title, LIMITS.stepTitle, it.id)
      max('howItWorks', `Deskripsi langkah ${i + 1}`, it.description, LIMITS.stepDescription, it.id)
    })
    if (x.items.length === 0) warn('howItWorks', 'Belum ada langkah — section Cara Kerja tidak ditampilkan')
  }

  // ── Fitur ──
  if (vis.features) {
    const x = c.features
    max('features', 'Label kecil', x.eyebrow, LIMITS.eyebrow)
    required('features', 'Judul', x.title)
    max('features', 'Judul', x.title, LIMITS.sectionTitle)
    max('features', 'Deskripsi', x.subtitle, LIMITS.sectionSubtitle)
    x.rows.forEach((row, r) => {
      if (row.items.length > LIMITS.featuresPerRow) err('features', `Baris ${r + 1}: fitur maksimal ${LIMITS.featuresPerRow}`)
      if (row.visual.kind === 'image' && !row.visual.imageUrl && row.items.length > 0) err('features', `Baris ${r + 1}: gambar kustom belum diupload`)
      row.items.forEach(it => {
        required('features', 'Judul fitur', it.title, it.id)
        max('features', `Judul fitur "${it.title}"`, it.title, LIMITS.featureTitle, it.id)
        max('features', `Deskripsi fitur "${it.title}"`, it.description, LIMITS.featureDescription, it.id)
      })
    })
    if (x.rows.every(r => r.items.length === 0)) warn('features', 'Belum ada fitur — section Fitur tidak ditampilkan')
  }

  // ── Testimoni ──
  {
    const x = c.testimonials
    x.items.forEach((it, i) => {
      const who = it.name.trim() || `#${i + 1}`
      if (it.status === 'live' && !it.consentAt) err('testimonials', `Testimoni ${who}: status Tayang wajib ada izin pengguna`, it.id)
      if (it.status !== 'live') return
      required('testimonials', `Nama testimoni #${i + 1}`, it.name, it.id)
      max('testimonials', `Nama testimoni ${who}`, it.name, LIMITS.testimonialName, it.id)
      max('testimonials', `Kota testimoni ${who}`, it.city, LIMITS.testimonialCity, it.id)
      required('testimonials', `Kutipan testimoni ${who}`, it.quote, it.id)
      max('testimonials', `Kutipan testimoni ${who}`, it.quote, LIMITS.quote, it.id)
      if (it.avatarUrl && !isHttps(it.avatarUrl)) err('testimonials', `Foto testimoni ${who} harus URL https://`, it.id)
    })
    if (vis.testimonials) {
      required('testimonials', 'Judul', x.title)
      max('testimonials', 'Judul', x.title, LIMITS.sectionTitle)
      max('testimonials', 'Deskripsi', x.subtitle, LIMITS.sectionSubtitle)
      if (!x.items.some(it => it.status === 'live' && it.consentAt)) {
        warn('testimonials', 'Belum ada testimoni Tayang — section Testimoni otomatis disembunyikan')
      }
    }
  }

  // ── FAQ ──
  if (vis.faq) {
    const x = c.faq
    max('faq', 'Label kecil', x.eyebrow, LIMITS.eyebrow)
    required('faq', 'Judul', x.title)
    max('faq', 'Judul', x.title, LIMITS.sectionTitle)
    max('faq', 'Deskripsi', x.subtitle, LIMITS.sectionSubtitle)
    if (x.contact.label.trim()) link('faq', 'tombol kontak', x.contact, { allowMailto: true })
    x.items.forEach((it, i) => {
      if (it.status !== 'live') return
      required('faq', `Pertanyaan #${i + 1}`, it.question, it.id)
      max('faq', `Pertanyaan #${i + 1}`, it.question, LIMITS.question, it.id)
      if (!it.answerHtml.replace(/<[^>]*>/g, '').trim()) err('faq', `Jawaban "${it.question}" wajib diisi`, it.id)
      if (htmlTextLength(it.answerHtml) > LIMITS.answer) err('faq', `Jawaban "${it.question}" maksimal ${LIMITS.answer} karakter`, it.id)
    })
    if (!x.items.some(it => it.status === 'live')) warn('faq', 'Belum ada pertanyaan Tayang — section FAQ tidak ditampilkan')
  }

  // ── CTA ──
  if (vis.cta) {
    const x = c.cta
    required('cta', 'Judul', x.title)
    max('cta', 'Judul', x.title, LIMITS.ctaTitle)
    max('cta', 'Deskripsi', x.subtitle, LIMITS.ctaSubtitle)
    link('cta', 'tombol', x.button)
    max('cta', 'Teks di atas badge', x.badgeLabel, 60)
  }

  // ── Footer ──
  {
    const x = c.footer
    max('footer', 'Tagline', x.tagline, LIMITS.tagline)
    if (x.groups.length > LIMITS.footerGroups) err('footer', `Grup link maksimal ${LIMITS.footerGroups}`)
    x.groups.forEach(g => {
      required('footer', 'Nama grup link', g.name, g.id)
      if (g.kind === 'legal' && x.legalAutoSync) return
      g.links.forEach(l => {
        required('footer', `Label link di grup "${g.name}"`, l.label, l.id)
        const e = checkTarget(l.target, { allowMailto: true })
        if (e) err('footer', `Link "${l.label}" (${g.name}): ${e}`, l.id)
      })
    })
    x.socials.forEach(so => {
      if (so.platform === 'telegram') return
      if (so.url.trim() && !isHttps(so.url)) err('footer', `Sosial media ${so.platform}: URL harus diawali https://`, so.id)
    })
    required('footer', 'Teks copyright', x.copyright)
  }

  return { errors, warnings }
}
