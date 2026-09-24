'use client'

import { useEffect, useRef, useState } from 'react'

export default function StagingBanner() {
  const [dismissed, setDismissed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const env = process.env.NEXT_PUBLIC_APP_ENV
  const isStaging = env === 'staging' || env === 'preview'
  const visible = isStaging && !dismissed

  // Expose the banner height as --staging-banner-h so fixed/sticky chrome
  // (e.g. the admin shell) can offset itself instead of sitting underneath.
  useEffect(() => {
    const root = document.documentElement
    const el = ref.current
    if (!visible || !el) { root.style.setProperty('--staging-banner-h', '0px'); return }
    const update = () => root.style.setProperty('--staging-banner-h', `${el.offsetHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { ro.disconnect(); root.style.setProperty('--staging-banner-h', '0px') }
  }, [visible])

  if (!visible) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const projectRef = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? 'unknown'

  return (
    <div
      ref={ref}
      role="alert"
      aria-label="Staging environment banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#f59e0b',
        color: '#1c1917',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: 'var(--font-inter, sans-serif)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        lineHeight: 1.4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span>
          <strong>STAGING ENVIRONMENT</strong>
          {' — '}
          Ini bukan production. Data di sini adalah data testing.
        </span>
        <span
          style={{
            backgroundColor: 'rgba(0,0,0,0.12)',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            letterSpacing: '0.02em',
          }}
        >
          db: {projectRef}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss staging banner"
        style={{
          background: 'rgba(0,0,0,0.15)',
          border: 'none',
          borderRadius: '4px',
          color: '#1c1917',
          cursor: 'pointer',
          padding: '4px 10px',
          fontSize: '13px',
          fontWeight: 600,
          flexShrink: 0,
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.25)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.15)')}
      >
        Tutup ✕
      </button>
    </div>
  )
}
