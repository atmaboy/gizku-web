'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ForceChangePasswordPage() {
  const router = useRouter()

  const [username, setUsername]         = useState('')
  const [newPassword, setNewPassword]   = useState('')
  const [confirmPass, setConfirmPass]   = useState('')
  const [showNew, setShowNew]           = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)
  const [storedUsername, setStoredUsername] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('nl_token')
    const userStr = localStorage.getItem('nl_user')
    if (!token || !userStr) { router.replace('/login'); return }
    try {
      const u = JSON.parse(userStr)
      // Cek flag mustChangePassword di localStorage (disimpan saat login)
      const mustChange = localStorage.getItem('nl_must_change_password')
      if (mustChange !== 'true') {
        router.replace('/main/catat')
        return
      }
      setStoredUsername(u.username ?? '')
    } catch {
      router.replace('/login')
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimUser = username.trim().toLowerCase()
    const trimPass = newPassword.trim()
    const trimConf = confirmPass.trim()

    if (!trimUser) { setError('Masukkan username kamu untuk konfirmasi'); return }
    if (trimUser !== storedUsername.toLowerCase()) { setError('Username tidak cocok dengan akun yang sedang login'); return }
    if (trimPass.length < 6) { setError('Password baru minimal 6 karakter'); return }
    if (trimPass !== trimConf) { setError('Konfirmasi password tidak cocok'); return }

    setLoading(true)
    try {
      const token = localStorage.getItem('nl_token') || ''
      const res = await fetch('/api/auth?action=change_password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: trimUser, newPassword: trimPass }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal mengubah password. Coba lagi.'); return }

      setSuccess(true)
      // Hapus flag & token → paksa login ulang
      localStorage.removeItem('nl_must_change_password')
      localStorage.removeItem('nl_token')
      localStorage.removeItem('nl_user')
      setTimeout(() => router.replace('/login'), 2200)
    } catch {
      setError('Tidak dapat terhubung ke server. Periksa koneksi internet kamu.')
    } finally {
      setLoading(false)
    }
  }

  // ── Design tokens (konsisten dengan AppLayout) ──
  const C = {
    bg: '#F9FAFB', white: '#FFFFFF', border: '#E5E7EB',
    text: '#111827', muted: '#6B7280', green: '#2ECC71',
    greenDim: '#D4F5E4', red: '#EF4444', orange: '#F59E0B',
    orangeDim: '#FEF3C7', greenDeep: '#15803D',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: C.bg,
    border: `1.5px solid ${C.border}`,
    borderRadius: 12,
    padding: '13px 44px 13px 14px',
    color: C.text,
    fontSize: 15,
    outline: 'none',
    fontFamily: 'var(--font-inter), sans-serif',
    transition: 'border-color .15s',
  }

  const EyeIcon = ({ open }: { open: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </>
      )}
    </svg>
  )

  const LockIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
      stroke={C.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      <circle cx="12" cy="16" r="1" fill={C.orange}/>
    </svg>
  )

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-inter), sans-serif', background: C.bg,
      padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
    }}>
      {/* ── Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#2ECC71"/>
          <path d="M8 16 Q8 23 16 23 Q24 23 24 16" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <line x1="8" y1="16" x2="24" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <polyline points="12,11 15,14.5 20.5,9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <div>
          <div style={{ fontFamily: 'var(--font-montserrat), sans-serif', fontWeight: 600, fontSize: 20, color: C.text, lineHeight: 1.2 }}>Gizku</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.2 }}>AI Nutrition Companion</div>
        </div>
      </div>

      {/* ── Card ── */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: C.white, borderRadius: 20,
        border: `1px solid ${C.border}`,
        padding: '28px 24px',
        boxShadow: '0 4px 24px rgba(0,0,0,.06)',
      }}>
        {success ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
            <div style={{
              fontFamily: 'var(--font-montserrat), sans-serif',
              fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 8,
            }}>
              Password Berhasil Diubah!
            </div>
            <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Kamu akan diarahkan ke halaman login dalam beberapa detik.
              Silakan login menggunakan password baru kamu.
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: C.muted, fontSize: 12,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Mengalihkan ke halaman login…
            </div>
          </div>
        ) : (
          <>
            {/* ── Warning banner ── */}
            <div style={{
              background: C.orangeDim, border: `1px solid rgba(245,158,11,.3)`,
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              marginBottom: 24,
            }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <LockIcon />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 4, fontFamily: 'var(--font-montserrat), sans-serif' }}>
                  Password Direset oleh Admin
                </div>
                <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6 }}>
                  Demi keamanan akun kamu, kamu diwajibkan mengganti password sebelum dapat menggunakan aplikasi.
                </div>
              </div>
            </div>

            <div style={{
              fontFamily: 'var(--font-montserrat), sans-serif',
              fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 4,
            }}>
              Buat Password Baru
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
              Masukkan username kamu sebagai konfirmasi, lalu tentukan password baru.
            </div>

            {/* ── Error alert ── */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
                borderRadius: 10, padding: '10px 13px', color: C.red,
                fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Username konfirmasi */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder="Masukkan username kamu"
                  autoComplete="username"
                  required
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  Konfirmasi bahwa ini adalah akun kamu
                </div>
              </div>

              {/* Password baru */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                  Password Baru
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError('') }}
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                    required
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', padding: 0 }}
                    aria-label={showNew ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    <EyeIcon open={showNew} />
                  </button>
                </div>
              </div>

              {/* Konfirmasi password */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                  Konfirmasi Password Baru
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPass}
                    onChange={e => { setConfirmPass(e.target.value); setError('') }}
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                    required
                    style={{
                      ...inputStyle,
                      borderColor: confirmPass && confirmPass !== newPassword ? C.red : C.border,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', padding: 0 }}
                    aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {confirmPass && confirmPass !== newPassword && (
                  <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Password tidak cocok</div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !newPassword || !confirmPass}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading || !username || !newPassword || !confirmPass ? '#9CA3AF' : C.green,
                  color: '#fff',
                  borderRadius: 13, border: 'none',
                  fontWeight: 700, fontSize: 15,
                  cursor: loading || !username || !newPassword || !confirmPass ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-montserrat), sans-serif',
                  transition: 'background .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 4,
                }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Menyimpan…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Simpan Password Baru
                  </>
                )}
              </button>
            </form>

            {/* Info keamanan */}
            <div style={{
              marginTop: 20, padding: '10px 13px',
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 12, color: C.greenDeep, lineHeight: 1.6 }}>
                🔒 Setelah berhasil, kamu akan otomatis logout dan diarahkan untuk login kembali dengan password baru.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginTop: 24, color: C.muted, fontSize: 11, textAlign: 'center' }}>
        © 2026 Gizku · dev.wiryawan@gmail.com
      </div>
    </div>
  )
}
