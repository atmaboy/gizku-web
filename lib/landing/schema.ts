/**
 * Landing Builder — single source of truth for the shape of the landing page
 * document stored in `landing_page.content` (sql/018).
 *
 * Two levels of validation:
 *  - `LandingContent` (this file) — structural. Used for every autosave PATCH
 *    and every read, so it is deliberately lenient on copy length: an admin
 *    must be able to save a 178-char SEO description as a draft and see the
 *    counter turn red (Acceptance #9).
 *  - `validateForPublish()` (lib/landing/publish-rules.ts) — the spec's hard
 *    limits and publish rules, run on "Terbitkan".
 *
 * Hard caps here (`CAP`) only exist to stop garbage/abuse, never to enforce
 * copywriting limits.
 */
import { z } from 'zod'

export const SCHEMA_VERSION = 1

/** The 7 middle sections — sortable and hideable. Header & footer are locked. */
export const SECTION_KEYS = ['hero', 'stats', 'howItWorks', 'features', 'testimonials', 'faq', 'cta'] as const
export type SectionKey = typeof SECTION_KEYS[number]
export const SectionKey = z.enum(SECTION_KEYS)

/** Every page of the builder, in display order. */
export const BUILDER_SECTIONS = ['header', ...SECTION_KEYS, 'footer'] as const
export type BuilderSection = typeof BUILDER_SECTIONS[number]

export const SECTION_LABELS: Record<BuilderSection, string> = {
  header: 'Header & Navigasi',
  hero: 'Hero',
  stats: 'Statistik',
  howItWorks: 'Cara Kerja',
  features: 'Fitur',
  testimonials: 'Testimoni',
  faq: 'FAQ',
  cta: 'CTA & Download',
  footer: 'Footer',
}

/** URL slug of each builder page (/admin/landing/[slug]). */
export const SECTION_SLUGS: Record<BuilderSection, string> = {
  header: 'header',
  hero: 'hero',
  stats: 'statistik',
  howItWorks: 'cara-kerja',
  features: 'fitur',
  testimonials: 'testimoni',
  faq: 'faq',
  cta: 'cta',
  footer: 'footer',
}
export function sectionFromSlug(slug: string): BuilderSection | null {
  const hit = (Object.entries(SECTION_SLUGS) as [BuilderSection, string][]).find(([, s]) => s === slug)
  return hit ? hit[0] : null
}

/** In-page anchor (without #) each section renders with. */
export const SECTION_ANCHORS: Record<SectionKey, string> = {
  hero: 'top',
  stats: 'statistik',
  howItWorks: 'cara-kerja',
  features: 'fitur',
  testimonials: 'testimoni',
  faq: 'faq',
  cta: 'unduh',
}

const CAP = { short: 200, text: 2000, url: 2048, html: 10000 } as const

const str = (max: number = CAP.short) => z.string().max(max)
const Id = z.string().min(1).max(64)

// ── Links ────────────────────────────────────────────────────────────────────
export const LinkTarget = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('section'), section: SectionKey }),
  z.object({ kind: z.literal('internal'), path: str(CAP.url) }),
  z.object({ kind: z.literal('external'), url: str(CAP.url) }),
  // guest → settings.ctaUrlGuest, logged in → settings.ctaUrlAuth
  z.object({ kind: z.literal('auto') }),
])
export type LinkTarget = z.infer<typeof LinkTarget>

export const Link = z.object({ label: str(), target: LinkTarget })
export type Link = z.infer<typeof Link>

// ── Shared pieces ────────────────────────────────────────────────────────────
export const ICON_KEYS = [
  'camera', 'sparkle', 'chart', 'scan', 'history', 'send', 'bolt', 'globe',
  'shield', 'heart', 'clock', 'bell', 'utensils', 'target',
] as const
export const IconKey = z.enum(ICON_KEYS)
export type IconKey = z.infer<typeof IconKey>

export const STORE_KEYS = ['appStore', 'googlePlay', 'telegram'] as const
export const StoreKey = z.enum(STORE_KEYS)
export type StoreKey = z.infer<typeof StoreKey>

export const ItemStatus = z.enum(['live', 'draft'])
export type ItemStatus = z.infer<typeof ItemStatus>

/** Built-in React mockups (not images) + an uploaded image. */
export const VISUAL_KINDS = ['analysis', 'history', 'telegram', 'image'] as const
export const Visual = z.object({
  kind: z.enum(VISUAL_KINDS),
  imageUrl: str(CAP.url).nullable(),
})
export type Visual = z.infer<typeof Visual>

// ── Settings (global) ────────────────────────────────────────────────────────
const StoreLink = z.object({ enabled: z.boolean(), url: str(CAP.url) })
export const Settings = z.object({
  ctaUrlGuest: str(CAP.url),
  ctaUrlAuth: str(CAP.url),
  stores: z.object({ appStore: StoreLink, googlePlay: StoreLink, telegram: StoreLink }),
  seo: z.object({
    title: str(),
    description: str(CAP.text),
    ogImageUrl: str(CAP.url).nullable(),
  }),
})
export type Settings = z.infer<typeof Settings>

// ── Sections ─────────────────────────────────────────────────────────────────
export const NavItem = z.object({ id: Id, label: str(), target: LinkTarget, active: z.boolean() })
export type NavItem = z.infer<typeof NavItem>

export const Header = z.object({
  brandName: str(),
  logoUrl: str(CAP.url).nullable(),
  nav: z.array(NavItem).max(10),
  button: Link,
  sticky: z.boolean(),
})
export type Header = z.infer<typeof Header>

export const Hero = z.object({
  eyebrow: str(),
  title: str(CAP.text),
  subtitle: str(CAP.text),
  primary: Link,
  secondary: Link.nullable(),
  benefits: z.array(str()).max(8),
  visual: Visual,
  showStoreBadges: z.boolean(),
})
export type Hero = z.infer<typeof Hero>

export const STAT_METRICS = ['users_active', 'users_login_30d', 'meals_total'] as const
export const StatMetric = z.enum(STAT_METRICS)
export type StatMetric = z.infer<typeof StatMetric>
export const StatFormat = z.enum(['floor_plus', 'full'])
export type StatFormat = z.infer<typeof StatFormat>

export const StatItem = z.object({
  id: Id,
  source: z.enum(['auto', 'manual']),
  metric: StatMetric.nullable(),
  format: StatFormat,
  value: str(),
  label: str(),
  /** Written at publish time for `auto` items — the public page never counts. */
  resolvedValue: str().nullable(),
})
export type StatItem = z.infer<typeof StatItem>

export const Stats = z.object({
  intro: str(CAP.text),
  band: z.enum(['green', 'sand', 'dark']),
  items: z.array(StatItem).max(8),
})
export type Stats = z.infer<typeof Stats>

export const Step = z.object({ id: Id, icon: IconKey, title: str(), description: str(CAP.text) })
export type Step = z.infer<typeof Step>

export const HowItWorks = z.object({
  eyebrow: str(),
  title: str(),
  subtitle: str(CAP.text),
  showNumbers: z.boolean(),
  items: z.array(Step).max(8),
})
export type HowItWorks = z.infer<typeof HowItWorks>

export const Feature = z.object({ id: Id, icon: IconKey, title: str(), description: str(CAP.text) })
export type Feature = z.infer<typeof Feature>
export const FeatureRow = z.object({ visual: Visual, items: z.array(Feature).max(8) })
export type FeatureRow = z.infer<typeof FeatureRow>

export const Features = z.object({
  eyebrow: str(),
  title: str(),
  subtitle: str(CAP.text),
  rows: z.tuple([FeatureRow, FeatureRow]),
})
export type Features = z.infer<typeof Features>

export const Testimonial = z.object({
  id: Id,
  name: str(),
  city: str(),
  rating: z.number().int().min(1).max(5),
  quote: str(CAP.text),
  avatarUrl: str(CAP.url).nullable(),
  /** ISO timestamp the admin ticked "pengguna sudah mengizinkan". Required for live. */
  consentAt: z.string().max(40).nullable(),
  status: ItemStatus,
})
export type Testimonial = z.infer<typeof Testimonial>

export const Testimonials = z.object({
  eyebrow: str(),
  title: str(),
  subtitle: str(CAP.text),
  autoplay: z.boolean(),
  showRating: z.boolean(),
  items: z.array(Testimonial).max(50),
})
export type Testimonials = z.infer<typeof Testimonials>

export const FaqItem = z.object({
  id: Id,
  question: str(),
  answerHtml: str(CAP.html),
  openDefault: z.boolean(),
  status: ItemStatus,
})
export type FaqItem = z.infer<typeof FaqItem>

export const Faq = z.object({
  eyebrow: str(),
  title: str(),
  subtitle: str(CAP.text),
  contact: Link,
  items: z.array(FaqItem).max(50),
})
export type Faq = z.infer<typeof Faq>

export const Cta = z.object({
  title: str(),
  subtitle: str(CAP.text),
  button: Link,
  bg: z.enum(['green', 'dark', 'sand']),
  showBadges: z.boolean(),
  badgeLabel: str(),
  badges: z.array(StoreKey).max(3),
})
export type Cta = z.infer<typeof Cta>

export const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'telegram', 'facebook', 'x', 'youtube', 'linkedin', 'whatsapp'] as const
export const SOCIAL_LABELS: Record<typeof SOCIAL_PLATFORMS[number], string> = {
  instagram: 'Instagram', tiktok: 'TikTok', telegram: 'Telegram', facebook: 'Facebook',
  x: 'X (Twitter)', youtube: 'YouTube', linkedin: 'LinkedIn', whatsapp: 'WhatsApp',
}
export const Social = z.object({
  id: Id,
  platform: z.enum(SOCIAL_PLATFORMS),
  /** Ignored for telegram — it follows settings.stores.telegram.url. */
  url: str(CAP.url),
})
export type Social = z.infer<typeof Social>

export const FooterLink = Link.extend({ id: Id })
export type FooterLink = z.infer<typeof FooterLink>
export const LinkGroup = z.object({
  id: Id,
  name: str(),
  /** `legal` groups can mirror the active Legal Documents (footer.legalAutoSync). */
  kind: z.enum(['custom', 'legal']),
  links: z.array(FooterLink).max(20),
})
export type LinkGroup = z.infer<typeof LinkGroup>

export const Footer = z.object({
  tagline: str(CAP.text),
  socials: z.array(Social).max(10),
  groups: z.array(LinkGroup).max(8),
  legalAutoSync: z.boolean(),
  /** `{tahun}` is replaced with the current year at render time. */
  copyright: str(),
})
export type Footer = z.infer<typeof Footer>

const Visibility = z.object(
  Object.fromEntries(SECTION_KEYS.map(k => [k, z.boolean()])) as Record<SectionKey, z.ZodBoolean>,
)
export type Visibility = Record<SectionKey, boolean>

export const LandingContent = z.object({
  order: z.array(SectionKey).length(SECTION_KEYS.length).refine(
    o => new Set(o).size === SECTION_KEYS.length,
    { message: 'Urutan section harus berisi 7 section unik' },
  ),
  visibility: Visibility,
  settings: Settings,
  header: Header,
  hero: Hero,
  stats: Stats,
  howItWorks: HowItWorks,
  features: Features,
  testimonials: Testimonials,
  faq: Faq,
  cta: Cta,
  footer: Footer,
})
export type LandingContent = z.infer<typeof LandingContent>

/** Top-level keys an autosave PATCH may target, each with its own sub-schema. */
export const PATCH_PATHS = {
  order: LandingContent.shape.order,
  visibility: Visibility,
  settings: Settings,
  header: Header,
  hero: Hero,
  stats: Stats,
  howItWorks: HowItWorks,
  features: Features,
  testimonials: Testimonials,
  faq: Faq,
  cta: Cta,
  footer: Footer,
} as const
export type PatchPath = keyof typeof PATCH_PATHS
export const PatchPath = z.enum(Object.keys(PATCH_PATHS) as [PatchPath, ...PatchPath[]])

/**
 * Upgrade an older stored document to the current SCHEMA_VERSION before
 * parsing. v1 is the first version — add `if (version < 2) { … }` steps here
 * when the shape changes, instead of writing a SQL migration.
 */
export function upgradeContent(raw: unknown, version: number): unknown {
  void version
  return raw
}

/** Parse a stored document (throws a ZodError if it doesn't fit). */
export function parseStoredContent(raw: unknown, version = SCHEMA_VERSION): LandingContent {
  return LandingContent.parse(upgradeContent(raw, version))
}

/** Short random id for list items (stable across drag & diff). */
export function newId(prefix = 'i'): string {
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${rnd}`
}
