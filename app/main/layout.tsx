'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

type User = { id: string; username: string }

const skeletonStyle = `
@keyframes gizku-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.gizku-skeleton {
  background: linear-gradient(90deg, #F3F4F6 25%, #E9EAEC 50%, #F3F4F6 75%);
  background-size: 800px 100%;
  animation: gizku-shimmer 1.4s ease-in-out infinite;
  border-radius: 8px;
}
`

function AppShellSkeleton() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: skeletonStyle }} />
      <div style={{
        maxWidth: 480, margin: '0 auto', minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        background: '#F9FAFB', fontFamily: 'var(--font-inter), sans-serif',
      }}>
        <header style={{
          background: '#F9FAFB',
          padding: 'calc(10px + env(safe-area-inset-top, 0px)) 16px 0',
          position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
        }}>
          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="gizku-skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <div>
                <div className="gizku-skeleton" style={{ width: 60, height: 14, marginBottom: 4 }} />
                <div className="gizku-skeleton" style={{ width: 120, height: 10 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="gizku-skeleton" style={{ width: 96, height: 40, borderRadius: 999 }} />
              <div className="gizku-skeleton" style={{ width: 100, height: 40, borderRadius: 999 }} />
            </div>
          </div>
          <div className="gizku-skeleton" style={{ height: 56, borderRadius: 999, marginTop: 8, marginBottom: 12 }} />
        </header>
        <main style={{ flex: 1, padding: '14px 16px' }}>
          <div className="gizku-skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 12 }} />
          <div className="gizku-skeleton" style={{ height: 80, borderRadius: 14, marginBottom: 10 }} />
          <div className="gizku-skeleton" style={{ height: 80, borderRadius: 14, marginBottom: 10 }} />
          <div className="gizku-skeleton" style={{ height: 80, borderRadius: 14 }} />
        </main>
      </div>
    </>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [reportMsg, setReportMsg] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportDone, setReportDone] = useState(false)
  const [reportError, setReportError] = useState('')
  const [dayKcal, setDayKcal] = useState<number | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState(false)

  // ── Ubah Password state ──
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [cpUsername, setCpUsername] = useState('')
  const [cpNew, setCpNew] = useState('')
  const [cpConfirm, setCpConfirm] = useState('')
  const [cpShowNew, setCpShowNew] = useState(false)
  const [cpShowConfirm, setCpShowConfirm] = useState(false)
  const [cpLoading, setCpLoading] = useState(false)
  const [cpError, setCpError] = useState('')
  const [cpSuccess, setCpSuccess] = useState(false)

  const forceLogout = useCallback(() => {
    localStorage.removeItem('nl_token')
    localStorage.removeItem('nl_user')
    localStorage.removeItem('nl_must_change_password')
    router.replace('/login')
  }, [router])

  const initApp = useCallback(async (token: string, userStr: string) => {
    const mustChangeFlagLS = localStorage.getItem('nl_must_change_password')
    let mustChange = mustChangeFlagLS === 'true'

    if (!mustChange) {
      try {
        const parsedUser = JSON.parse(userStr)
        if (parsedUser?.mustChangePassword === true) {
          localStorage.setItem('nl_must_change_password', 'true')
          mustChange = true
        }
      } catch { /* fail-open */ }
    }

    if (mustChange && !pathname.includes('force-change-password')) {
      router.replace('/main/force-change-password')
      return
    }

    const headers = { Authorization: `Bearer ${token}` }

    const [todayResult, emailResult, maintenanceResult] = await Promise.allSettled([
      fetch('/api/history?action=today', { headers, cache: 'no-store' }),
      fetch('/api/user?action=profile',  { headers, cache: 'no-store' }),
      fetch('/api/maintenance',           { headers, cache: 'no-store' }),
    ])

    if (todayResult.status === 'fulfilled') {
      const res = todayResult.value
      if (res.status === 401) { forceLogout(); return }
      try {
        const data = await res.json()
        setDayKcal(data.summary?.totalCalories ?? 0)
      } catch { setDayKcal(0) }
    } else {
      setDayKcal(0)
    }

    if (emailResult.status === 'fulfilled' && emailResult.value.ok) {
      try {
        const data = await emailResult.value.json()
        setUserEmail(data.user?.email ?? null)
      } catch { /* fail-open */ }
    }

    if (maintenanceResult.status === 'fulfilled' && maintenanceResult.value.ok) {
      try {
        const data = await maintenanceResult.value.json()
        if (data?.enabled) {
          localStorage.setItem('nl_maintenance', JSON.stringify({
            title: data.title || 'Aplikasi Sedang Dalam Pemeliharaan',
            description: data.description || 'Kami sedang melakukan peningkatan sistem. Silakan coba beberapa saat lagi.',
          }))
          forceLogout()
          return
        }
      } catch { /* fail-open */ }
    }

    setUser(JSON.parse(userStr))
  }, [forceLogout, pathname])

  useEffect(() => {
    const token = localStorage.getItem('nl_token')
    const u = localStorage.getItem('nl_user')
    if (!token || !u) { router.replace('/login'); return }
    document.documentElement.classList.remove('dark')
    initApp(token, u)
  }, [router, initApp])

  async function logout() {
    localStorage.removeItem('nl_token')
    localStorage.removeItem('nl_user')
    localStorage.removeItem('nl_must_change_password')
    router.replace('/login')
  }

  async function submitReport() {
    if (!reportMsg.trim()) return
    setReportSending(true)
    setReportError('')
    try {
      const token = localStorage.getItem('nl_token') || ''
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: reportMsg }),
      })
      if (res.status === 401) { forceLogout(); return }
      if (res.ok) {
        setReportDone(true)
        setReportMsg('')
        setReportError('')
      } else {
        try {
          const data = await res.json()
          setReportError(data.error || 'Gagal mengirim laporan. Silakan coba lagi.')
        } catch {
          setReportError('Gagal mengirim laporan. Silakan coba lagi.')
        }
      }
    } catch {
      setReportError('Tidak dapat terhubung ke server. Periksa koneksi internet kamu.')
    } finally {
      setReportSending(false)
    }
  }

  async function saveEmail() {
    const trimmed = emailInput.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmed) { setEmailError('Email tidak boleh kosong'); return }
    if (!emailRegex.test(trimmed)) { setEmailError('Format email tidak valid'); return }
    setEmailSaving(true)
    setEmailError('')
    try {
      const token = localStorage.getItem('nl_token') || ''
      const res = await fetch('/api/user?action=update_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setEmailError(data.error || 'Gagal menyimpan email'); return }
      setUserEmail(trimmed)
      setEmailSuccess(true)
      setShowEmailForm(false)
      setEmailInput('')
      setTimeout(() => setEmailSuccess(false), 3000)
    } catch {
      setEmailError('Tidak dapat terhubung ke server')
    } finally {
      setEmailSaving(false)
    }
  }

  // ── Ubah Password submit ──
  async function submitChangePassword() {
    setCpError('')
    const trimUser = cpUsername.trim().toLowerCase()
    const trimNew  = cpNew.trim()
    const trimConf = cpConfirm.trim()

    if (!trimUser) { setCpError('Masukkan username kamu untuk konfirmasi'); return }
    if (trimUser !== (user?.username ?? '').toLowerCase()) { setCpError('Username tidak cocok dengan akun yang sedang login'); return }
    if (trimNew.length < 6) { setCpError('Password baru minimal 6 karakter'); return }
    if (trimNew !== trimConf) { setCpError('Konfirmasi password tidak cocok'); return }

    setCpLoading(true)
    try {
      const token = localStorage.getItem('nl_token') || ''
      const res = await fetch('/api/auth?action=change_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: trimUser, newPassword: trimNew }),
      })
      const data = await res.json()
      if (!res.ok) { setCpError(data.error || 'Gagal mengubah password. Coba lagi.'); return }
      setCpSuccess(true)
      setTimeout(() => {
        localStorage.removeItem('nl_token')
        localStorage.removeItem('nl_user')
        localStorage.removeItem('nl_must_change_password')
        router.replace('/login')
      }, 2200)
    } catch {
      setCpError('Tidak dapat terhubung ke server. Periksa koneksi internet kamu.')
    } finally {
      setCpLoading(false)
    }
  }

  function openChangePassword() {
    setCpUsername(''); setCpNew(''); setCpConfirm('')
    setCpShowNew(false); setCpShowConfirm(false)
    setCpError(''); setCpSuccess(false)
    setShowUserMenu(false)
    setShowChangePassword(true)
  }

  if (!user) return <AppShellSkeleton />

  const initial = user.username[0]?.toUpperCase() ?? 'U'

  const C = {
    bg: '#F9FAFB', white: '#FFFFFF', border: '#E5E7EB',
    text: '#111827', muted: '#6B7280', green: '#2ECC71',
    greenDim: '#D4F5E4', red: '#EF4444', orange: '#F59E0B', orangeDim: '#FEF3C7',
    greenDeep: '#15803D',
  }

  const inputBase: React.CSSProperties = {
    width: '100%', background: C.bg, border: `1.5px solid ${C.border}`,
    borderRadius: 12, padding: '12px 42px 12px 13px', color: C.text,
    fontSize: 14, outline: 'none', fontFamily: 'var(--font-inter), sans-serif',
  }

  const IconMail = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  )
  const IconReport = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
  const IconLogout = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
  const IconLock = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
  const IconSettings = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
  const EyeIcon = ({ open }: { open: boolean }) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
      ) : (
        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      )}
    </svg>
  )

  return (
    <>
      <div style={{
        maxWidth: 480, margin: '0 auto', minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-inter), sans-serif', background: C.bg,
      }}>
        {/* ── HEADER ── */}
        <header style={{
          background: C.bg,
          padding: 'calc(10px + env(safe-area-inset-top, 0px)) 16px 0',
          position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
        }}>
          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#2ECC71"/>
                <path d="M8 16 Q8 23 16 23 Q24 23 24 16" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <line x1="8" y1="16" x2="24" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="12,11 15,14.5 20.5,9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <div>
                <div style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontWeight: 600, fontSize: 20, color: C.text, lineHeight: 1.2 }}>Gizku</div>
                <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 400, fontSize: 12, color: C.muted, lineHeight: 1.2 }}>AI Nutrition Companion</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 96, height: 40, background: C.white, border: `1px solid ${C.border}`, borderRadius: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 16, color: C.text, lineHeight: 1.1 }}>
                  {dayKcal !== null ? dayKcal.toLocaleString('id-ID') : '—'}
                </span>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 400, fontSize: 11, color: C.muted, lineHeight: 1.1 }}>kkal hari ini</span>
              </div>

              <div onClick={() => setShowUserMenu(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.white, border: `1px solid ${C.border}`, borderRadius: 999, padding: '5px 10px 5px 7px', cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.green, color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-montserrat), sans-serif' }}>{initial}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</span>
                {userEmail === null && (
                  <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: C.orange, border: `1.5px solid ${C.white}` }} />
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', background: C.white, border: `1px solid ${C.border}`, borderRadius: 999, padding: 4, marginTop: 8, marginBottom: 12, height: 56, alignItems: 'center' }}>
            {([
              { href: '/main/catat', label: 'Catat Makan', icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>) },
              { href: '/main/riwayat', label: 'Riwayat', icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>) },
              { href: '/main/settings', label: 'Pengaturan', icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>) },
            ] as const).map(({ href, label, icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link key={href} href={href} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%', borderRadius: 999, fontFamily: 'var(--font-inter), sans-serif', fontWeight: active ? 600 : 500, fontSize: 13, textDecoration: 'none', background: active ? C.greenDim : 'transparent', color: active ? C.text : C.muted, transition: 'all .2s' }}>
                  <span style={{ color: active ? C.green : C.muted }}>{icon}</span>
                  {label}
                </Link>
              )
            })}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '14px 16px calc(env(safe-area-inset-bottom, 0px) + 14px)', background: C.bg }}>
          {children}
        </main>

        <div style={{ textAlign: 'center', color: C.muted, fontSize: 11, fontFamily: 'var(--font-inter), sans-serif', padding: '8px 0 calc(8px + env(safe-area-inset-bottom, 0px))', background: C.bg }}>
          © 2026 Gizku · dev.wiryawan@gmail.com
        </div>
      </div>

      {/* ── USER MENU OVERLAY ── */}
      {showUserMenu && (
        <div onClick={() => { setShowUserMenu(false); setShowEmailForm(false); setEmailError(''); setEmailInput('') }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))', boxShadow: '0 -4px 24px rgba(0,0,0,.08)' }}>
            <div style={{ width: 36, height: 4, background: '#E5E7EB', borderRadius: 4, margin: '0 auto 20px' }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 2, fontFamily: 'var(--font-montserrat), sans-serif' }}>@{user.username}</div>

            <div style={{ marginBottom: 20 }}>
              {userEmail ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', color: C.muted }}>{IconMail}</span>
                    {userEmail}
                  </span>
                  <button onClick={() => { setShowEmailForm(f => !f); setEmailInput(userEmail ?? ''); setEmailError('') }} style={{ fontSize: 12, color: C.green, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>Ubah</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.orangeDim, border: `1px solid rgba(245,158,11,.25)`, borderRadius: 10, padding: '8px 12px' }}>
                  <span style={{ color: '#92400E', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', color: '#92400E' }}>{IconMail}</span>
                    Tambah Email
                  </span>
                  <button onClick={() => { setShowEmailForm(f => !f); setEmailInput(''); setEmailError('') }} style={{ fontSize: 12, color: C.orange, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>+ Tambah</button>
                </div>
              )}
              {showEmailForm && (
                <div style={{ marginTop: 10 }}>
                  {emailError && (
                    <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '7px 11px', color: C.red, fontSize: 12, marginBottom: 8 }}>{emailError}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="email" value={emailInput} onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                      placeholder="email@contoh.com"
                      style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', fontFamily: 'var(--font-inter), sans-serif' }}
                    />
                    <button onClick={saveEmail} disabled={emailSaving} style={{ padding: '10px 16px', background: C.green, color: '#fff', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 13, cursor: emailSaving ? 'not-allowed' : 'pointer', opacity: emailSaving ? 0.6 : 1, fontFamily: 'var(--font-inter), sans-serif' }}>
                      {emailSaving ? '...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {emailSuccess && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '8px 12px', color: '#15803D', fontSize: 13, fontWeight: 500, marginBottom: 12 }}>✅ Email berhasil disimpan</div>
            )}

            {/* ── Settings link ── */}
            <Link
              href="/main/settings"
              onClick={() => setShowUserMenu(false)}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 13, marginBottom: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
            >
              <span style={{ color: C.muted, display: 'flex', alignItems: 'center' }}>{IconSettings}</span>
              Pengaturan & Koneksi
            </Link>

            {/* ── Ubah Password button ── */}
            <button
              onClick={openChangePassword}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 13, marginBottom: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{ color: C.muted, display: 'flex', alignItems: 'center' }}>{IconLock}</span>
              Ubah Password
            </button>

            <button
              onClick={() => { setShowUserMenu(false); setShowEmailForm(false); setShowReport(true); setReportDone(false); setReportError('') }}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 13, marginBottom: 8, background: '#F9FAFB', border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{ color: C.muted, display: 'flex', alignItems: 'center' }}>{IconReport}</span>
              Kirim Laporan / Masukan
            </button>

            <button
              onClick={logout}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 13, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: C.red, fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{IconLogout}</span>
              Keluar
            </button>
          </div>
        </div>
      )}

      {/* ── REPORT OVERLAY ── */}
      {showReport && (
        <div onClick={() => setShowReport(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px calc(24px + env(safe-area-inset-bottom, 0px))', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text, fontFamily: 'var(--font-montserrat), sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.muted, display: 'flex', alignItems: 'center' }}>{IconReport}</span>
                Kirim Laporan
              </div>
              <button onClick={() => setShowReport(false)} style={{ background: '#F9FAFB', border: `1px solid ${C.border}`, borderRadius: 9, padding: '6px 12px', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✕ Tutup</button>
            </div>
            {reportDone ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8, fontFamily: 'var(--font-montserrat), sans-serif' }}>Laporan Terkirim!</div>
                <div style={{ color: C.muted, fontSize: 13 }}>Terima kasih atas masukan kamu.</div>
                <button onClick={() => setShowReport(false)} style={{ marginTop: 20, padding: '10px 24px', background: C.green, color: '#fff', borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Tutup</button>
              </div>
            ) : (
              <>
                {reportError && (
                  <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '8px 12px', color: C.red, fontSize: 13, marginBottom: 12 }}>{reportError}</div>
                )}
                <textarea
                  value={reportMsg}
                  onChange={e => setReportMsg(e.target.value)}
                  placeholder="Ceritakan masalah atau saranmu di sini…"
                  rows={5}
                  style={{ width: '100%', background: '#F9FAFB', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', color: C.text, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'var(--font-inter), sans-serif', lineHeight: 1.6 }}
                />
                <button
                  onClick={submitReport}
                  disabled={reportSending || !reportMsg.trim()}
                  style={{ width: '100%', marginTop: 10, padding: '13px', background: C.green, color: '#fff', borderRadius: 13, border: 'none', fontWeight: 700, fontSize: 14, cursor: reportSending ? 'not-allowed' : 'pointer', opacity: (reportSending || !reportMsg.trim()) ? 0.6 : 1 }}
                >
                  {reportSending ? 'Mengirim…' : 'Kirim Laporan'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── UBAH PASSWORD OVERLAY ── */}
      {showChangePassword && (
        <div
          onClick={() => { if (!cpLoading && !cpSuccess) setShowChangePassword(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px calc(28px + env(safe-area-inset-bottom, 0px))', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,.10)' }}>
            <div style={{ width: 36, height: 4, background: '#E5E7EB', borderRadius: 4, margin: '0 auto 20px' }} />

            {cpSuccess ? (
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🔐</div>
                <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 8, fontFamily: 'var(--font-montserrat), sans-serif' }}>Password Berhasil Diubah!</div>
                <div style={{ color: C.muted, fontSize: 14 }}>Kamu akan diarahkan ke halaman login…</div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4, fontFamily: 'var(--font-montserrat), sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: C.muted, display: 'flex', alignItems: 'center' }}>{IconLock}</span>
                  Ubah Password
                </div>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Masukkan username untuk konfirmasi, lalu password baru kamu.</div>

                {cpError && (
                  <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '9px 13px', color: C.red, fontSize: 13, fontWeight: 500, marginBottom: 14 }}>{cpError}</div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Username</label>
                  <input
                    type="text" value={cpUsername} onChange={e => { setCpUsername(e.target.value); setCpError('') }}
                    placeholder={`Ketik "${user.username}" untuk konfirmasi`}
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    style={{ ...inputBase, paddingRight: 13 }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Password Baru</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={cpShowNew ? 'text' : 'password'} value={cpNew} onChange={e => { setCpNew(e.target.value); setCpError('') }}
                      placeholder="Minimal 6 karakter"
                      style={inputBase}
                    />
                    <button onClick={() => setCpShowNew(v => !v)} type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }}>
                      <EyeIcon open={cpShowNew} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Konfirmasi Password Baru</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={cpShowConfirm ? 'text' : 'password'} value={cpConfirm} onChange={e => { setCpConfirm(e.target.value); setCpError('') }}
                      placeholder="Ulangi password baru"
                      style={inputBase}
                    />
                    <button onClick={() => setCpShowConfirm(v => !v)} type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }}>
                      <EyeIcon open={cpShowConfirm} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={submitChangePassword}
                  disabled={cpLoading}
                  style={{ width: '100%', padding: '13px', background: C.green, color: '#fff', borderRadius: 13, border: 'none', fontWeight: 700, fontSize: 14, cursor: cpLoading ? 'not-allowed' : 'pointer', opacity: cpLoading ? 0.65 : 1 }}
                >
                  {cpLoading ? 'Menyimpan…' : 'Simpan Password Baru'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
