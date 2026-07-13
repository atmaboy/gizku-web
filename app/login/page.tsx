'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BrandAnnouncement from '@/components/BrandAnnouncement'
import GizkuLogo from '@/components/GizkuLogo'
import Button from '@/components/ui/Button'
import TextField from '@/components/ui/TextField'
import { IconArrowLeft, IconLock, IconPerson, IconMail } from '@/components/ui/icons'

type MaintenanceInfo = { title: string; description: string } | null
type PageTab = 'login' | 'register' | 'reset'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<PageTab>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [maintenance, setMaintenance] = useState<MaintenanceInfo>(null)

  useEffect(() => {
    const token = localStorage.getItem('nl_token')
    if (token) { router.replace('/main/riwayat'); return }
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

      // Simpan flag nl_must_change_password ke localStorage SEBELUM redirect
      // agar force-change-password/page.tsx bisa membacanya dengan benar
      if (data.user?.mustChangePassword) {
        localStorage.setItem('nl_must_change_password', 'true')
        router.replace('/main/force-change-password')
        return
      }

      // Pastikan flag dibersihkan jika user normal login (tidak perlu ganti password)
      localStorage.removeItem('nl_must_change_password')
      router.replace('/main/riwayat')
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
      setTimeout(() => switchTab('login'), 2000)
    } catch {
      setError('Tidak dapat terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  const ErrorBanner = error ? (
    <div className="rounded-md px-3.5 py-2.5 text-sm mb-3.5" style={{ background: 'rgba(194,91,88,0.08)', border: '1px solid rgba(194,91,88,0.25)', color: 'var(--color-danger)' }}>
      {error}
    </div>
  ) : null

  // ── Render: Reset Password View ───────────────────────────────────
  if (tab === 'reset') {
    return (
      <div className="min-h-dvh bg-page flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-[380px]">
          <div
            onClick={() => switchTab('login')}
            className="w-full flex items-center gap-1.5 mb-[22px] cursor-pointer text-secondary text-sm font-medium"
          >
            <IconArrowLeft size={16} />
            Kembali ke Login
          </div>

          <div className="w-full bg-surface rounded-2xl p-6 box-border" style={{ boxShadow: 'var(--shadow-hairline), var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-1">
              <IconLock size={18} color="var(--color-text-brand)" strokeWidth={1.8} />
              <div className="text-xl font-semibold text-primary">Reset Password</div>
            </div>
            <div className="text-sm text-secondary leading-normal mb-[22px]">Masukkan username dan password baru kamu</div>

            {successMsg && (
              <div className="rounded-md px-3.5 py-2.5 text-sm mb-3.5 text-center" style={{ background: 'var(--color-bg-brand-tint)', color: 'var(--color-text-brand)' }}>
                {successMsg}
              </div>
            )}
            {ErrorBanner}

            <form onSubmit={handleReset}>
              <TextField
                label="Username"
                leadingIcon={<IconPerson size={18} color="var(--color-text-tertiary)" />}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username kamu"
                required
                autoFocus
              />
              <TextField
                label="Password Baru"
                isPassword
                leadingIcon={<IconLock size={18} color="var(--color-text-tertiary)" strokeWidth={1.8} />}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
              />
              <div>
                <TextField
                  label="Konfirmasi Password Baru"
                  isPassword
                  leadingIcon={<IconLock size={18} color="var(--color-text-tertiary)" strokeWidth={1.8} />}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  required
                  errorText={confirmPassword && confirmPassword !== newPassword ? 'Password tidak cocok' : undefined}
                />
              </div>

              <div className="mt-1">
                <Button type="submit" loading={loading}>Reset Password</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Login & Register View ────────────────────────────────
  return (
    <div className="min-h-dvh bg-page flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center gap-1.5 mb-7">
          <GizkuLogo size={52} />
          <div className="text-xl font-semibold text-primary tracking-tight">Gizku</div>
        </div>

        <BrandAnnouncement />

        {maintenance && (
          <div className="rounded-lg px-[18px] py-4 mb-[18px] text-center" style={{ background: 'rgba(217,155,63,0.08)', border: '1px solid rgba(217,155,63,0.3)' }}>
            <div className="font-semibold text-sm mb-1.5" style={{ color: 'var(--color-warning)' }}>{maintenance.title}</div>
            <div className="text-secondary text-sm leading-normal">{maintenance.description}</div>
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg px-[18px] py-3.5 mb-[18px] text-center text-sm" style={{ background: 'var(--color-bg-brand-tint)', color: 'var(--color-text-brand)' }}>
            {successMsg}
          </div>
        )}

        <div className="w-full bg-surface rounded-2xl p-6 box-border" style={{ boxShadow: 'var(--shadow-hairline), var(--shadow-sm)' }}>
          {tab === 'login' ? (
            <>
              <div className="text-xl font-semibold text-primary mb-1">Selamat datang kembali</div>
              <div className="text-sm text-secondary leading-normal mb-[22px]">Masuk untuk lanjutkan pelacakan nutrisimu</div>
            </>
          ) : (
            <>
              <div className="text-xl font-semibold text-primary mb-1">Buat akun baru</div>
              <div className="text-sm text-secondary leading-normal mb-[22px]">Mulai pantau nutrisimu bersama Gizku</div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            {ErrorBanner}

            <TextField
              label="Username"
              leadingIcon={<IconPerson size={18} color="var(--color-text-tertiary)" />}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
              autoFocus
            />

            <TextField
              label="Password"
              isPassword
              leadingIcon={<IconLock size={18} color="var(--color-text-tertiary)" strokeWidth={1.8} />}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />

            {tab === 'login' && (
              <div className="flex justify-end -mt-2 mb-[18px]">
                <span onClick={() => switchTab('reset')} className="text-xs font-medium text-link cursor-pointer">
                  Lupa password?
                </span>
              </div>
            )}

            {tab === 'register' && (
              <TextField
                label="Email"
                leadingIcon={<IconMail size={16} color="var(--color-text-tertiary)" />}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contoh@email.com"
                required
              />
            )}

            <Button type="submit" loading={loading}>
              {tab === 'login' ? 'Masuk' : 'Daftar'}
            </Button>
          </form>

          <div className="flex justify-center gap-1.5 mt-[18px] text-xs">
            <span className="text-secondary">{tab === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}</span>
            <span onClick={() => switchTab(tab === 'login' ? 'register' : 'login')} className="text-link font-semibold cursor-pointer">
              {tab === 'login' ? 'Daftar sekarang' : 'Masuk'}
            </span>
          </div>
        </div>

        {tab === 'login' && (
          <div className="text-center text-2xs text-tertiary mt-5">© 2026 gizku.com</div>
        )}
      </div>
    </div>
  )
}
