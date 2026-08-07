'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ScreenHeader from '@/components/ui/ScreenHeader'
import TextField from '@/components/ui/TextField'
import Button from '@/components/ui/Button'
import { IconMail, IconCheck, IconClock } from '@/components/ui/icons'
import { useTranslation } from '@/lib/i18n/LanguageContext'

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') ?? ''}` }
}

export default function ChangeEmailPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [currentEmail, setCurrentEmail] = useState('')
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null)
  const [next, setNext] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')

  function loadProfile() {
    return fetch('/api/user?action=profile', { headers: authHeaders(), cache: 'no-store' })
      .then(res => {
        if (res.status === 401) { router.replace('/login'); return null }
        return res.json()
      })
      .then(data => {
        if (data?.user?.email) setCurrentEmail(data.user.email)
        if (data?.user) setEmailVerified(Boolean(data.user.emailVerified))
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function resendVerification() {
    setResending(true)
    try {
      const res = await fetch('/api/user?action=resend_verification', {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.status === 401) { router.replace('/login'); return }
      if (res.status === 409) { toast.error(t('changeEmail.resendAlreadyVerified')); await loadProfile(); return }
      if (res.status === 429) { toast.error(t('changeEmail.resendRateLimited')); return }
      if (!res.ok) { toast.error(data.error || t('changeEmail.resendFailed')); return }

      toast.success(t('changeEmail.resendSuccess'))
    } catch {
      toast.error(t('common.connectFailed'))
    } finally {
      setResending(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = next.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmed) { setError(t('changeEmail.errors.emailRequired')); return }
    if (!emailRegex.test(trimmed)) { setError(t('changeEmail.errors.emailInvalid')); return }

    setLoading(true)
    try {
      const res = await fetch('/api/user?action=update_email', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()
      if (res.status === 401) { router.replace('/login'); return }
      if (!res.ok) { setError(data.error || t('changeEmail.errors.updateFailed')); return }

      toast.success(t('changeEmail.updateSuccess'))
      setCurrentEmail(trimmed)
      setEmailVerified(false)
      setNext('')
    } catch {
      setError(t('common.connectFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title={t('changeEmail.title')} onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-5 pb-10">
        <div className="mb-3.5">
          <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-1.5">{t('changeEmail.currentEmailLabel')}</div>
          <div className="h-11 rounded-lg bg-muted flex items-center gap-2.5 px-3.5 box-border">
            <IconMail size={14} color="var(--color-text-tertiary)" />
            <span className="flex-1 text-base text-secondary">{currentEmail || '—'}</span>
          </div>

          {emailVerified === true && (
            <div className="flex items-center gap-1.5 mt-2 px-0.5">
              <IconCheck size={13} color="var(--color-text-brand)" />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-brand)' }}>
                {t('changeEmail.verifiedBadge')}
              </span>
            </div>
          )}

          {emailVerified === false && (
            <div className="flex items-center justify-between gap-3 mt-2 px-0.5">
              <div className="flex items-center gap-1.5">
                <IconClock size={13} color="var(--color-warning)" />
                <span className="text-xs font-medium" style={{ color: 'var(--color-warning)' }}>
                  {t('changeEmail.unverifiedBadge')}
                </span>
              </div>
              <button
                type="button"
                onClick={resendVerification}
                disabled={resending}
                className="text-xs font-semibold text-link disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {resending ? t('changeEmail.resendSending') : t('changeEmail.resendButton')}
              </button>
            </div>
          )}
        </div>

        <form onSubmit={submit}>
          <TextField
            label={t('changeEmail.newEmailLabel')}
            leadingIcon={<IconMail size={14} color="var(--color-text-tertiary)" />}
            type="email"
            value={next}
            onChange={e => { setNext(e.target.value); setError('') }}
            placeholder={t('changeEmail.emailPlaceholder')}
            errorText={error}
          />

          <div className="mt-2">
            <Button type="submit" loading={loading}>{t('changeEmail.saveChanges')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
