import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────
type FooterLink = { label: string; href: string; group?: string }
type SocialIcon = 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'facebook' | 'linkedin'
type SocialLink = { icon: SocialIcon; href: string; label?: string }
type AppLink    = { store: 'google_play' | 'app_store'; href: string }
type FooterMeta = {
  links?:     FooterLink[]
  social?:    SocialLink[]
  app_links?: AppLink[]
}
type FooterRow = {
  title:    string
  subtitle: string | null
  body:     string | null
  meta:     FooterMeta | null
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_LINKS: FooterLink[] = [
  { label: 'Fitur',             href: '/#features', group: 'Produk' },
  { label: 'Cara Kerja',        href: '/#how',      group: 'Produk' },
  { label: 'Tentang Kami',      href: '/about',     group: 'Perusahaan' },
  { label: 'Blog',              href: '/blog',      group: 'Perusahaan' },
  { label: 'Kebijakan Privasi', href: '/privacy',   group: 'Legal' },
  { label: 'Syarat Penggunaan', href: '/terms',     group: 'Legal' },
]
const DEFAULT_SOCIAL: SocialLink[] = [
  { icon: 'instagram', href: 'https://instagram.com/gizku.id', label: 'Instagram Gizku' },
  { icon: 'tiktok',    href: 'https://tiktok.com/@gizku.id',   label: 'TikTok Gizku' },
]

// ─── Social Icons ─────────────────────────────────────────────────────────────
function SocialSvg({ icon }: { icon: SocialIcon }) {
  if (icon === 'instagram') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
  if (icon === 'tiktok') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.73a8.16 8.16 0 0 0 4.77 1.52V6.77a4.85 4.85 0 0 1-1-.08z"/>
    </svg>
  )
  if (icon === 'twitter') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
  if (icon === 'youtube') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23 7s-.3-1.9-1.2-2.7c-1.1-1.2-2.4-1.2-3-1.3C16.2 3 12 3 12 3s-4.2 0-6.8.1c-.6.1-1.9.1-3 1.3C1.3 5.2 1 7 1 7S.7 9.1.7 11.3v2c0 2.2.3 4.3.3 4.3s.3 1.9 1.2 2.7c1.1 1.2 2.6 1.1 3.3 1.2C7.1 21.7 12 21.7 12 21.7s4.2 0 6.8-.2c.6-.1 1.9-.1 3-1.3.9-.8 1.2-2.7 1.2-2.7s.3-2.1.3-4.3v-2C23.3 9.1 23 7 23 7zM9.7 15.5v-7.4l8.1 3.7-8.1 3.7z"/>
    </svg>
  )
  if (icon === 'facebook') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
  if (icon === 'linkedin') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
  return null
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────
async function getFooterData(): Promise<FooterRow | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res  = await fetch(`${base}/api/landing?section=footer`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data: FooterRow[] }
    return json.data?.[0] ?? null
  } catch {
    return null
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default async function LandingFooter() {
  const row = await getFooterData()

  const brandName = row?.title    ?? 'Gizku'
  const tagline   = row?.subtitle ?? 'Kenali nutrisimu, hidup lebih sehat.'
  const copyright = row?.body     ?? `© ${new Date().getFullYear()} Gizku. Hak cipta dilindungi.`
  const meta      = row?.meta

  const links:    FooterLink[] = meta?.links     ?? DEFAULT_LINKS
  const social:   SocialLink[] = meta?.social    ?? DEFAULT_SOCIAL
  const appLinks: AppLink[]    = meta?.app_links ?? []

  // Group links by kolom
  const linkGroups = links.reduce<Record<string, FooterLink[]>>((acc, link) => {
    const g = link.group ?? 'Lainnya'
    if (!acc[g]) acc[g] = []
    acc[g].push(link)
    return acc
  }, {})

  return (
    <footer className="relative overflow-hidden" style={{ background: '#0F1A14' }}>
      {/* Subtle green radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(46,204,113,0.06) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-5 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_repeat(3,1fr)] gap-10 mb-12">

          {/* ── Brand Column ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#2ECC71' }}
              >
                <svg
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 10 10"/>
                  <path d="M12 6v6l4 2"/>
                  <path d="M16 2a6 6 0 0 1 6 6"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-white">{brandName}</span>
            </div>

            <p
              className="text-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '28ch' }}
            >
              {tagline}
            </p>

            {/* App Store Buttons */}
            {appLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {appLinks.map(al => (
                  <a
                    key={al.store}
                    href={al.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-white text-xs font-semibold transition-colors"
                    style={{
                      borderColor: 'rgba(255,255,255,0.1)',
                      background:  'rgba(255,255,255,0.05)',
                    }}
                  >
                    {al.store === 'google_play' ? 'Google Play' : 'App Store'}
                  </a>
                ))}
              </div>
            )}

            {/* Social Icons */}
            {social.length > 0 && (
              <div className="flex items-center gap-2">
                {social.map(s => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label ?? s.icon}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
                    style={{
                      color:      'rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <SocialSvg icon={s.icon} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Link Group Columns ── */}
          {Object.entries(linkGroups).map(([groupName, groupLinks]) => (
            <div key={groupName}>
              <h3
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {groupName}
              </h3>
              <ul className="space-y-2.5">
                {groupLinks.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-white"
                      style={{ color: 'rgba(255,255,255,0.55)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Divider ── */}
        <div className="h-px mb-6" style={{ background: 'rgba(255,255,255,0.07)' }} />

        {/* ── Copyright Bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-xs order-2 sm:order-1"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {copyright}
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Made with</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#2ECC71">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>di Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
