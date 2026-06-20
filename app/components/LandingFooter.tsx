/**
 * LandingFooter — Server Component
 * Footer landing page yang datanya dikonfigurasi via backoffice.
 * Fetch dari /api/landing?section=footer
 * Fallback ke data default bila belum ada konfigurasi.
 */
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

type FooterLink = {
  label: string
  href: string
  group?: string
}

type SocialLink = {
  icon: 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin' | 'github'
  href: string
  label?: string
}

type AppLink = {
  store: 'google_play' | 'app_store'
  href: string
}

type FooterMeta = {
  links?: FooterLink[]
  social?: SocialLink[]
  app_links?: AppLink[]
}

type FooterRow = {
  id: number
  section: string
  slug: string
  title: string
  subtitle: string | null
  body: string | null
  meta: FooterMeta | null
  isActive: boolean
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'Fitur',             href: '/#features', group: 'Produk' },
  { label: 'Cara Kerja',        href: '/#how',      group: 'Produk' },
  { label: 'Download App',      href: '/#download', group: 'Produk' },
  { label: 'Tentang Kami',      href: '/about',     group: 'Perusahaan' },
  { label: 'Blog',              href: '/blog',      group: 'Perusahaan' },
  { label: 'Karir',             href: '/karir',     group: 'Perusahaan' },
  { label: 'Kebijakan Privasi', href: '/privacy',   group: 'Legal' },
  { label: 'Syarat Penggunaan', href: '/terms',     group: 'Legal' },
]

const DEFAULT_SOCIAL: SocialLink[] = [
  { icon: 'instagram', href: 'https://instagram.com/gizku.id', label: 'Instagram Gizku' },
  { icon: 'tiktok',    href: 'https://tiktok.com/@gizku.id',   label: 'TikTok Gizku' },
]

// ─── Social Icon SVGs ─────────────────────────────────────────────────────────

function SocialIcon({ icon }: { icon: SocialLink['icon'] }) {
  const icons: Partial<Record<SocialLink['icon'], React.ReactNode>> = {
    instagram: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
    twitter: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    tiktok: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.73a8.16 8.16 0 0 0 4.77 1.52V6.77a4.85 4.85 0 0 1-1-.08z"/>
      </svg>
    ),
    youtube: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
      </svg>
    ),
    facebook: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
    linkedin: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
        <rect x="2" y="9" width="4" height="12"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
    github: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
    ),
  }
  return <>{icons[icon] ?? null}</>
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function getFooterData(): Promise<FooterRow | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/landing?section=footer`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = await res.json() as { data: FooterRow[] }
    return json.data?.[0] ?? null
  } catch {
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function LandingFooter() {
  const row = await getFooterData()

  const brandName = row?.title    ?? 'Gizku'
  const tagline   = row?.subtitle ?? 'Kenali nutrisimu, hidup lebih sehat.'
  const copyright = row?.body     ?? `© ${new Date().getFullYear()} Gizku. Hak cipta dilindungi.`
  const meta      = row?.meta

  const links:    FooterLink[] = meta?.links     ?? DEFAULT_LINKS
  const social:   SocialLink[] = meta?.social    ?? DEFAULT_SOCIAL
  const appLinks: AppLink[]    = meta?.app_links ?? []

  // Kelompokkan links berdasarkan group → jadi kolom footer
  const linkGroups = links.reduce<Record<string, FooterLink[]>>((acc, link) => {
    const g = link.group ?? 'Lainnya'
    if (!acc[g]) acc[g] = []
    acc[g].push(link)
    return acc
  }, {})

  const groupNames = Object.keys(linkGroups)

  return (
    <footer className="relative overflow-hidden" style={{ background: '#0F1A14' }}>
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(46,204,113,0.06) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-5 py-16">

        {/* Top grid: Brand + Link Columns */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12"
          style={{
            gridTemplateColumns: groupNames.length > 0
              ? `2fr repeat(${Math.min(groupNames.length, 3)}, 1fr)`
              : '1fr',
          }}
        >
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#2ECC71' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10"/>
                  <path d="M12 6v6l4 2"/>
                  <path d="M16 2a6 6 0 0 1 6 6"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">{brandName}</span>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '28ch' }}>
              {tagline}
            </p>

            {/* App Store Buttons */}
            {appLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {appLinks.map((al) => (
                  <a
                    key={al.store}
                    href={al.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-white text-sm font-semibold transition-colors hover:bg-white/10"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}
                  >
                    {al.store === 'google_play' ? 'Google Play' : 'App Store'}
                  </a>
                ))}
              </div>
            )}

            {/* Social Icons */}
            {social.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {social.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label ?? s.icon}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                    style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
                  >
                    <SocialIcon icon={s.icon} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link Group Columns */}
          {groupNames.map((groupName) => (
            <div key={groupName}>
              <h3
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {groupName}
              </h3>
              <ul className="space-y-2.5">
                {linkGroups[groupName].map((link) => (
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

        {/* Divider */}
        <div className="h-px mb-6" style={{ background: 'rgba(255,255,255,0.07)' }} />

        {/* Bottom: Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs order-2 sm:order-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {copyright}
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Made with</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#2ECC71" className="shrink-0">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>di Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
