'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

/* ─── Constants ─────────────────────────────────────────── */
const DEFAULT_CTA_NOTE = 'Gratis · Tidak perlu kartu kredit · Langsung bisa dipakai'
const DEFAULT_PERKS    = ['Gratis selamanya', 'Tanpa kartu kredit', 'Langsung bisa dipakai']

/* ─── Fallback static content (used while DB loads / on error) ── */
const FALLBACK: SectionMap = {
  hero: [{
    id: 1, section: 'hero', slug: 'hero-main',
    title: 'Analisa Nutrisi dari\nFoto Makananmu',
    subtitle: 'Cukup foto, AI Gizku langsung kenali makanan & hitung kalori, protein, lemak, karbo secara akurat.',
    body: null,
    meta: {
      cta_label: 'Mulai Sekarang',
      cta_note: DEFAULT_CTA_NOTE,
      cta_url_guest: '/login',
      cta_url_auth: '/main/catat',
      benefit_list: DEFAULT_PERKS,
    },
    isActive: true, sortOrder: 0,
    createdAt: '', updatedAt: '',
  }],
  how_it_works: [
    { id: 2, section: 'how_it_works', slug: 'step-foto',    title: 'Foto Makanan',   subtitle: 'Ambil foto makanan kamu langsung dari kamera atau galeri.',                     body: null, meta: { step: 1, icon: 'camera' }, isActive: true, sortOrder: 0, createdAt: '', updatedAt: '' },
    { id: 3, section: 'how_it_works', slug: 'step-analisa', title: 'AI Analisa',     subtitle: 'AI kami mengenali makanan dan menghitung nutrisinya secara otomatis.',          body: null, meta: { step: 2, icon: 'brain'  }, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 7, section: 'how_it_works', slug: 'step-pantau',  title: 'Pantau Progres', subtitle: 'Lihat ringkasan harian dan pantau progres nutrisi kamu dari waktu ke waktu.',   body: null, meta: { step: 3, icon: 'chart'  }, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
  ],
  features: [
    { id: 4, section: 'features', slug: 'fitur-scan',    title: 'Scan & Catat dalam Detik', subtitle: 'Cukup foto, AI langsung kenali makanan dan hitung nutrisinya secara otomatis.',              body: null, meta: null, isActive: true, sortOrder: 1 },
    { id: 5, section: 'features', slug: 'fitur-history', title: 'Riwayat Lengkap',          subtitle: 'Lihat semua catatan makan harianmu dalam satu tampilan yang rapi dan mudah dipahami.',  body: null, meta: null, isActive: true, sortOrder: 2 },
    { id: 6, section: 'features', slug: 'fitur-insight', title: 'Insight Nutrisi',           subtitle: 'Pahami pola makanmu dengan ringkasan nutrisi mingguan dan bulanan yang informatif.',    body: null, meta: null, isActive: true, sortOrder: 3 },
  ].map(r => ({ ...r, createdAt: '', updatedAt: '' })),
  stats: [
    { id: 8,  section: 'stats', slug: 'stat-users',    title: '10.000+',  subtitle: 'Pengguna Aktif',      body: null, meta: null, isActive: true, sortOrder: 0, createdAt: '', updatedAt: '' },
    { id: 9,  section: 'stats', slug: 'stat-meals',    title: '500.000+', subtitle: 'Makanan Tercatat',    body: null, meta: null, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 11, section: 'stats', slug: 'stat-accuracy', title: '95%',      subtitle: 'Akurasi Pengenalan',  body: null, meta: null, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
  ],
  cta: [{
    id: 10, section: 'cta', slug: 'cta-bottom',
    title: 'Mulai Perjalanan Sehatmu Hari Ini',
    subtitle: 'Bergabung sekarang dan mulai pahami apa yang kamu makan setiap hari.',
    body: null,
    meta: {
      cta_label: 'Mulai Sekarang',
      cta_note: DEFAULT_CTA_NOTE,
      cta_url_guest: '/login',
      cta_url_auth: '/main/catat',
      benefit_list: DEFAULT_PERKS,
    },
    isActive: true, sortOrder: 0,
    createdAt: '', updatedAt: '',
  }],
}

/* ─── SVG helpers ────────────────────────────────────────── */
function GizkuLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gizku"
      role="img"
    >
      <circle cx="16" cy="16" r="16" fill="#2ECC71" />
      <path
        d="M8 16 Q8 23 16 23 Q24 23 24 16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <line
        x1="8" y1="16"
        x2="24" y2="16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polyline
        points="12,11 15,14.5 20.5,9"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconCamera({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}
function IconBrain({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.24Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.24Z"/>
    </svg>
  )
}
function IconChart({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  )
}
function IconScan({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <rect x="7" y="7" width="10" height="10" rx="1"/>
    </svg>
  )
}
function IconHistory({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  )
}
function IconInsight({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'fitur-scan':    <IconScan    size={22} />,
  'fitur-history': <IconHistory size={22} />,
  'fitur-insight': <IconInsight size={22} />,
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  camera: <IconCamera size={26} />,
  brain:  <IconBrain  size={26} />,
  chart:  <IconChart  size={26} />,
}

/* ─── Nutrition Ring SVG ─────────────────────────────────── */
function NutritionRing({ size = 120 }: { size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38
  const stroke = size * 0.1
  const circ = 2 * Math.PI * r
  const segments = [
    { pct: 0.45, color: '#2ECC71' },
    { pct: 0.30, color: '#3B82F6' },
    { pct: 0.25, color: '#F59E0B' },
  ]
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map(({ pct, color }, i) => {
        const dash = pct * circ - 2
        const el = (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset * circ}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={0.92}
          />
        )
        offset += pct
        return el
      })}
      <text x={cx} y={cy - size * 0.04} textAnchor="middle" fontSize={size * 0.13} fontWeight="700" fill="#1F2937">480</text>
      <text x={cx} y={cy + size * 0.11} textAnchor="middle" fontSize={size * 0.09} fill="#6B7280">kkal</text>
    </svg>
  )
}

/* ─── Phone Mockup (SVG fallback) ────────────────────────── */
function PhoneMockup() {
  const W = 200, H = 380
  const scale = W / 390
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.18))' }}>
      <rect x="4" y="4" width={W-8} height={H-8} rx="28" ry="28" fill="#1C1C1E" />
      <rect x="8" y="8" width={W-16} height={H-16} rx="24" ry="24" fill="#F9FAFB" />
      <rect x={W/2-20} y="8" width="40" height="10" rx="5" fill="#1C1C1E" />
      <text x="16" y="30" fontSize="8" fill="#374151" fontFamily="system-ui">9:41</text>
      <rect x={W-30} y="23" width="14" height="7" rx="2" fill="none" stroke="#374151" strokeWidth="1"/>
      <rect x={W-29} y="24" width={10} height="5" rx="1" fill="#2ECC71"/>
      <rect x="8" y="38" width={W-16} height="28" fill="white"/>
      <circle cx="20" cy="52" r={9} fill="#2ECC71"/>
      <path d="M16 52 Q16 56 20 56 Q24 56 24 52" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <line x1="16" y1="52" x2="24" y2="52" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
      <polyline points="17.5,49.5 19,51 21.5,48.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <text x="34" y="56" fontSize={10} fontWeight="700" fill="#111827" fontFamily="system-ui">Gizku</text>
      <text x={W-14} y="56" fontSize={8} fill="#6B7280" fontFamily="system-ui" textAnchor="end">Hari ini</text>
      <rect x="8" y="66" width={W-16} height="90" fill="url(#foodGrad)"/>
      <defs>
        <linearGradient id="foodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0"/>
          <stop offset="100%" stopColor="#86efac"/>
        </linearGradient>
      </defs>
      <text x={W/2} y="118" fontSize="32" textAnchor="middle" dominantBaseline="middle">🥗</text>
      <rect x="50" y="78" width="100" height="66" rx="4" fill="none" stroke="#2ECC71" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8"/>
      <rect x="50" y="78" width="12" height="12" rx="2" fill="#2ECC71" opacity="0.9"/>
      <text x="66" y="88" fontSize="7" fill="white" fontFamily="system-ui" fontWeight="600">AI Scanning…</text>
      <rect x="50" y="108" width="100" height="2" rx="1" fill="#2ECC71" opacity="0.3"/>
      <rect x="50" y="108" width="60" height="2" rx="1" fill="#2ECC71" opacity="0.9"/>
      <rect x="12" y="162" width={W-24} height="76" rx="12" fill="white"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}/>
      <text x="22" y="178" fontSize="9" fontWeight="700" fill="#111827" fontFamily="system-ui">Caesar Salad</text>
      <text x="22" y="190" fontSize="7.5" fill="#6B7280" fontFamily="system-ui">Per sajian · 1 porsi</text>
      <g transform={`translate(${W-55}, 162)`}>
        <NutritionRing size={50} />
      </g>
      {[
        { label: 'Karbo', val: '32g', color: '#2ECC71', x: 22 },
        { label: 'Protein', val: '18g', color: '#3B82F6', x: 78 },
        { label: 'Lemak', val: '12g', color: '#F59E0B', x: 134 },
      ].map(({ label, val, color, x }) => (
        <g key={label}>
          <rect x={x} y="200" width="46" height="30" rx="8" fill={color} opacity="0.1"/>
          <text x={x+23} y="212" fontSize="8" fontWeight="700" fill={color} textAnchor="middle" fontFamily="system-ui">{val}</text>
          <text x={x+23} y="223" fontSize="6.5" fill="#6B7280" textAnchor="middle" fontFamily="system-ui">{label}</text>
        </g>
      ))}
      <rect x="8" y={H-50} width={W-16} height="34" rx="10" fill="white"
        style={{ filter: 'drop-shadow(0 -1px 4px rgba(0,0,0,0.06))' }}/>
      {[
        { icon: '🏠', label: 'Home',    x: W*0.2, active: false },
        { icon: '📷', label: 'Catat',   x: W*0.5, active: true  },
        { icon: '📊', label: 'Progres', x: W*0.8, active: false },
      ].map(({ icon, label, x, active }) => (
        <g key={label}>
          <text x={x} y={H-35} fontSize="10" textAnchor="middle">{icon}</text>
          <text x={x} y={H-23} fontSize="6" textAnchor="middle"
            fill={active ? '#2ECC71' : '#9CA3AF'} fontFamily="system-ui" fontWeight={active ? '700' : '400'}>
            {label}
          </text>
          {active && <circle cx={x} cy={H-18} r="2" fill="#2ECC71"/>}
        </g>
      ))}
      <circle cx={W-22} cy="92" r="9" fill="#2ECC71" opacity="0.95"/>
      <polyline points={`${W-27},92 ${W-22},97 ${W-16},87`}
        stroke="white" strokeWidth={2.2 / scale} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

/* ─── Hero Visual: gambar dari backoffice atau SVG fallback ── */
function HeroVisual({ imageUrl }: { imageUrl?: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Screenshot aplikasi Gizku"
        width={260}
        height={480}
        loading="eager"
        decoding="async"
        style={{
          borderRadius: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
        }}
      />
    )
  }
  return <PhoneMockup />
}

/* ─── Meta helpers ───────────────────────────────────────── */
function metaStr(meta: Record<string, unknown> | null | undefined, key: string, fallback: string): string {
  if (!meta) return fallback
  const v = meta[key]
  return typeof v === 'string' && v.trim() ? v : fallback
}

function metaList(
  meta: Record<string, unknown> | null | undefined,
  key: string,
  fallback: string[],
  allowEmpty = false,
): string[] {
  if (!meta) return fallback
  const v = meta[key]
  if (!Array.isArray(v)) return fallback
  if (v.length === 0 && allowEmpty) return []
  if (v.length > 0) return v as string[]
  return fallback
}

/* ─── Perk List component ────────────────────────────────── */
function PerkList({ perks }: { perks: string[] }) {
  if (perks.length === 0) return null
  return (
    <div className="gk-perk-list" aria-label="Keunggulan">
      {perks.map(perk => (
        <div className="gk-perk" key={perk}>
          <span className="gk-perk-check"><IconCheck /></span>
          {perk}
        </div>
      ))}
    </div>
  )
}

/* ─── User Avatar (initials) ─────────────────────────────── */
function UserAvatar({ username }: { username: string }) {
  const initials = username.slice(0, 2).toUpperCase()
  return (
    <Link
      href="/main/catat"
      className="gk-user-avatar"
      aria-label={`Profil ${username} — buka aplikasi`}
      title={username}
    >
      <span className="gk-user-initials">{initials}</span>
      <span className="gk-user-name">{username}</span>
    </Link>
  )
}

/* ─── Page Component ─────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter()
  const [content, setContent]   = useState<SectionMap>(FALLBACK)
  const [hydrated, setHydrated] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState<string>('')

  /* ── Load CMS content ── */
  useEffect(() => {
    fetch('/api/landing-content')
      .then(r => r.json())
      .then((j: { data?: SectionMap }) => { if (j.data) setContent(j.data) })
      .catch(() => {/* keep fallback */})
  }, [])

  /* ── Read auth state from localStorage (same keys used by catat/page.tsx) ── */
  useEffect(() => {
    const token = localStorage.getItem('nl_token')
    const raw   = localStorage.getItem('nl_user')
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as { username?: string; name?: string }
        const name = user.username ?? user.name ?? ''
        if (name) {
          setIsLoggedIn(true)
          setUsername(name)
        }
      } catch {
        /* malformed JSON — treat as logged out */
      }
    }
    setHydrated(true)
  }, [])

  /* ── CTA URL: beda tujuan tergantung auth state, label tetap dari CMS ── */
  function ctaUrl(meta: Record<string, unknown> | null | undefined) {
    if (!hydrated) return metaStr(meta, 'cta_url_guest', '/login')
    return isLoggedIn
      ? metaStr(meta, 'cta_url_auth', '/main/catat')
      : metaStr(meta, 'cta_url_guest', '/login')
  }

  const hero     = content.hero?.[0]
  const steps    = content.how_it_works ?? []
  const features = content.features ?? []
  const stats    = content.stats ?? []
  const cta      = content.cta?.[0]

  /* ── Label selalu dari CMS, tidak dibedakan berdasarkan auth state ── */
  const heroCTALabel   = metaStr(hero?.meta, 'cta_label', 'Mulai Sekarang')
  const bottomCTALabel = metaStr(cta?.meta,  'cta_label', 'Mulai Sekarang')

  const heroNote   = metaStr(hero?.meta, 'cta_note', DEFAULT_CTA_NOTE)
  const bottomNote = metaStr(cta?.meta,  'cta_note', DEFAULT_CTA_NOTE)

  const heroPerks   = metaList(hero?.meta, 'benefit_list', DEFAULT_PERKS, true)
  const bottomPerks = metaList(cta?.meta,  'benefit_list', DEFAULT_PERKS)

  const heroImageUrl = metaStr(hero?.meta, 'hero_image_url', '')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #fff; color: #111827; -webkit-font-smoothing: antialiased; }

        /* NAV */
        .gk-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
          border-bottom: 1px solid #F3F4F6;
          padding: 0 20px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          overflow: hidden;
        }
        .gk-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; flex-shrink: 0; }
        .gk-logo-text { font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
        .gk-nav-links { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        /* Nav CTA — guest */
        .gk-btn-nav-primary {
          padding: 10px 22px; border-radius: 100px; font-size: 14px; font-weight: 700;
          color: #fff; background: #2ECC71; border: none; cursor: pointer;
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(46,204,113,0.30);
          white-space: nowrap;
        }
        .gk-btn-nav-primary:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 18px rgba(46,204,113,0.40); }
        .gk-btn-nav-primary:active { transform: translateY(0); opacity: 0.95; }

        /* Nav — user avatar (logged in) */
        .gk-user-avatar {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 14px 6px 6px;
          border-radius: 100px;
          background: #F0FDF4;
          border: 1.5px solid #BBF7D0;
          text-decoration: none;
          color: #15803D;
          font-weight: 700;
          font-size: 14px;
          transition: background 0.15s, box-shadow 0.15s, transform 0.15s;
          cursor: pointer;
          max-width: 220px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .gk-user-avatar:hover { background: #DCFCE7; box-shadow: 0 2px 10px rgba(46,204,113,0.18); transform: translateY(-1px); }
        .gk-user-initials {
          width: 32px; height: 32px; border-radius: 50%;
          background: #2ECC71; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .gk-user-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* HERO */
        .gk-hero {
          min-height: calc(100svh - 64px);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 60px 20px 40px;
          background: linear-gradient(160deg, #fff 55%, #f0fdf4 100%);
          position: relative; overflow: hidden;
        }
        .gk-hero::before {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(46,204,113,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 20% 80%, rgba(46,204,113,0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .gk-hero-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: #F0FDF4; border: 1px solid #BBF7D0;
          color: #15803D; font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
          padding: 6px 14px; border-radius: 100px; margin-bottom: 24px;
          text-transform: uppercase;
        }
        .gk-hero-title {
          font-size: clamp(2rem, 6vw, 3.5rem); font-weight: 800;
          line-height: 1.15; letter-spacing: -0.03em;
          color: #111827; margin-bottom: 20px; max-width: 680px;
          white-space: pre-line;
        }
        .gk-hero-title .green { color: #2ECC71; }
        .gk-hero-sub {
          font-size: clamp(1rem, 2vw, 1.125rem); color: #6B7280;
          max-width: 520px; line-height: 1.7; margin-bottom: 28px;
        }

        /* PERK LIST */
        .gk-perk-list {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          margin-bottom: 28px;
        }
        .gk-perk {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 600; color: #374151;
        }
        .gk-perk-check {
          width: 20px; height: 20px; border-radius: 50%;
          background: #2ECC71; color: #fff;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .gk-hero-cta-group {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; margin-bottom: 16px;
          width: 100%;
        }
        .gk-btn-hero {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 16px 36px; border-radius: 100px; font-size: 17px; font-weight: 800;
          color: #fff; background: #2ECC71; border: none; cursor: pointer;
          box-shadow: 0 4px 24px rgba(46,204,113,0.40);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .gk-btn-hero:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(46,204,113,0.45); }
        .gk-btn-hero:active { transform: translateY(0); opacity: 0.9; }
        .gk-hero-note { font-size: 13px; color: #9CA3AF; letter-spacing: 0.01em; }
        .gk-hero-phone { margin-top: 56px; position: relative; z-index: 1; }

        /* HOW IT WORKS */
        .gk-how { padding: 80px 20px; background: #fff; }
        .gk-section-eyebrow {
          text-align: center; font-size: 12px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #2ECC71; margin-bottom: 12px;
        }
        .gk-section-title {
          text-align: center; font-size: clamp(1.5rem, 4vw, 2.25rem);
          font-weight: 800; color: #111827; letter-spacing: -0.025em; margin-bottom: 8px;
        }
        .gk-section-sub {
          text-align: center; font-size: 1rem; color: #6B7280;
          max-width: 480px; margin: 0 auto 48px; line-height: 1.6;
        }
        .gk-steps {
          display: flex; gap: 28px; justify-content: center; flex-wrap: wrap;
          max-width: 800px; margin: 0 auto;
        }
        .gk-step {
          flex: 1 1 200px; max-width: 240px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 32px 20px; background: #FAFAFA; border-radius: 20px;
          border: 1px solid #F3F4F6;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .gk-step:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.07); }
        .gk-step-num {
          display: flex; align-items: center; justify-content: center;
          width: 48px; height: 48px; border-radius: 14px; margin-bottom: 16px;
          background: #F0FDF4; color: #2ECC71; font-weight: 800; font-size: 13px;
        }
        .gk-step-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .gk-step-desc  { font-size: 13.5px; color: #6B7280; line-height: 1.6; }

        /* FEATURES */
        .gk-features { padding: 80px 20px; background: #F9FAFB; }
        .gk-features-grid {
          display: grid; gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(min(280px,100%), 1fr));
          max-width: 960px; margin: 0 auto;
        }
        .gk-feature-card {
          background: #fff; border-radius: 20px; padding: 28px 24px;
          border: 1px solid #E5E7EB;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .gk-feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.07); }
        .gk-feature-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: #F0FDF4; color: #2ECC71;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .gk-feature-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .gk-feature-desc  { font-size: 14px; color: #6B7280; line-height: 1.6; }

        /* STATS */
        .gk-stats { padding: 80px 20px; background: #111827; }
        .gk-stats-grid {
          display: flex; gap: 0; justify-content: center; flex-wrap: wrap;
          max-width: 720px; margin: 0 auto;
        }
        .gk-stat {
          flex: 1 1 160px; text-align: center; padding: 32px 24px;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .gk-stat:last-child { border-right: none; }
        .gk-stat-value { font-size: clamp(2rem, 5vw, 2.75rem); font-weight: 800; color: #2ECC71; letter-spacing: -0.03em; margin-bottom: 4px; }
        .gk-stat-label { font-size: 14px; color: #9CA3AF; font-weight: 500; }

        /* CTA BOTTOM */
        .gk-cta-section {
          padding: 100px 20px;
          background: linear-gradient(160deg, #F0FDF4 0%, #DCFCE7 100%);
          text-align: center;
        }
        .gk-cta-inner { max-width: 560px; margin: 0 auto; }
        .gk-cta-title {
          font-size: clamp(1.75rem, 5vw, 3rem); font-weight: 800;
          color: #111827; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 16px;
        }
        .gk-cta-title .green { color: #2ECC71; }
        .gk-cta-sub { font-size: 1rem; color: #6B7280; line-height: 1.6; margin-bottom: 28px; }

        /* FOOTER */
        .gk-footer {
          padding: 40px 20px; background: #111827; text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .gk-footer-logo  { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px; }
        .gk-footer-brand { font-size: 18px; font-weight: 800; color: #fff; }
        .gk-footer-desc  { font-size: 13px; color: #6B7280; margin-bottom: 8px; }
        .gk-footer-copy  { font-size: 12px; color: #4B5563; }

        /* RESPONSIVE */
        @media (max-width: 480px) {
          .gk-hero { padding: 40px 16px 32px; }
          .gk-how, .gk-features, .gk-stats, .gk-cta-section { padding: 56px 16px; }
          .gk-stat { flex: 1 1 100%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 20px 16px; }
          .gk-stat:last-child { border-bottom: none; }
          .gk-hero-phone { margin-top: 36px; }
          .gk-perk-list { align-items: flex-start; padding-left: 8px; }

          /* Avatar mobile: tampilkan hanya lingkaran inisial, tanpa nama */
          .gk-user-name { display: none; }
          .gk-user-avatar {
            padding: 4px;
            gap: 0;
            max-width: 44px;
            background: transparent;
            border-color: #BBF7D0;
          }

          /* Fix: button always full-width on mobile so text never clips */
          .gk-btn-hero {
            width: 100%;
            max-width: 360px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }
      `}</style>

      <div style={{ overflowX: 'hidden' }}>

        {/* ── NAV ── */}
        <nav className="gk-nav" role="navigation" aria-label="Navigasi utama">
          <Link href="/" className="gk-logo" aria-label="Gizku beranda">
            <GizkuLogo size={32} />
            <span className="gk-logo-text">Gizku</span>
          </Link>
          <div className="gk-nav-links">
            {hydrated && isLoggedIn && username ? (
              <UserAvatar username={username} />
            ) : (
              <button
                className="gk-btn-nav-primary"
                onClick={() => router.push('/login')}
                aria-label="Buka Aplikasi Gizku"
              >
                Buka Aplikasi
              </button>
            )}
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="gk-hero" aria-labelledby="hero-title">
          <div className="gk-hero-tag">
            <span>✨</span> AI Nutrition Companion
          </div>
          <h1 className="gk-hero-title" id="hero-title">
            {hero?.title
              ? hero.title.split('\n').map((line, i) => (
                  <span key={i}>
                    {i === 0 ? line : <><br /><span className="green">{line}</span></>}
                  </span>
                ))
              : <>Analisa Nutrisi dari<br /><span className="green">Foto Makananmu</span></>
            }
          </h1>
          <p className="gk-hero-sub">
            {hero?.subtitle ?? 'Cukup foto, AI Gizku langsung kenali makanan & hitung kalori, protein, lemak, karbo secara akurat.'}
          </p>

          <PerkList perks={heroPerks} />

          <div className="gk-hero-cta-group">
            <button
              className="gk-btn-hero"
              onClick={() => router.push(ctaUrl(hero?.meta))}
              aria-label={heroCTALabel}
            >
              {heroCTALabel} →
            </button>
            {heroNote && <p className="gk-hero-note">{heroNote}</p>}
          </div>

          <div className="gk-hero-phone" aria-hidden="true">
            <HeroVisual imageUrl={heroImageUrl || undefined} />
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        {steps.length > 0 && (
          <section className="gk-how" aria-labelledby="how-title">
            <p className="gk-section-eyebrow">Cara Kerja</p>
            <h2 className="gk-section-title" id="how-title">Semudah 3 Langkah</h2>
            <p className="gk-section-sub">Tidak perlu input manual. Foto, analisa, selesai.</p>
            <ol className="gk-steps" role="list">
              {steps.map(s => {
                const iconKey = typeof s.meta?.icon === 'string' ? s.meta.icon : ''
                const stepNum = typeof s.meta?.step === 'number' ? s.meta.step : s.sortOrder + 1
                return (
                  <li key={s.id} className="gk-step">
                    <div className="gk-step-num" aria-label={`Langkah ${stepNum}`}>
                      {STEP_ICONS[iconKey] ?? stepNum}
                    </div>
                    <p className="gk-step-title">{s.title}</p>
                    <p className="gk-step-desc">{s.subtitle}</p>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {/* ── FEATURES ── */}
        {features.length > 0 && (
          <section className="gk-features" aria-labelledby="features-title">
            <p className="gk-section-eyebrow">Fitur Unggulan</p>
            <h2 className="gk-section-title" id="features-title">Semua yang Kamu Butuhkan</h2>
            <p className="gk-section-sub">Dirancang untuk memudahkan kamu memantau asupan nutrisi sehari-hari.</p>
            <ul className="gk-features-grid" role="list">
              {features.map(f => (
                <li key={f.id} className="gk-feature-card">
                  <div className="gk-feature-icon" aria-hidden="true">
                    {FEATURE_ICONS[f.slug] ?? <IconInsight size={22} />}
                  </div>
                  <h3 className="gk-feature-title">{f.title}</h3>
                  <p className="gk-feature-desc">{f.subtitle}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── STATS ── */}
        {stats.length > 0 && (
          <section className="gk-stats" aria-labelledby="stats-title">
            <p className="gk-section-eyebrow" style={{ color: '#86EFAC' }}>Dipercaya Banyak Pengguna</p>
            <h2 className="gk-section-title" id="stats-title" style={{ color: '#fff', marginBottom: 40 }}>Angka yang Bicara</h2>
            <div className="gk-stats-grid">
              {stats.map(s => (
                <div key={s.id} className="gk-stat">
                  <div className="gk-stat-value">{s.title}</div>
                  <div className="gk-stat-label">{s.subtitle}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── CTA BOTTOM ── */}
        <section className="gk-cta-section" aria-labelledby="cta-title">
          <div className="gk-cta-inner">
            <h2 className="gk-cta-title" id="cta-title">
              {cta?.title
                ? cta.title
                : <>Mulai Perjalanan <span className="green">Sehatmu</span> Hari Ini</>
              }
            </h2>
            <p className="gk-cta-sub">
              {cta?.subtitle ?? 'Bergabung sekarang dan mulai pahami apa yang kamu makan setiap hari.'}
            </p>

            <PerkList perks={bottomPerks} />

            <button
              className="gk-btn-hero"
              onClick={() => router.push(ctaUrl(cta?.meta))}
              aria-label={bottomCTALabel}
            >
              {bottomCTALabel} →
            </button>
            {bottomNote && (
              <p className="gk-hero-note" style={{ marginTop: 14 }}>{bottomNote}</p>
            )}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="gk-footer">
          <div className="gk-footer-logo">
            <GizkuLogo size={28} />
            <span className="gk-footer-brand">Gizku</span>
          </div>
          <p className="gk-footer-desc">AI Nutrition Companion · Analisa nutrisi dari foto makananmu</p>
          <p className="gk-footer-copy">© {new Date().getFullYear()} Gizku. Dibuat dengan 💚 untuk hidup lebih sehat.</p>
        </footer>

      </div>
    </>
  )
}
