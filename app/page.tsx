'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type LandingRow = {
  id: number
  section: string
  slug: string
  title: string
  subtitle: string | null
  body: string | null
  meta: Record<string, unknown> | null
  isActive: boolean
  sortOrder: number
}

type LandingData = Record<string, LandingRow[]>

const DEFAULT_CTA_NOTE = 'Gratis · Tidak perlu kartu kredit · Langsung bisa dipakai'

const DEFAULTS: LandingData = {
  hero: [{
    id: 0, section: 'hero', slug: 'hero-main',
    title: 'Makan Cerdas. Hidup Lebih Baik.',
    subtitle: 'AI Nutrition Companion yang membuat pelacakan kalori jadi mudah, informatif, dan personal.',
    body: null,
    meta: {
      cta_label: 'Mulai Sekarang',
      cta_note: DEFAULT_CTA_NOTE,
      cta_url_guest: '/login',
      cta_url_auth: '/main/catat',
    },
    isActive: true, sortOrder: 0,
  }],
  how_it_works: [
    { id: 1, section: 'how_it_works', slug: 'step-1', title: 'Foto Makananmu', subtitle: 'Ambil foto makanan dari kamera atau galeri — tidak perlu input manual.', body: null, meta: { step: 1 }, isActive: true, sortOrder: 1 },
    { id: 2, section: 'how_it_works', slug: 'step-2', title: 'AI Analisa Otomatis', subtitle: 'AI kami mendeteksi bahan dan menghitung nutrisi secara instan dan akurat.', body: null, meta: { step: 2 }, isActive: true, sortOrder: 2 },
    { id: 3, section: 'how_it_works', slug: 'step-3', title: 'Pantau Progressmu', subtitle: 'Lihat ringkasan harian kalori, protein, karbo, dan lemak setiap saat.', body: null, meta: { step: 3 }, isActive: true, sortOrder: 3 },
  ],
  features: [
    { id: 4, section: 'features', slug: 'fitur-scan',    title: 'Scan & Catat dalam Detik', subtitle: 'Cukup foto, AI langsung kenali makanan dan hitung nutrisinya secara otomatis.', body: null, meta: null, isActive: true, sortOrder: 1 },
    { id: 5, section: 'features', slug: 'fitur-insight', title: 'Insight AI Personal',       subtitle: 'Rekomendasi nutrisi disesuaikan dengan target dan riwayat makanmu.', body: null, meta: null, isActive: true, sortOrder: 2 },
    { id: 6, section: 'features', slug: 'fitur-habit',   title: 'Bangun Kebiasaan Sehat',    subtitle: 'Streak harian dan ringkasan mingguan membuatmu tetap konsisten.', body: null, meta: null, isActive: true, sortOrder: 3 },
  ],
  stats: [
    { id: 7, section: 'stats', slug: 'stat-users',    title: '10.000+',  subtitle: 'Pengguna Aktif',     body: null, meta: null, isActive: true, sortOrder: 1 },
    { id: 8, section: 'stats', slug: 'stat-meals',    title: '500.000+', subtitle: 'Makanan Dianalisa',  body: null, meta: null, isActive: true, sortOrder: 2 },
    { id: 9, section: 'stats', slug: 'stat-accuracy', title: '95%',      subtitle: 'Akurasi Analisa AI', body: null, meta: null, isActive: true, sortOrder: 3 },
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
    },
    isActive: true, sortOrder: 0,
  }],
}

// ─── Icon components ───────────────────────────────────────────────────────────

function IconCamera() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function IconCpu() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M20 9h3M1 15h3M20 15h3"/>
    </svg>
  )
}

function IconTrendingUp() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  )
}

function IconZap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

function IconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

function IconLeaf() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 8C8 10 5.9 16.17 3.82 19.5A10 10 0 0 0 21.97 8.4C18.97 7.76 14 8 9 14"/>
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconUtensilsCrossed() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 2l6 6-6 6"/>
      <path d="M8.93 6.06L14 11l-6 6-5-5 5.93-5.94z"/>
      <path d="M2 22l3-3"/>
    </svg>
  )
}

function IconActivitySquare() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M7 12h2l2-4 2 8 2-4h2"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

/**
 * GizkuLogo — lingkaran hijau dengan monogram "G" putih.
 * Ini adalah logo asli sebelum perubahan ke smiley face.
 */
function GizkuLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="18" fill="#2ECC71"/>
      {/* Letter G */}
      <text
        x="18"
        y="24"
        textAnchor="middle"
        fill="white"
        fontSize="18"
        fontWeight="800"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        letterSpacing="-0.5"
      >
        G
      </text>
    </svg>
  )
}

const STEP_ICONS = [<IconCamera key="cam" />, <IconCpu key="cpu" />, <IconTrendingUp key="trend" />]
const FEATURE_ICONS = [<IconZap key="zap" />, <IconTarget key="target" />, <IconLeaf key="leaf" />]
const STAT_ICONS = [<IconUsers key="users" />, <IconUtensilsCrossed key="food" />, <IconActivitySquare key="activity" />]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extract a string value from a meta object */
function metaStr(meta: Record<string, unknown> | null | undefined, key: string, fallback = ''): string {
  return (meta?.[key] as string) ?? fallback
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [content, setContent] = useState<LandingData>(DEFAULTS)

  // Auth check: support multiple token key conventions
  useEffect(() => {
    setHydrated(true)
    try {
      const token =
        localStorage.getItem('nl_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('nl_token') ||
        sessionStorage.getItem('token')
      if (token) setIsLoggedIn(true)
    } catch {
      // storage not available (SSR/sandbox) — stay as guest
    }
  }, [])

  // Fetch CMS content with graceful fallback to DEFAULTS
  useEffect(() => {
    fetch('/api/landing-content')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => { if (j?.data && Object.keys(j.data).length > 0) setContent(j.data) })
      .catch(() => { /* use DEFAULTS */ })
  }, [])

  function ctaUrl(meta: Record<string, unknown> | null | undefined) {
    if (!meta) return isLoggedIn ? '/main/catat' : '/login'
    return isLoggedIn
      ? metaStr(meta, 'cta_url_auth', '/main/catat')
      : metaStr(meta, 'cta_url_guest', '/login')
  }

  const hero     = content.hero?.[0]
  const steps    = content.how_it_works ?? []
  const features = content.features ?? []
  const stats    = content.stats ?? []
  const cta      = content.cta?.[0]

  // CTA labels — show logged-in variant only after hydration to avoid mismatch
  const heroCTALabel   = hydrated && isLoggedIn ? 'Catat Makan Sekarang' : metaStr(hero?.meta, 'cta_label', 'Mulai Sekarang')
  const bottomCTALabel = hydrated && isLoggedIn ? 'Catat Makan Sekarang' : metaStr(cta?.meta, 'cta_label', 'Mulai Sekarang')

  // cta_note — read from DB meta (set via backoffice), fallback to DEFAULT_CTA_NOTE
  const heroNote   = metaStr(hero?.meta, 'cta_note', DEFAULT_CTA_NOTE)
  const bottomNote = metaStr(cta?.meta,  'cta_note', DEFAULT_CTA_NOTE)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }

        .gizku-root {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: #ffffff;
          color: #111827;
          min-height: 100dvh;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ── NAVBAR ── */
        .gk-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0,0,0,0.07);
          padding: 0 clamp(16px, 5vw, 48px);
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .gk-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .gk-logo-text { font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.02em; }
        .gk-nav-links { display: flex; align-items: center; gap: 8px; }
        .gk-btn-ghost {
          background: transparent; border: none; color: #6B7280;
          font-size: 14px; font-weight: 500; cursor: pointer;
          padding: 8px 14px; border-radius: 8px;
          transition: color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .gk-btn-ghost:hover { color: #111827; background: #F3F4F6; }
        .gk-btn-primary {
          background: #2ECC71; color: #fff; border: none;
          border-radius: 999px; padding: 9px 22px;
          font-size: 14px; font-weight: 700; cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
          box-shadow: 0 2px 10px rgba(46,204,113,0.35);
          font-family: inherit;
        }
        .gk-btn-primary:hover { background: #27AE60; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(46,204,113,0.4); }
        .gk-btn-primary:active { transform: translateY(0); }

        /* ── HERO ── */
        .gk-hero-section {
          padding: clamp(56px, 10vw, 96px) clamp(16px, 5vw, 48px) 0;
          text-align: center;
        }
        .gk-hero-inner { max-width: 720px; margin: 0 auto; }

        .gk-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: #ECFDF5; border: 1px solid #6EE7B7;
          border-radius: 999px; padding: 6px 16px;
          font-size: 13px; font-weight: 600; color: #059669;
          margin-bottom: 28px;
        }
        .gk-badge-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #10B981;
          animation: gk-pulse 2.2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes gk-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.45); }
          50% { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
        }

        .gk-hero-title {
          font-size: clamp(2.2rem, 6vw, 3.75rem);
          font-weight: 800; line-height: 1.1;
          letter-spacing: -0.03em;
          color: #111827;
          margin-bottom: 20px;
        }
        .gk-hero-title .green { color: #16A34A; }

        .gk-hero-sub {
          font-size: clamp(1rem, 2.5vw, 1.125rem);
          color: #6B7280; line-height: 1.8;
          max-width: 500px; margin: 0 auto 40px;
        }

        .gk-hero-cta-group {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; margin-bottom: 60px;
        }
        .gk-btn-hero {
          background: #2ECC71; color: #fff; border: none;
          border-radius: 999px; padding: 15px 44px;
          font-size: 16px; font-weight: 800; cursor: pointer;
          box-shadow: 0 4px 20px rgba(46,204,113,0.4);
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, background 0.15s;
          font-family: inherit; letter-spacing: -0.01em;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .gk-btn-hero:hover { background: #27AE60; transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 28px rgba(46,204,113,0.48); }
        .gk-btn-hero:active { transform: translateY(0) scale(1); }

        /*
         * gk-hero-note: teks kecil di bawah tombol CTA.
         * Sebelumnya #9CA3AF (kontras rendah). Sekarang #6B7280 (kontras WCAG AA).
         * Konten diambil dari DB meta.cta_note via backoffice Admin → Landing Page Editor.
         */
        .gk-hero-note {
          font-size: 13px;
          color: #6B7280;
          line-height: 1.6;
        }
        .gk-hero-note b { color: #374151; font-weight: 600; }

        /* ── APP PREVIEW CARD ── */
        .gk-preview-wrap {
          max-width: 360px; margin: 0 auto;
        }
        .gk-preview-card {
          background: #fff; border-radius: 24px; padding: 20px;
          border: 1px solid #E5E7EB;
          box-shadow:
            0 2px 4px rgba(0,0,0,0.04),
            0 8px 32px rgba(0,0,0,0.07),
            0 24px 64px rgba(0,0,0,0.04);
          text-align: left; overflow: hidden;
        }
        .gk-preview-top-bar {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 16px; padding-bottom: 14px;
          border-bottom: 1px solid #F3F4F6;
        }
        .gk-preview-dot { width: 8px; height: 8px; border-radius: 50%; }
        .gk-preview-food-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
        }
        .gk-preview-food-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 22px; line-height: 1;
        }
        .gk-preview-food-name { font-weight: 700; font-size: 15px; color: #111827; }
        .gk-preview-food-sub { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
        .gk-preview-kal {
          margin-left: auto; background: #ECFDF5; color: #059669;
          border-radius: 999px; padding: 4px 12px;
          font-size: 13px; font-weight: 700; white-space: nowrap;
        }
        .gk-calorie-section { margin-bottom: 16px; }
        .gk-calorie-header {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: 8px;
        }
        .gk-calorie-label { font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; }
        .gk-calorie-nums { font-size: 13px; color: #6B7280; }
        .gk-calorie-nums b { font-size: 20px; font-weight: 800; color: #111827; }
        .gk-calorie-bar { height: 8px; border-radius: 999px; background: #F3F4F6; overflow: hidden; margin-bottom: 14px; }
        .gk-calorie-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, #2ECC71, #16A34A);
          width: 78%;
        }
        .gk-macro-row { margin-bottom: 10px; }
        .gk-macro-labels { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
        .gk-macro-label { color: #6B7280; font-weight: 500; }
        .gk-macro-val { color: #374151; font-weight: 600; }
        .gk-macro-val span { color: #D1D5DB; font-weight: 400; }
        .gk-macro-bar { height: 5px; border-radius: 999px; background: #F3F4F6; overflow: hidden; }
        .gk-macro-fill { height: 100%; border-radius: 999px; }
        .gk-ai-insight {
          margin-top: 16px; background: #ECFDF5;
          border: 1px solid #A7F3D0; border-radius: 14px;
          padding: 12px 14px; display: flex; gap: 10px; align-items: flex-start;
        }
        .gk-ai-icon-wrap {
          width: 30px; height: 30px; border-radius: 8px;
          background: #2ECC71; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .gk-ai-tag { font-size: 10px; font-weight: 700; color: #059669; margin-bottom: 2px; letter-spacing: 0.06em; text-transform: uppercase; }
        .gk-ai-text { font-size: 12px; color: #374151; line-height: 1.55; }

        /* ── WAVE ── */
        .gk-wave { line-height: 0; display: block; margin-top: 56px; }
        .gk-wave svg { width: 100%; display: block; }

        /* ── SECTIONS ── */
        .gk-section { padding: clamp(56px, 9vw, 88px) clamp(16px, 5vw, 48px); }
        .gk-section-inner { max-width: 1040px; margin: 0 auto; }
        .gk-section-header { text-align: center; margin-bottom: clamp(36px, 6vw, 56px); }
        .gk-section-tag {
          display: inline-block;
          font-size: 12px; font-weight: 700; color: #059669;
          letter-spacing: 0.08em; text-transform: uppercase;
          background: #ECFDF5; border-radius: 999px;
          padding: 5px 14px; margin-bottom: 14px;
        }
        .gk-section-title {
          font-size: clamp(1.6rem, 4vw, 2.3rem);
          font-weight: 800; color: #111827;
          letter-spacing: -0.025em; line-height: 1.2;
          margin-bottom: 12px;
        }
        .gk-section-sub { font-size: 16px; color: #6B7280; max-width: 460px; margin: 0 auto; line-height: 1.75; }

        /* ── STEPS ── */
        .gk-steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .gk-step-card {
          background: #fff; border-radius: 20px;
          padding: clamp(20px, 3vw, 28px);
          border: 1px solid #E5E7EB;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
        }
        .gk-step-card:hover { transform: translateY(-4px); box-shadow: 0 10px 36px rgba(0,0,0,0.09); }
        .gk-step-num {
          font-size: 11px; font-weight: 700; color: #2ECC71;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px;
        }
        .gk-step-icon-wrap {
          width: 52px; height: 52px; border-radius: 14px;
          background: #ECFDF5; color: #059669;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .gk-step-title { font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .gk-step-sub { font-size: 14px; color: #6B7280; line-height: 1.7; }

        /* ── FEATURES ── */
        .gk-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .gk-feature-card {
          border-radius: 18px; padding: clamp(18px, 3vw, 24px);
          border: 1px solid #E5E7EB; background: #FAFAFA;
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
        }
        .gk-feature-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.07); }
        .gk-feature-icon-wrap {
          width: 44px; height: 44px; border-radius: 12px;
          background: #ECFDF5; color: #059669;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .gk-feature-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .gk-feature-sub { font-size: 13px; color: #6B7280; line-height: 1.65; }

        /* ── STATS ── */
        .gk-stats-section {
          background: linear-gradient(135deg, #2ECC71 0%, #16A34A 100%);
          padding: clamp(52px, 9vw, 80px) clamp(16px, 5vw, 48px);
        }
        .gk-stats-inner {
          max-width: 860px; margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 36px; text-align: center;
        }
        .gk-stat-icon-wrap {
          width: 48px; height: 48px; border-radius: 14px;
          background: rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px; color: #fff;
        }
        .gk-stat-num {
          font-size: clamp(2rem, 5vw, 2.8rem); font-weight: 800;
          color: #fff; letter-spacing: -0.03em; line-height: 1; margin-bottom: 8px;
        }
        .gk-stat-label { font-size: 14px; color: rgba(255,255,255,0.88); font-weight: 500; }

        /* ── CTA BOTTOM ── */
        .gk-cta-section {
          background: #F0FDF4;
          padding: clamp(64px, 10vw, 96px) clamp(16px, 5vw, 48px);
          text-align: center;
        }
        .gk-cta-inner { max-width: 560px; margin: 0 auto; }
        .gk-cta-title {
          font-size: clamp(1.8rem, 4.5vw, 2.7rem);
          font-weight: 800; color: #111827;
          letter-spacing: -0.025em; line-height: 1.15;
          margin-bottom: 16px;
        }
        .gk-cta-title .green { color: #16A34A; }
        .gk-cta-sub { font-size: 16px; color: #6B7280; margin-bottom: 16px; line-height: 1.75; }
        .gk-cta-perks {
          display: flex; gap: 20px; justify-content: center;
          flex-wrap: wrap; margin-bottom: 36px;
        }
        .gk-cta-perk {
          display: flex; align-items: center; gap: 7px;
          font-size: 14px; color: #374151; font-weight: 500;
        }
        .gk-cta-perk-check { color: #16A34A; flex-shrink: 0; }

        /* ── FOOTER ── */
        .gk-footer {
          background: #0F172A; color: rgba(255,255,255,0.5);
          padding: clamp(32px, 5vw, 48px) clamp(16px, 5vw, 48px);
          text-align: center; font-size: 13px;
        }
        .gk-footer-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 14px; }
        .gk-footer-brand { font-size: 17px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
        .gk-footer-desc { margin-bottom: 8px; line-height: 1.6; }
        .gk-footer-copy { color: rgba(255,255,255,0.3); font-size: 12px; }

        /* ── MOBILE ── */
        @media (max-width: 640px) {
          .gk-nav-links .gk-btn-ghost { display: none; }
          .gk-cta-perks { flex-direction: column; align-items: center; gap: 12px; }
          .gk-preview-wrap { padding: 0 4px; }
        }

        /* ── REDUCED MOTION ── */
        @media (prefers-reduced-motion: reduce) {
          .gk-badge-dot { animation: none; }
          .gk-step-card:hover,
          .gk-feature-card:hover,
          .gk-btn-hero:hover,
          .gk-btn-primary:hover { transform: none; }
        }
      `}</style>

      <div className="gizku-root">

        {/* ── NAVBAR ── */}
        <nav className="gk-nav" role="navigation" aria-label="Navigasi utama">
          <Link className="gk-logo" href="/" aria-label="Gizku — kembali ke beranda">
            <GizkuLogo size={36} />
            <span className="gk-logo-text">Gizku</span>
          </Link>
          <div className="gk-nav-links">
            {hydrated && isLoggedIn ? (
              <button className="gk-btn-primary" onClick={() => router.push('/main/catat')}>
                Buka Aplikasi
              </button>
            ) : (
              <>
                <button className="gk-btn-ghost" onClick={() => router.push('/login')}>Masuk</button>
                <button className="gk-btn-primary" onClick={() => router.push('/login')}>Daftar Gratis</button>
              </>
            )}
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="gk-hero-section" aria-label="Pengenalan Gizku">
          <div className="gk-hero-inner">
            <div className="gk-badge" role="note">
              <span className="gk-badge-dot" aria-hidden="true" />
              Didukung teknologi AI
            </div>

            <h1 className="gk-hero-title">
              Makan <span className="green">Cerdas.</span><br />
              Hidup Lebih <span className="green">Baik.</span>
            </h1>

            <p className="gk-hero-sub">
              {hero?.subtitle ?? 'AI Nutrition Companion yang membuat pelacakan kalori jadi mudah, informatif, dan personal.'}
            </p>

            <div className="gk-hero-cta-group">
              <button
                className="gk-btn-hero"
                onClick={() => router.push(ctaUrl(hero?.meta))}
                aria-label={heroCTALabel}
              >
                {heroCTALabel} →
              </button>
              {/* heroNote dibaca dari DB (meta.cta_note). Edit via Admin → Landing Page Editor → Hero → "Catatan di bawah tombol" */}
              {heroNote && (
                <p className="gk-hero-note">{heroNote}</p>
              )}
            </div>

            {/* App UI Preview */}
            <div className="gk-preview-wrap" role="img" aria-label="Preview tampilan aplikasi Gizku menampilkan analisis nutrisi makanan">
              <div className="gk-preview-card">
                {/* Fake window chrome */}
                <div className="gk-preview-top-bar" aria-hidden="true">
                  <div className="gk-preview-dot" style={{ background: '#FC5C65' }} />
                  <div className="gk-preview-dot" style={{ background: '#FED330' }} />
                  <div className="gk-preview-dot" style={{ background: '#26de81' }} />
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>Gizku · Analisa Nutrisi</span>
                </div>

                {/* Food item */}
                <div className="gk-preview-food-row">
                  <div className="gk-preview-food-icon" aria-hidden="true">🥗</div>
                  <div>
                    <div className="gk-preview-food-name">Gado-gado</div>
                    <div className="gk-preview-food-sub">Makan siang · Baru saja</div>
                  </div>
                  <div className="gk-preview-kal">340 kal</div>
                </div>

                {/* Calorie budget */}
                <div className="gk-calorie-section">
                  <div className="gk-calorie-header">
                    <span className="gk-calorie-label">Anggaran Kalori</span>
                    <span className="gk-calorie-nums"><b>1.650</b> / 2.100 kcal</span>
                  </div>
                  <div className="gk-calorie-bar">
                    <div className="gk-calorie-fill" />
                  </div>
                </div>

                {/* Macros */}
                {[
                  { label: 'Protein', val: '82g', sub: '/ 120g', pct: 68, color: '#3B82F6' },
                  { label: 'Karbo',   val: '180g', sub: '/ 200g', pct: 90, color: '#F59E0B' },
                  { label: 'Lemak',   val: '45g',  sub: '/ 70g',  pct: 64, color: '#EF4444' },
                ].map(m => (
                  <div className="gk-macro-row" key={m.label}>
                    <div className="gk-macro-labels">
                      <span className="gk-macro-label">{m.label}</span>
                      <span className="gk-macro-val">{m.val} <span>{m.sub}</span></span>
                    </div>
                    <div className="gk-macro-bar">
                      <div className="gk-macro-fill" style={{ width: `${m.pct}%`, background: m.color }} />
                    </div>
                  </div>
                ))}

                {/* AI Insight */}
                <div className="gk-ai-insight">
                  <div className="gk-ai-icon-wrap" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
                      <line x1="9" y1="21" x2="15" y2="21"/>
                      <line x1="10" y1="17" x2="10" y2="21"/>
                      <line x1="14" y1="17" x2="14" y2="21"/>
                    </svg>
                  </div>
                  <div>
                    <div className="gk-ai-tag">AI Insight</div>
                    <div className="gk-ai-text">Pilihan bagus! Gado-gado kaya serat dan protein nabati. Kamu sudah di jalur yang benar hari ini.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WAVE (white → mint) ── */}
        <div className="gk-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,40 C280,80 760,0 1440,40 L1440,80 L0,80 Z" fill="#ECFDF5"/>
          </svg>
        </div>

        {/* ── HOW IT WORKS ── */}
        <section className="gk-section" style={{ background: '#ECFDF5' }} aria-labelledby="how-title">
          <div className="gk-section-inner">
            <div className="gk-section-header">
              <div className="gk-section-tag">Cara Kerja</div>
              <h2 className="gk-section-title" id="how-title">Tiga langkah, langsung jalan</h2>
              <p className="gk-section-sub">Tidak perlu setup panjang. Foto, analisa, pantau — semudah itu.</p>
            </div>
            <div className="gk-steps-grid">
              {steps.map((step, i) => (
                <article className="gk-step-card" key={step.id}>
                  <div className="gk-step-num">Langkah 0{(step.meta?.step as number) ?? i + 1}</div>
                  <div className="gk-step-icon-wrap">
                    {STEP_ICONS[i] ?? STEP_ICONS[0]}
                  </div>
                  <h3 className="gk-step-title">{step.title}</h3>
                  <p className="gk-step-sub">{step.subtitle}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── WAVE (mint → white) ── */}
        <div className="gk-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,40 C680,0 1100,80 1440,40 L1440,0 L0,0 Z" fill="#ECFDF5"/>
          </svg>
        </div>

        {/* ── FEATURES ── */}
        <section className="gk-section" style={{ background: '#fff' }} aria-labelledby="features-title">
          <div className="gk-section-inner">
            <div className="gk-section-header">
              <div className="gk-section-tag">Fitur Unggulan</div>
              <h2 className="gk-section-title" id="features-title">Dirancang untuk gaya hidupmu</h2>
              <p className="gk-section-sub">Mencatat nutrisi terasa natural, bukan beban — karena konsistensi itu kuncinya.</p>
            </div>
            <div className="gk-features-grid">
              {features.map((f, i) => (
                <article className="gk-feature-card" key={f.id}>
                  <div className="gk-feature-icon-wrap">
                    {FEATURE_ICONS[i] ?? FEATURE_ICONS[0]}
                  </div>
                  <h3 className="gk-feature-title">{f.title}</h3>
                  <p className="gk-feature-sub">{f.subtitle}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="gk-stats-section" aria-label="Statistik pengguna Gizku">
          <div className="gk-stats-inner">
            {stats.map((s, i) => (
              <div key={s.id}>
                <div className="gk-stat-icon-wrap">
                  {STAT_ICONS[i] ?? <IconUsers />}
                </div>
                <div className="gk-stat-num">{s.title}</div>
                <div className="gk-stat-label">{s.subtitle}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA BOTTOM ── */}
        <section className="gk-cta-section" aria-labelledby="cta-title">
          <div className="gk-cta-inner">
            <h2 className="gk-cta-title" id="cta-title">
              Mulai Perjalanan <span className="green">Sehatmu</span> Hari Ini
            </h2>
            <p className="gk-cta-sub">
              {cta?.subtitle ?? 'Bergabung sekarang dan mulai pahami apa yang kamu makan setiap hari.'}
            </p>
            <div className="gk-cta-perks" aria-label="Keunggulan Gizku">
              {['Gratis selamanya', 'Tanpa kartu kredit', 'Langsung bisa dipakai'].map(perk => (
                <div className="gk-cta-perk" key={perk}>
                  <span className="gk-cta-perk-check"><IconCheck /></span>
                  {perk}
                </div>
              ))}
            </div>
            <button
              className="gk-btn-hero"
              onClick={() => router.push(ctaUrl(cta?.meta))}
              aria-label={bottomCTALabel}
            >
              {bottomCTALabel} →
            </button>
            {/* bottomNote dibaca dari DB (meta.cta_note). Edit via Admin → Landing Page Editor → CTA → "Catatan di bawah tombol" */}
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
