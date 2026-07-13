'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GizkuLogo from '@/components/GizkuLogo'

/* ─── Types ─────────────────────────────────────────────── */
type ContentRow = {
  id: number
  section: string
  slug: string
  title: string
  subtitle: string | null
  body: string | null
  meta: Record<string, unknown> | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
type SectionMap = Record<string, ContentRow[]>

type FooterItem = {
  id: number
  slug: string
  title: string
  subtitle: string | null
  body: string | null
  meta: Record<string, unknown> | null
  isActive: boolean
  sortOrder: number
}
type FooterBySlug = Record<string, FooterItem>
type LinkItem = { label: string; url: string }

/* ─── Constants ─────────────────────────────────────────── */
const DEFAULT_CTA_NOTE = 'Gratis · Tidak perlu kartu kredit · Langsung bisa dipakai'
const DEFAULT_PERKS    = ['Gratis selamanya', 'Tanpa kartu kredit', 'Langsung bisa dipakai']

/* ─── Fallback content — shown only once loading has settled and the
       admin hasn't configured anything (never shown as a loading state) ── */
const FALLBACK: SectionMap = {
  hero: [{
    id: 1, section: 'hero', slug: 'hero-main',
    title: 'Kenali Isi Piringmu,\nTanpa Ribet Mencatat',
    subtitle: 'Cukup foto makananmu — Gizku langsung kenali isinya dan hitung kalori, protein, lemak, dan karbo.',
    body: null,
    meta: {
      cta_label: 'Mulai Sekarang',
      cta_note: DEFAULT_CTA_NOTE,
      cta_url_guest: '/login',
      cta_url_auth: '/main/riwayat',
      benefit_list: DEFAULT_PERKS,
    },
    isActive: true, sortOrder: 0,
    createdAt: '', updatedAt: '',
  }],
  how_it_works: [
    { id: 2, section: 'how_it_works', slug: 'step-foto',    title: 'Foto Makanan',   subtitle: 'Ambil foto makananmu langsung dari kamera atau galeri.',                     body: null, meta: { step: 1, icon: 'camera' }, isActive: true, sortOrder: 0, createdAt: '', updatedAt: '' },
    { id: 3, section: 'how_it_works', slug: 'step-analisa', title: 'AI Analisa',     subtitle: 'AI kami mengenali makanan dan menghitung nutrisinya secara otomatis.',        body: null, meta: { step: 2, icon: 'brain'  }, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 7, section: 'how_it_works', slug: 'step-pantau',  title: 'Pantau Progres', subtitle: 'Lihat ringkasan harian dan pantau progresmu dari waktu ke waktu.',            body: null, meta: { step: 3, icon: 'chart'  }, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
  ],
  features: [
    { id: 4, section: 'features', slug: 'fitur-scan',    title: 'Scan & Catat dalam Detik', subtitle: 'Cukup foto, AI langsung kenali makanan dan hitung nutrisinya otomatis.',        body: null, meta: null, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 5, section: 'features', slug: 'fitur-history', title: 'Riwayat Lengkap',          subtitle: 'Lihat semua catatan makan harianmu dalam tampilan yang rapi.',                  body: null, meta: null, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: 6, section: 'features', slug: 'fitur-insight', title: 'Insight Nutrisi',           subtitle: 'Pahami pola makanmu dengan ringkasan mingguan dan bulanan.',                    body: null, meta: null, isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
  ],
  stats: [
    { id: 8,  section: 'stats', slug: 'stat-users',    title: '10.000+',  subtitle: 'Pengguna Aktif',      body: null, meta: null, isActive: true, sortOrder: 0, createdAt: '', updatedAt: '' },
    { id: 9,  section: 'stats', slug: 'stat-meals',    title: '500.000+', subtitle: 'Makanan Tercatat',    body: null, meta: null, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 11, section: 'stats', slug: 'stat-accuracy', title: '95%',      subtitle: 'Akurasi Pengenalan',  body: null, meta: null, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
  ],
  cta: [{
    id: 10, section: 'cta', slug: 'cta-bottom',
    title: 'Mulai Perjalanan Sehatmu Hari Ini',
    subtitle: 'Bergabung sekarang dan mulai pahami apa yang kamu makan setiap hari — dengan tenang.',
    body: null,
    meta: {
      cta_label: 'Mulai Sekarang',
      cta_note: DEFAULT_CTA_NOTE,
      cta_url_guest: '/login',
      cta_url_auth: '/main/riwayat',
      benefit_list: [],
    },
    isActive: true, sortOrder: 0,
    createdAt: '', updatedAt: '',
  }],
}

/* ─── Footer fallback ────────────────────────────────────── */
const FOOTER_FALLBACK: FooterBySlug = {
  'footer-brand':     { id: 0, slug: 'footer-brand',     title: 'Gizku',   subtitle: 'AI Nutrition Companion', body: null, meta: { type: 'brand' },     isActive: true, sortOrder: 0 },
  'footer-tagline':   { id: 0, slug: 'footer-tagline',   title: 'Tagline', subtitle: 'AI Nutrition Companion · Analisa nutrisi dari foto makananmu', body: null, meta: { type: 'tagline' },   isActive: true, sortOrder: 1 },
  'footer-copyright': { id: 0, slug: 'footer-copyright', title: '',        subtitle: null, body: null, meta: { type: 'copyright' }, isActive: true, sortOrder: 2 },
}

/* ─── SVG icons (currentColor — brand color set by the wrapping element) ── */
function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconCamera({ size = 26 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>)
}
function IconBrain({ size = 26 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.24Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.24Z" /></svg>)
}
function IconChart({ size = 26 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>)
}
function IconScan({ size = 22 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>)
}
function IconHistory({ size = 22 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>)
}
function IconInsight({ size = 22 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>)
}
function IconMeal({ size = 18 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.4" strokeWidth="1.4" /><path d="m4 16 4.5-4.5 3.5 3.5 2.5-2.5L20 16.5" /></svg>)
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'fitur-scan':    <IconScan />,
  'fitur-history': <IconHistory />,
  'fitur-insight': <IconInsight />,
}
const STEP_ICONS: Record<string, React.ReactNode> = {
  camera: <IconCamera />,
  brain:  <IconBrain />,
  chart:  <IconChart />,
}

/* ─── Shimmer skeleton primitive — reuses the .gizku-skeleton keyframe
       already defined in globals.css. No static placeholder copy. ── */
function Bar({ w, h = 14, className = '' }: { w: string | number; h?: number; className?: string }) {
  return <div className={`gizku-skeleton ${className}`} style={{ width: w, height: h }} />
}

/* ─── Phone preview — a lightweight, non-interactive replica of the real
       Riwayat screen, matching the current design tokens. Used only when
       the admin hasn't uploaded a hero screenshot. ── */
function PhonePreview() {
  return (
    <div className="w-[280px] h-[560px] sm:w-[320px] sm:h-[640px] rounded-[44px] p-3.5 shadow-md shrink-0" style={{ background: 'var(--bark-900)' }}>
      <div className="w-full h-full rounded-[32px] bg-page overflow-hidden flex flex-col">
        <div className="flex items-center justify-center pt-7 pb-1.5">
          <span className="text-lg font-semibold text-primary tracking-tight">Gizku</span>
        </div>
        <div className="flex-1 px-4 pt-2">
          <div className="text-xl font-semibold text-primary mb-3">Riwayat</div>
          <div className="bg-surface shadow-hairline rounded-lg p-3.5 mb-3">
            <div className="text-xs font-semibold text-secondary mb-2.5">Ringkasan Nutrisi, Hari Ini</div>
            <div className="flex justify-between gap-2">
              {[
                { v: '1240', l: 'Kalori', c: 'var(--color-kcal)' },
                { v: '48g', l: 'Protein', c: 'var(--color-protein)' },
                { v: '132g', l: 'Karbo', c: 'var(--color-carbs)' },
                { v: '38g', l: 'Lemak', c: 'var(--color-fat)' },
              ].map(s => (
                <div key={s.l} className="flex flex-col items-center gap-0.5 flex-1">
                  <span className="text-sm font-semibold" style={{ color: s.c }}>{s.v}</span>
                  <span style={{ fontSize: 9 }} className="text-secondary uppercase">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-surface shadow-hairline rounded-lg overflow-hidden">
            {['Nasi Goreng Ayam', 'Salad Buah', 'Telur Rebus'].map((name, i) => (
              <div key={name} className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: i < 2 ? '1px solid var(--color-border-default)' : 'none' }}>
                <div className="w-8 h-8 rounded-md bg-sunken flex items-center justify-center shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                  <IconMeal size={14} />
                </div>
                <span className="text-xs font-medium text-primary flex-1 truncate">{name}</span>
                <span className="text-xs font-semibold text-primary">{[420, 180, 140][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative bg-surface" style={{ borderTop: '1px solid var(--color-border-default)', height: 56 }}>
          <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-brand flex items-center justify-center" style={{ top: -18, width: 38, height: 38 }}>
            <IconCamera size={16} />
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroVisual({ imageUrl }: { imageUrl?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="Screenshot aplikasi Gizku" width={320} height={640} loading="eager" decoding="async" className="rounded-[44px] shadow-md max-w-full h-auto block" />
  }
  return <PhonePreview />
}

function metaStr(meta: Record<string, unknown> | null | undefined, key: string, fallback: string): string {
  if (!meta) return fallback
  const v = meta[key]
  return typeof v === 'string' && v.trim() ? v : fallback
}
function metaList(meta: Record<string, unknown> | null | undefined, key: string, fallback: string[], allowEmpty = false): string[] {
  if (!meta) return fallback
  const v = meta[key]
  if (!Array.isArray(v)) return fallback
  if (v.length === 0 && allowEmpty) return []
  if (v.length > 0) return v as string[]
  return fallback
}

function PerkList({ perks }: { perks: string[] }) {
  if (perks.length === 0) return null
  return (
    <div className="flex flex-col items-center lg:items-start gap-2.5 mb-8">
      {perks.map(perk => (
        <div key={perk} className="flex items-center gap-2.5 text-sm font-semibold text-primary">
          <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
            <IconCheck />
          </span>
          {perk}
        </div>
      ))}
    </div>
  )
}

function UserAvatar({ username }: { username: string }) {
  const initial = username.slice(0, 1).toUpperCase()
  return (
    <Link
      href="/main/riwayat"
      aria-label={`Profil ${username} — buka aplikasi`}
      title={username}
      className="flex items-center gap-2 pl-1.5 pr-3.5 h-11 rounded-pill bg-brand-tint no-underline shrink-0"
    >
      <span className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0">{initial}</span>
      <span className="text-sm font-semibold text-primary max-w-[120px] truncate hidden sm:inline">{username}</span>
    </Link>
  )
}

/* ─── Footer ─────────────────────────────────────────────── */
function LandingFooter({ footerData }: { footerData: FooterBySlug }) {
  const brand     = footerData['footer-brand']
  const tagline   = footerData['footer-tagline']
  const copyright = footerData['footer-copyright']
  const linkGroups = Object.values(footerData).filter(r => r.meta?.type === 'links_group').sort((a, b) => a.sortOrder - b.sortOrder)
  const social      = footerData['footer-social']
  const socialLinks: LinkItem[] = Array.isArray(social?.meta?.links) ? (social!.meta!.links as LinkItem[]) : []
  const hasLinks = linkGroups.length > 0 || socialLinks.length > 0
  const copyrightText = copyright?.title || `© ${new Date().getFullYear()} Gizku. Dibuat untuk hidup lebih sehat.`

  if (!hasLinks) {
    return (
      <footer className="px-6 py-10 lg:px-14 text-center" style={{ background: 'var(--color-bg-inverse)' }}>
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <GizkuLogo size={28} />
          <span className="text-lg font-bold text-white">{brand?.title ?? 'Gizku'}</span>
        </div>
        <p className="text-sm mb-2" style={{ color: 'var(--sand-300)' }}>{tagline?.subtitle ?? 'AI Nutrition Companion · Analisa nutrisi dari foto makananmu'}</p>
        <p className="text-xs" style={{ color: 'var(--clay-600)' }}>{copyrightText}</p>
      </footer>
    )
  }

  return (
    <footer className="pt-12 lg:pt-14 px-6 lg:px-14 text-left" style={{ background: 'var(--color-bg-inverse)' }}>
      <div className="flex gap-10 lg:gap-12 flex-wrap max-w-5xl mx-auto pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex-none w-full sm:w-[220px]">
          <div className="flex items-center gap-2.5 mb-3">
            <GizkuLogo size={28} />
            <span className="text-lg font-bold text-white">{brand?.title ?? 'Gizku'}</span>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--sand-300)' }}>{tagline?.subtitle ?? 'AI Nutrition Companion · Analisa nutrisi dari foto makananmu'}</p>
          {socialLinks.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {socialLinks.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-1.5 rounded-sm no-underline" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--sand-300)' }}>{l.label}</a>
              ))}
            </div>
          )}
        </div>
        {linkGroups.map(g => {
          const links: LinkItem[] = Array.isArray(g.meta?.links) ? (g.meta!.links as LinkItem[]) : []
          return (
            <div key={g.id} className="flex-1 min-w-[140px]">
              <p className="text-2xs font-bold uppercase tracking-[0.06em] mb-4" style={{ color: 'var(--sand-400)' }}>{g.title}</p>
              <ul className="list-none flex flex-col gap-2.5">
                {links.map((l, i) => (
                  <li key={i}><a href={l.url} className="text-sm no-underline" style={{ color: 'var(--sand-300)' }}>{l.label}</a></li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      <div className="max-w-5xl mx-auto py-5 text-center">
        <p className="text-xs" style={{ color: 'var(--clay-600)' }}>{copyrightText}</p>
      </div>
    </footer>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter()
  const [content, setContent]             = useState<SectionMap | null>(null)
  const [contentLoaded, setContentLoaded] = useState(false)
  const [footerData, setFooterData]       = useState<FooterBySlug | null>(null)
  const [footerLoaded, setFooterLoaded]   = useState(false)
  const [hydrated, setHydrated]           = useState(false)
  const [isLoggedIn, setIsLoggedIn]       = useState(false)
  const [username, setUsername]           = useState('')

  useEffect(() => {
    fetch('/api/landing-content')
      .then(r => r.json())
      .then((j: { data?: SectionMap }) => { if (j.data) setContent(j.data) })
      .catch(() => {})
      .finally(() => setContentLoaded(true))
  }, [])

  useEffect(() => {
    fetch('/api/footer-content')
      .then(r => r.json())
      .then((j: { bySlug?: FooterBySlug }) => { if (j.bySlug && Object.keys(j.bySlug).length > 0) setFooterData(j.bySlug) })
      .catch(() => {})
      .finally(() => setFooterLoaded(true))
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('nl_token')
    const raw   = localStorage.getItem('nl_user')
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as { username?: string; name?: string }
        const name = user.username ?? user.name ?? ''
        if (name) { setIsLoggedIn(true); setUsername(name) }
      } catch { /* malformed JSON */ }
    }
    setHydrated(true)
  }, [])

  function ctaUrl(meta: Record<string, unknown> | null | undefined) {
    if (!hydrated) return metaStr(meta, 'cta_url_guest', '/login')
    return isLoggedIn ? metaStr(meta, 'cta_url_auth', '/main/riwayat') : metaStr(meta, 'cta_url_guest', '/login')
  }

  const c        = content ?? FALLBACK
  const hero     = c.hero?.[0]
  const steps    = c.how_it_works ?? []
  const features = c.features ?? []
  const stats    = c.stats ?? []
  const cta      = c.cta?.[0]

  const heroCTALabel   = metaStr(hero?.meta, 'cta_label', 'Mulai Sekarang')
  const bottomCTALabel = metaStr(cta?.meta,  'cta_label', 'Mulai Sekarang')
  const heroNote       = metaStr(hero?.meta, 'cta_note',  DEFAULT_CTA_NOTE)
  const bottomNote     = metaStr(cta?.meta,  'cta_note',  DEFAULT_CTA_NOTE)
  const heroPerks      = metaList(hero?.meta, 'benefit_list', DEFAULT_PERKS, true)
  const bottomPerks    = metaList(cta?.meta,  'benefit_list', [], true)
  const heroImageUrl   = metaStr(hero?.meta, 'hero_image_url', '')

  const ctaPillClass = 'inline-flex items-center justify-center gap-2 h-14 px-8 rounded-pill bg-brand text-onbrand text-base font-bold no-underline shadow-md whitespace-nowrap hover:opacity-90 transition-opacity'

  return (
    <div className="overflow-x-hidden bg-page" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* NAV */}
      <nav
        className="flex items-center justify-between px-5 lg:px-14 h-16 lg:h-20 sticky top-0 z-10 backdrop-blur"
        style={{ background: 'rgba(253,251,247,0.9)', borderBottom: '1px solid var(--color-border-default)' }}
      >
        <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0" aria-label="Gizku beranda">
          <GizkuLogo size={32} />
          <span className="text-lg lg:text-xl font-bold tracking-tight text-primary">Gizku</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-6 mr-2">
            <a href="#fitur" className="text-sm font-medium text-secondary no-underline">Fitur</a>
            <a href="#cara-kerja" className="text-sm font-medium text-secondary no-underline">Cara Kerja</a>
          </div>
          {hydrated && isLoggedIn && username ? (
            <UserAvatar username={username} />
          ) : (
            <button
              onClick={() => router.push('/login')}
              aria-label="Buka Aplikasi Gizku"
              className="h-11 px-5 lg:px-6 rounded-pill bg-brand text-onbrand text-sm font-semibold cursor-pointer whitespace-nowrap hover:opacity-90 transition-opacity"
            >
              Buka Aplikasi
            </button>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-[1440px] mx-auto px-6 py-16 lg:px-14 lg:py-24 text-center lg:text-left">
        <div className="flex-1 min-w-0 flex flex-col items-center lg:items-start">
          {!contentLoaded ? (
            <>
              <Bar w={160} h={28} className="mb-7 rounded-pill" />
              <Bar w="90%" h={44} className="mb-2.5" />
              <Bar w="70%" h={44} className="mb-6" />
              <Bar w="85%" h={18} className="mb-2" />
              <Bar w="60%" h={18} className="mb-8" />
              <div className="flex flex-col items-center lg:items-start gap-2.5 mb-8 w-full">
                <Bar w={180} h={16} />
                <Bar w={160} h={16} />
                <Bar w={190} h={16} />
              </div>
              <Bar w={220} h={56} className="rounded-pill" />
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.06em] px-4 py-2 rounded-pill mb-7 bg-brand-tint text-link" style={{ border: '1px solid var(--green-200)' }}>
                AI Nutrition Companion
              </div>
              <h1 className="font-bold text-primary mb-6 max-w-[560px]" style={{ fontSize: 'clamp(32px,5vw,56px)', lineHeight: 1.12, letterSpacing: '-0.02em' }}>
                {hero?.title
                  ? hero.title.split('\n').map((line, i) => (
                    <span key={i}>{i === 0 ? line : <><br /><span className="text-link">{line}</span></>}</span>
                  ))
                  : <>Kenali Isi Piringmu,<br /><span className="text-link">Tanpa Ribet Mencatat</span></>}
              </h1>
              <p className="text-lg text-secondary leading-relaxed max-w-[460px] mb-8">
                {hero?.subtitle ?? 'Cukup foto makananmu — Gizku langsung kenali isinya dan hitung kalori, protein, lemak, dan karbo.'}
              </p>
              <PerkList perks={heroPerks} />
              <a href={ctaUrl(hero?.meta)} onClick={e => { e.preventDefault(); router.push(ctaUrl(hero?.meta)) }} aria-label={heroCTALabel} className={ctaPillClass}>
                {heroCTALabel} →
              </a>
              {heroNote && <p className="text-xs text-tertiary mt-4">{heroNote}</p>}
            </>
          )}
        </div>
        <div className="flex-none">
          {!contentLoaded ? (
            <div className="rounded-[44px] p-3.5 shadow-md" style={{ background: 'var(--bark-900)' }}>
              <div className="w-[280px] h-[560px] sm:w-[320px] sm:h-[640px] rounded-[32px] gizku-skeleton" />
            </div>
          ) : (
            <HeroVisual imageUrl={heroImageUrl || undefined} />
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="cara-kerja" className="py-16 lg:py-24 px-6 lg:px-14" style={{ background: 'var(--color-bg-surface)' }}>
        <p className="text-center text-xs font-bold uppercase tracking-[0.08em] text-link mb-3">Cara Kerja</p>
        <h2 className="text-center font-bold text-primary mb-3" style={{ fontSize: 'clamp(24px,3.5vw,36px)', letterSpacing: '-0.02em' }}>Semudah 3 Langkah</h2>
        <p className="text-center text-secondary max-w-[440px] mx-auto mb-14">Tidak perlu input manual. Foto, analisa, selesai — sesantai itu.</p>
        <div className="flex flex-col lg:flex-row gap-7 justify-center max-w-[1000px] mx-auto">
          {!contentLoaded ? (
            [0, 1, 2].map(i => (
              <div key={i} className="flex-1 flex flex-col items-center text-center gap-4 p-10 rounded-2xl" style={{ background: 'var(--color-bg-sunken)' }}>
                <div className="w-14 h-14 rounded-lg gizku-skeleton" />
                <Bar w="70%" h={18} />
                <Bar w="90%" h={14} />
                <Bar w="60%" h={14} />
              </div>
            ))
          ) : (
            steps.map(s => {
              const iconKey = typeof s.meta?.icon === 'string' ? s.meta.icon : ''
              const stepNum = typeof s.meta?.step === 'number' ? s.meta.step : s.sortOrder + 1
              return (
                <div key={s.id} className="flex-1 flex flex-col items-center text-center px-7 py-10 rounded-2xl" style={{ background: 'var(--color-bg-sunken)' }}>
                  <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-5 bg-brand-tint text-link">
                    {STEP_ICONS[iconKey] ?? stepNum}
                  </div>
                  <p className="text-base font-bold text-primary mb-2">{s.title}</p>
                  <p className="text-sm text-secondary leading-relaxed">{s.subtitle}</p>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="py-16 lg:py-24 px-6 lg:px-14" style={{ background: 'var(--color-bg-sunken)' }}>
        <p className="text-center text-xs font-bold uppercase tracking-[0.08em] text-link mb-3">Fitur Unggulan</p>
        <h2 className="text-center font-bold text-primary mb-3" style={{ fontSize: 'clamp(24px,3.5vw,36px)', letterSpacing: '-0.02em' }}>Semua yang Kamu Butuhkan</h2>
        <p className="text-center text-secondary max-w-[460px] mx-auto mb-14">Dirancang supaya mudah memantau asupan nutrisi sehari-hari, tanpa ribet.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1100px] mx-auto">
          {!contentLoaded ? (
            [0, 1, 2].map(i => (
              <div key={i} className="bg-surface rounded-2xl p-8 shadow-hairline">
                <div className="w-12 h-12 rounded-md gizku-skeleton mb-5" />
                <Bar w="60%" h={18} className="mb-2" />
                <Bar w="90%" h={14} className="mb-1.5" />
                <Bar w="75%" h={14} />
              </div>
            ))
          ) : (
            features.map(f => (
              <div key={f.id} className="bg-surface rounded-2xl p-8 shadow-hairline">
                <div className="w-12 h-12 rounded-md flex items-center justify-center mb-5 bg-brand-tint text-link">
                  {FEATURE_ICONS[f.slug] ?? <IconInsight />}
                </div>
                <h3 className="text-base font-bold text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-secondary leading-relaxed">{f.subtitle}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 lg:py-24 px-6 lg:px-14" style={{ background: 'var(--color-bg-surface)' }}>
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 justify-center max-w-[900px] mx-auto">
          {!contentLoaded ? (
            [0, 1, 2].map(i => (
              <div key={i} className="flex-1 text-center p-7 rounded-xl bg-brand-tint">
                <Bar w={90} h={34} className="mx-auto mb-2" />
                <Bar w={110} h={14} className="mx-auto" />
              </div>
            ))
          ) : (
            stats.map(s => (
              <div key={s.id} className="flex-1 text-center p-7 rounded-xl bg-brand-tint">
                <div className="text-link font-bold" style={{ fontSize: 34, letterSpacing: '-0.02em' }}>{s.title}</div>
                <div className="text-sm text-secondary mt-1">{s.subtitle}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-20 lg:py-28 px-6 lg:px-14 bg-brand-tint">
        {!contentLoaded ? (
          <div className="max-w-[440px] mx-auto flex flex-col items-center">
            <Bar w="90%" h={36} className="mb-2" />
            <Bar w="60%" h={36} className="mb-5" />
            <Bar w="100%" h={16} className="mb-1.5" />
            <Bar w="70%" h={16} className="mb-8" />
            <Bar w={220} h={56} className="rounded-pill" />
          </div>
        ) : (
          <>
            <h2 className="font-bold text-primary mb-4" style={{ fontSize: 'clamp(26px,4.5vw,40px)', letterSpacing: '-0.02em' }}>
              {cta?.title ? cta.title : <>Mulai Perjalanan <span className="text-link">Sehatmu</span> Hari Ini</>}
            </h2>
            <p className="text-secondary max-w-[440px] mx-auto mb-8">{cta?.subtitle ?? 'Bergabung sekarang dan mulai pahami apa yang kamu makan setiap hari — dengan tenang.'}</p>
            <PerkList perks={bottomPerks} />
            <a href={ctaUrl(cta?.meta)} onClick={e => { e.preventDefault(); router.push(ctaUrl(cta?.meta)) }} aria-label={bottomCTALabel} className={ctaPillClass}>
              {bottomCTALabel} →
            </a>
            {bottomNote && <p className="text-xs text-tertiary mt-4">{bottomNote}</p>}
          </>
        )}
      </section>

      {/* FOOTER */}
      {!footerLoaded ? (
        <footer className="px-6 py-10 lg:px-14 text-center" style={{ background: 'var(--color-bg-inverse)' }}>
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-sm gizku-skeleton" />
            <Bar w={70} h={20} />
          </div>
          <Bar w={260} h={14} className="mx-auto mb-2" />
          <Bar w={180} h={12} className="mx-auto" />
        </footer>
      ) : (
        <LandingFooter footerData={footerData ?? FOOTER_FALLBACK} />
      )}
    </div>
  )
}
