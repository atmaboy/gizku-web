'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import Dialog from '@/components/ui/Dialog'

type BetaOptinLangContent = { title: string; points: string[]; callout: string }
type BetaOptinContent = {
  enabled: boolean
  id: BetaOptinLangContent
  en: BetaOptinLangContent
}

/**
 * Register-only opt-in row for the Gizku Android Closed Beta Tester program.
 * Fetches its feature flag + bilingual explainer content from the Backoffice
 * (/api/beta-optin) — hidden entirely when the admin has the feature off, so
 * the parent form never needs to know why.
 *
 * Turning the switch ON opens the explainer popup in confirm mode; `checked`
 * only flips true once the user taps "Setuju & Ikut Program" inside it.
 * Turning it OFF (from ON) flips immediately, no popup. "Lihat detail
 * program" reopens the same popup in read-only view mode without touching
 * `checked`.
 */
export default function BetaOptinToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const { language, t } = useTranslation()
  const [content, setContent] = useState<BetaOptinContent | null>(null)
  const [popupMode, setPopupMode] = useState<'confirm' | 'view' | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/beta-optin')
      .then(res => res.json())
      .then(data => { if (!cancelled) setContent(data) })
      .catch(() => { if (!cancelled) setContent(null) })
    return () => { cancelled = true }
  }, [])

  if (!content || !content.enabled) return null

  const c = content[language]
  if (!c.title) return null

  function handleToggle() {
    if (checked) { onChange(false); return }
    setPopupMode('confirm')
  }

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-sunken mb-[18px]" style={{ boxShadow: 'var(--shadow-hairline)' }}>
      <div className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: 'var(--color-bg-brand-tint)' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6,3 L15.1,12 L6,12 Z" fill="#12B7F5" />
          <path d="M6,12 L15.1,12 L6,21 Z" fill="#00E177" />
          <path d="M6,3 L19,12 L15.1,12 Z" fill="#FF4258" />
          <path d="M15.1,12 L19,12 L6,21 Z" fill="#FFD500" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-primary mb-0.5 truncate">{c.title}</div>
        <span onClick={() => setPopupMode('view')} className="inline-block text-xs font-semibold text-link cursor-pointer">
          {t('betaOptin.viewDetails')}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={c.title}
        onClick={handleToggle}
        className="w-11 h-6 rounded-pill p-0.5 box-border shrink-0 flex items-center transition-colors"
        style={{ background: checked ? 'var(--color-bg-brand)' : 'var(--color-border-default)', justifyContent: checked ? 'flex-end' : 'flex-start' }}
      >
        <span className="w-5 h-5 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
      </button>

      <Dialog
        open={popupMode !== null}
        onClose={() => setPopupMode(null)}
        title={c.title}
        description={t('betaOptin.popupIntro')}
        dismissOnBackdrop
        actions={
          popupMode === 'confirm'
            ? [{ label: t('betaOptin.popupConfirm'), onClick: () => { onChange(true); setPopupMode(null) } }]
            : [{ label: t('betaOptin.popupClose'), onClick: () => setPopupMode(null), variant: 'outline' }]
        }
      >
        <div className="flex flex-col gap-3 mb-4">
          {c.points.map((point, i) => (
            <div key={i} className="flex gap-2.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-px"
                style={{ background: 'var(--color-bg-brand)' }}
              >
                {i + 1}
              </span>
              <span className="text-[13px] text-primary leading-normal">{point}</span>
            </div>
          ))}
        </div>
        {c.callout ? (
          <div
            className="rounded-xl p-3 text-[12.5px] leading-normal mb-1"
            style={{ background: 'var(--color-bg-brand-tint)', border: '1px solid var(--green-200)', color: 'var(--color-text-brand)' }}
          >
            {c.callout}
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
