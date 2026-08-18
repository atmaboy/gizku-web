'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BrandAnnouncement from '@/components/BrandAnnouncement'
import GizkuLogo from '@/components/GizkuLogo'
import LegalConsentCheckbox from '@/components/LegalConsentCheckbox'
import BetaOptinToggle from '@/components/BetaOptinToggle'
import Button from '@/components/ui/Button'
import TextField from '@/components/ui/TextField'
import { IconArrowLeft, IconLock, IconPerson, IconMail } from '@/components/ui/icons'
import { useTranslation } from '@/lib/i18n/LanguageContext'

type MaintenanceInfo = { title: string; description: string } | null
type PageTab = 'login' | 'register' | 'reset'

export default function LoginPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useTranslation()
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
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [consentRequired, setConsentRequired] = useState(false)
  const [betaOptin, setBetaOptin] = useState(false)

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
    setAgreedToTerms(false)
    setBetaOptin(false)
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
        if (!trimmedEmail) { setError(t('login.errors.emailRequired')); setLoading(false); return }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedEmail)) { setError(t('login.errors.emailInvalid')); setLoading(false); return }
        if (consentRequired && !agreedToTerms) { setError(t('legalConsent.mustAgree')); setLoading(false); return }
      }

      const endpoint = tab === 'login' ? '/api/auth?action=login' : '/api/auth?action=register'
      const body: Record<string, string | boolean> = { username: username.trim().toLowerCase(), password }
      if (tab === 'register') {
        body.email = email.trim().toLowerCase()
        body.betaOptin = betaOptin
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.maintenance) {
        setMaintenance({
          title: data.maintenance.title || t('login.maintenanceDefaultTitle'),
          description: data.maintenance.description || t('login.maintenanceDefaultDescription'),
        })
        return
      }

      if (!res.ok) { setError(data.error || t('login.errors.genericError')); return }

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
      setError(t('common.connectFailed'))
    } finally {
      setLoading(false)
    }
  }

  // ── Handler: Reset Password (user belum login) ────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!username.trim()) { setError(t('login.errors.usernameRequired')); return }
    if (!newPassword) { setError(t('login.errors.newPasswordRequired')); return }
    if (newPassword.length < 6) { setError(t('login.errors.passwordMin')); return }
    if (newPassword !== confirmPassword) { setError(t('login.errors.confirmMismatch')); return }

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
      if (!res.ok) { setError(data.error || t('login.errors.resetFailed')); return }

      setSuccessMsg(t('login.resetSuccess'))
      setUsername('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => switchTab('login'), 2000)
    } catch {
      setError(t('common.connectFailed'))
    } finally {
      setLoading(false)
    }
  }

  const ErrorBanner = error ? (
    <div className="rounded-md px-3.5 py-2.5 text-sm mb-3.5" style={{ background: 'rgba(194,91,88,0.08)', border: '1px solid rgba(194,91,88,0.25)', color: 'var(--color-danger)' }}>
      {error}
    </div>
  ) : null

  const LangSwitch = (
    <div className="w-full flex justify-end gap-1.5 mb-3">
      <button
        type="button"
        onClick={() => setLanguage('id')}
        className="h-[30px] px-3 rounded-pill text-xs font-semibold cursor-pointer"
        style={{
          background: language === 'id' ? 'var(--color-bg-brand-tint)' : 'var(--color-bg-sunken)',
          color: language === 'id' ? 'var(--color-text-brand)' : 'var(--color-text-secondary)',
          border: `1px solid ${language === 'id' ? 'var(--color-border-brand)' : 'var(--color-border-default)'}`,
        }}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className="h-[30px] px-3 rounded-pill text-xs font-semibold cursor-pointer"
        style={{
          background: language === 'en' ? 'var(--color-bg-brand-tint)' : 'var(--color-bg-sunken)',
          color: language === 'en' ? 'var(--color-text-brand)' : 'var(--color-text-secondary)',
          border: `1px solid ${language === 'en' ? 'var(--color-border-brand)' : 'var(--color-border-default)'}`,
        }}
      >
        EN
      </button>
    </div>
  )

  // ── Render: Reset Password View ───────────────────────────────────
  if (tab === 'reset') {
    return (
      <div className="min-h-dvh bg-page flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-[380px]">
          {LangSwitch}

          <div
            onClick={() => switchTab('login')}
            className="w-full flex items-center gap-1.5 mb-[22px] cursor-pointer text-secondary text-sm font-medium"
          >
            <IconArrowLeft size={16} />
            {t('login.backToLogin')}
          </div>

          <div className="w-full bg-surface rounded-2xl p-6 box-border" style={{ boxShadow: 'var(--shadow-hairline), var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-1">
              <IconLock size={18} color="var(--color-text-brand)" strokeWidth={1.8} />
              <div className="text-xl font-semibold text-primary">{t('login.resetTitle')}</div>
            </div>
            <div className="text-sm text-secondary leading-normal mb-[22px]">{t('login.resetSubtitle')}</div>

            {successMsg && (
              <div className="rounded-md px-3.5 py-2.5 text-sm mb-3.5 text-center" style={{ background: 'var(--color-bg-brand-tint)', color: 'var(--color-text-brand)' }}>
                {successMsg}
              </div>
            )}
            {ErrorBanner}

            <form onSubmit={handleReset}>
              <TextField
                label={t('login.usernameLabel')}
                leadingIcon={<IconPerson size={18} color="var(--color-text-tertiary)" />}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t('login.usernameConfirmPlaceholder')}
                required
                autoFocus
              />
              <TextField
                label={t('login.newPasswordLabel')}
                isPassword
                leadingIcon={<IconLock size={18} color="var(--color-text-tertiary)" strokeWidth={1.8} />}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t('login.newPasswordPlaceholder')}
                required
              />
              <div>
                <TextField
                  label={t('login.confirmPasswordLabel')}
                  isPassword
                  leadingIcon={<IconLock size={18} color="var(--color-text-tertiary)" strokeWidth={1.8} />}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('login.confirmPasswordPlaceholder')}
                  required
                  errorText={confirmPassword && confirmPassword !== newPassword ? t('login.confirmMismatch') : undefined}
                />
              </div>

              <div className="mt-1">
                <Button type="submit" loading={loading}>{t('login.resetSubmit')}</Button>
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
        {LangSwitch}

        <div className="flex flex-col items-center gap-1.5 mb-7">
          <GizkuLogo size={52} />
          <div className="text-xl font-semibold text-primary tracking-tight">{t('common.appName')}</div>
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
              <div className="text-xl font-semibold text-primary mb-1">{t('login.welcomeTitle')}</div>
              <div className="text-sm text-secondary leading-normal mb-[22px]">{t('login.welcomeSubtitle')}</div>
            </>
          ) : (
            <>
              <div className="text-xl font-semibold text-primary mb-1">{t('login.registerTitle')}</div>
              <div className="text-sm text-secondary leading-normal mb-[22px]">{t('login.registerSubtitle')}</div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            {ErrorBanner}

            <TextField
              label={t('login.usernameLabel')}
              leadingIcon={<IconPerson size={18} color="var(--color-text-tertiary)" />}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t('login.usernamePlaceholder')}
              required
              autoFocus
            />

            <TextField
              label={t('login.passwordLabel')}
              isPassword
              leadingIcon={<IconLock size={18} color="var(--color-text-tertiary)" strokeWidth={1.8} />}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              required
            />

            {tab === 'login' && (
              <div className="flex justify-end -mt-2 mb-[18px]">
                <span onClick={() => switchTab('reset')} className="text-xs font-medium text-link cursor-pointer">
                  {t('login.forgotPassword')}
                </span>
              </div>
            )}

            {tab === 'register' && (
              <>
                <TextField
                  label={t('login.emailLabel')}
                  leadingIcon={<IconMail size={16} color="var(--color-text-tertiary)" />}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  required
                />
                <LegalConsentCheckbox
                  checked={agreedToTerms}
                  onChange={setAgreedToTerms}
                  onAvailabilityChange={setConsentRequired}
                />
                <BetaOptinToggle checked={betaOptin} onChange={setBetaOptin} />
              </>
            )}

            <Button type="submit" loading={loading} disabled={tab === 'register' && consentRequired && !agreedToTerms}>
              {tab === 'login' ? t('login.signIn') : t('login.register')}
            </Button>
          </form>

          <div className="flex justify-center gap-1.5 mt-[18px] text-xs">
            <span className="text-secondary">{tab === 'login' ? t('login.noAccount') : t('login.haveAccount')}</span>
            <span onClick={() => switchTab(tab === 'login' ? 'register' : 'login')} className="text-link font-semibold cursor-pointer">
              {tab === 'login' ? t('login.registerNow') : t('login.signInLink')}
            </span>
          </div>
        </div>

        {tab === 'login' && (
          <div className="text-center text-2xs text-tertiary mt-5">{t('common.footer')}</div>
        )}
      </div>
    </div>
  )
}
