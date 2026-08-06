'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Chip from '@/components/ui/Chip'
import Button from '@/components/ui/Button'
import { IconMail } from '@/components/ui/icons'
import { useTranslation } from '@/lib/i18n/LanguageContext'

type Category = 'bug' | 'saran' | 'lainnya'

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') ?? ''}` }
}

export default function FeedbackPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [category, setCategory] = useState<Category>('bug')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const CATEGORY_LABEL: Record<Category, string> = {
    bug: t('feedback.categoryBug'),
    saran: t('feedback.categorySaran'),
    lainnya: t('feedback.categoryLainnya'),
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (message.trim().length < 10) { setError(t('feedback.errors.messageMinLength')); return }

    setLoading(true)
    try {
      const parts = [`[${CATEGORY_LABEL[category]}] ${message.trim()}`]
      if (contact.trim()) parts.push(`Kontak: ${contact.trim()}`)

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: parts.join('\n\n') }),
      })
      const data = await res.json()
      if (res.status === 401) { router.replace('/login'); return }
      if (!res.ok) { setError(data.error || t('feedback.errors.sendFailed')); return }

      toast.success(t('feedback.submitSuccess'))
      setMessage('')
      setContact('')
      router.push('/main/settings')
    } catch {
      setError(t('common.connectFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title={t('feedback.title')} onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-5 pb-10">
        <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2">{t('feedback.categoryLabel')}</div>
        <div className="flex gap-2 mb-[18px] flex-wrap">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map(c => (
            <Chip key={c} label={CATEGORY_LABEL[c]} selected={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2">{t('feedback.messageLabel')}</div>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setError('') }}
            placeholder={t('feedback.messagePlaceholder')}
            className="w-full box-border rounded-lg bg-sunken shadow-hairline border-none outline-none px-3.5 py-3 text-base text-primary resize-none mb-1.5"
            style={{ minHeight: 120 }}
          />
          {error ? <div className="text-xs text-danger mb-3.5">{error}</div> : <div className="mb-3.5" />}

          <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-1.5">{t('feedback.emailOptionalLabel')}</div>
          <div className="h-11 rounded-lg bg-sunken flex items-center gap-2.5 px-3.5 box-border mb-[22px]">
            <IconMail size={14} color="var(--color-text-tertiary)" />
            <input
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder={t('feedback.emailOptionalPlaceholder')}
              className="flex-1 bg-transparent border-none outline-none text-base text-primary placeholder:text-tertiary"
            />
          </div>

          <Button type="submit" loading={loading}>{t('feedback.submit')}</Button>
        </form>
      </div>
    </div>
  )
}
