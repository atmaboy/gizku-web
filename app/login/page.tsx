'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BrandAnnouncement from '@/components/BrandAnnouncement'

type MaintenanceInfo = { title: string; description: string } | null
type PageTab = 'login' | 'register' | 'reset'

const IconEye = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const IconEyeOff = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const IconArrowLeft = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
)

const IconLock = (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<PageTab>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [maintenance, setMaintenance] = useState<MaintenanceInfo>(null)

  useEffect(() => {
    const token = localStorage.getItem('nl_token')
    if (token) { router.replace('/main/catat'); return }
    document.documentElement.classList.remove('dark')

    const raw = localStorage.getItem('nl_maintenance')
    if (raw) {
      try { setMaintenance(JSON.parse(raw)) } catch {}
      localStorage.removeItem('nl_maintenance')
    }
  }, [router])

  function switchTab(t: PageTab) {
    setTab(t)
    setError('')
    setSuccessMsg('')
    setMaintenance(null)
    setEmail('')
    setUsername('')
    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  // ── Handler: Login & Register ───────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')
    setMaintenance(null)
    try {
      if (tab === 'register') {
        const trimmedEmail = email.trim().toLowerCase()
        if (!trimmedEmail) { setError('Email diperlukan'); setLoading(false); return }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedEmail)) { setError('Format email tidak valid'); setLoading(false); return }
      }

      const endpoint = tab === 'login' ? '/api/auth?action=login' : '/api/auth?action=register'
      const body: Record<string, string> = { username: username.trim().toLowerCase(), password }
      if (tab === 'register') body.email = email.trim().toLowerCase()

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.maintenance) {
        setMaintenance({
          title: data.maintenance.title || 'Aplikasi Sedang Dalam Pemeliharaan',
          description: data.maintenance.description || 'Silakan coba beberapa saat lagi.',
        })
        return
      }

      if (!res.ok) { setError(data.error || 'Terjadi kesalahan'); return }

      localStorage.setItem('nl_token', data.token)
      localStorage.setItem('nl_user', JSON.stringify(data.user))

      // FIX: Simpan flag nl_must_change_password ke localStorage SEBELUM redirect
      // agar force-change-password/page.tsx bisa membacanya dengan benar
      if (data.user?.mustChangePassword) {
        localStorage.setItem('nl_must_change_password', 'true')
        router.replace('/main/force-change-password')
        return
      }

      // Pastikan flag dibersihkan jika user normal login (tidak perlu ganti password)
      localStorage.removeItem('nl_must_change_password')
      router.replace('/main/catat')
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  // ── Handler: Reset Password (user belum login) ────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!username.trim()) { setError('Username diperlukan'); return }
    if (!newPassword) { setError('Password baru diperlukan'); return }
    if (newPassword.length < 6) { setError('Password minimal 6 karakter'); return }
    if (newPassword !== confirmPassword) { setError('Konfirmasi password tidak cocok'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth?action=reset_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal reset password'); return }

      setSuccessMsg('Password berhasil direset! Silakan login dengan password baru.')
      setUsername('')
      setNewPassword('')
      setConfirmPassword('')
      // Kembali ke tab login setelah 2 detik
      setTimeout(() => switchTab('login'), 2000)
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  const C = {
    bg: '#F9FAFB',
    white: '#FFFFFF',
    border: '#E5E7EB',
    border2: '#D1D5DB',
    text: '#111827',
    muted: '#6B7280',
    green: '#2ECC71',
    greenDim: '#D4F5E4',
    red: '#EF4444',
    orange: '#F59E0B',
    orangeDim: 'rgba(245,158,11,.08)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: C.bg,
    border: `1px solid ${C.border2}`,
    borderRadius: 12,
    padding: '12px 14px',
    color: C.text,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: C.muted,
    letterSpacing: '.5px',
    textTransform: 'uppercase',
    marginBottom: 5,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }

  // ── Render: Reset Password View ───────────────────────────────────
  if (tab === 'reset') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 22px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />

        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Logo kecil */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 10 }}>
            <svg width="52" height="52" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#2ECC71"/>
              <path d="M8 16 Q8 23 16 23 Q24 23 24 16" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <line x1="8" y1="16" x2="24" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="12,11 15,14.5 20.5,9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 28, color: C.text }}>Gizku</div>
          </div>

          <div style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 24,
            padding: 24,
            boxShadow: '0 1px 8px rgba(0,0,0,.06)',
          }}>
            {/* Back button */}
            <button
              onClick={() => switchTab('login')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: C.muted, fontSize: 13, fontWeight: 500, padding: 0,
                marginBottom: 20, fontFamily: "'Inter', sans-serif",
              }}
            >
              {IconArrowLeft}
              Kembali ke Login
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ color: C.muted, marginBottom: 10 }}>{IconLock}</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 6 }}>
                Reset Password
              </div>
              <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
                Masukkan username dan password baru kamu
              </div>
            </div>

            {/* Success message */}
            {successMsg && (
              <div style={{
                background: 'rgba(46,204,113,.08)',
                border: '1px solid rgba(46,204,113,.3)',
                borderRadius: 10,
                padding: '9px 13px',
                color: '#16A34A',
                fontSize: 13,
                marginBottom: 12,
                textAlign: 'center',
              }}>✅ {successMsg}</div>
            )}

            {/* Error message */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,.08)',
                border: '1px solid rgba(239,68,68,.2)',
                borderRadius: 10,
                padding: '9px 13px',
                color: C.red,
                fontSize: 13,
                marginBottom: 12,
              }}>{error}</div>
            )}

            <form onSubmit={handleReset}>
              <div style={{ marginBottom: 13 }}>
                <div style={labelStyle}>Username</div>
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan username kamu" required autoFocus
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 13 }}>
                <div style={labelStyle}>Password Baru</div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter" required
                    style={{ ...inputStyle, padding: '12px 44px 12px 14px' }}
                  />
                  <button type="button" onClick={() => setShowNewPass(s => !s)}
                    aria-label={showNewPass ? 'Sembunyikan password' : 'Tampilkan password'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: C.muted, display: 'flex', alignItems: 'center', padding: 0,
                    }}
                  >{showNewPass ? IconEyeOff : IconEye}</button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={labelStyle}>Konfirmasi Password Baru</div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru" required
                    style={{
                      ...inputStyle,
                      padding: '12px 44px 12px 14px',
                      borderColor: confirmPassword && confirmPassword !== newPassword ? C.red : C.border2,
                    }}
                  />
                  <button type="button" onClick={() => setShowConfirmPass(s => !s)}
                    aria-label={showConfirmPass ? 'Sembunyikan password' : 'Tampilkan password'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: C.muted, display: 'flex', alignItems: 'center', padding: 0,
                    }}
                  >{showConfirmPass ? IconEyeOff : IconEye}</button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <div style={{ color: C.red, fontSize: 11, marginTop: 4 }}>
                    Password tidak cocok
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: 14, background: C.green, borderRadius: 13,
                color: '#FFFFFF', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, transition: 'opacity .2s',
              }}>
                {loading ? '⏳ Memproses...' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Login & Register View ────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      background: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 22px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 10 }}>
          <svg width="52" height="52" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="16" fill="#2ECC71"/>
            <path d="M8 16 Q8 23 16 23 Q24 23 24 16" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <line x1="8" y1="16" x2="24" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <polyline points="12,11 15,14.5 20.5,9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 28,
              color: C.text,
              lineHeight: 1.2,
            }}>Gizku</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4, fontWeight: 400 }}>
              AI Nutrition Companion
            </div>
          </div>
        </div>

        {/* Brand Announcement */}
        <BrandAnnouncement />

        {/* Maintenance Banner */}
        {maintenance && (
          <div style={{
            background: 'rgba(251,191,36,.08)',
            border: '1px solid rgba(251,191,36,.3)',
            borderRadius: 16,
            padding: '16px 18px',
            marginBottom: 18,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔧</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#D97706', marginBottom: 6 }}>
              {maintenance.title}
            </div>
            <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
              {maintenance.description}
            </div>
          </div>
        )}

        {/* Success banner (setelah reset berhasil) */}
        {successMsg && (
          <div style={{
            background: 'rgba(46,204,113,.08)',
            border: '1px solid rgba(46,204,113,.3)',
            borderRadius: 16,
            padding: '14px 18px',
            marginBottom: 18,
            textAlign: 'center',
            color: '#16A34A',
            fontSize: 13,
          }}>✅ {successMsg}</div>
        )}

        {/* Card */}
        <div style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 1px 8px rgba(0,0,0,.06)',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 4,
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 999,
            padding: 4,
            marginBottom: 20,
            height: 48,
            alignItems: 'center',
          }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => switchTab(t)} style={{
                flex: 1,
                height: '100%',
                borderRadius: 999,
                fontFamily: "'Inter', sans-serif",
                fontWeight: tab === t ? 600 : 500,
                fontSize: 14,
                background: tab === t ? C.greenDim : 'transparent',
                color: tab === t ? C.text : C.muted,
                border: 'none',
                cursor: 'pointer',
                transition: 'all .2s',
              }}>
                {t === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,.08)',
                border: '1px solid rgba(239,68,68,.2)',
                borderRadius: 10,
                padding: '9px 13px',
                color: C.red,
                fontSize: 13,
                marginBottom: 12,
              }}>{error}</div>
            )}

            <div style={{ marginBottom: 13 }}>
              <div style={labelStyle}>Username</div>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username" required autoFocus
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: tab === 'register' ? 13 : 8 }}>
              <div style={labelStyle}>Password</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password" required
                  style={{ ...inputStyle, padding: '12px 44px 12px 14px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: C.muted, display: 'flex', alignItems: 'center', padding: 0,
                  }}
                >
                  {showPass ? IconEyeOff : IconEye}
                </button>
              </div>
            </div>

            {/* Link reset password — hanya tampil di tab Login */}
            {tab === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <span
                  onClick={() => switchTab('reset')}
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.green)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                >
                  Lupa password?
                </span>
              </div>
            )}

            {/* Email field — hanya tampil saat Daftar */}
            {tab === 'register' && (
              <div style={{ marginBottom: 20 }}>
                <div style={labelStyle}>
                  Email
                  <span style={{ color: C.red, fontWeight: 700, fontSize: 10 }}>*</span>
                </div>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="contoh@email.com" required
                  style={inputStyle}
                />
              </div>
            )}

            {tab !== 'register' && <div style={{ marginBottom: 12 }} />}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: 14, background: C.green, borderRadius: 13,
              color: '#FFFFFF', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1, transition: 'opacity .2s',
            }}>
              {loading ? '⏳ Memproses...' : tab === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          </form>

          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            {tab === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <span
              onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
              style={{ color: C.green, cursor: 'pointer', fontWeight: 600 }}
            >
              {tab === 'login' ? 'Daftar sekarang' : 'Masuk'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
