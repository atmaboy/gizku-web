'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { fetchLegalContent, type LegalDocument } from '@/lib/legalContent'
import { IconCheck } from '@/components/ui/icons'

/**
 * Register-only consent gate: "Dengan ini saya setuju terhadap Syarat &
 * Ketentuan serta Kebijakan Privasi aplikasi" with each document name as a
 * hyperlink into its public /legal/[slug] page. Adapts to whichever of the
 * two builtin document types (terms/privacy) actually has content
 * configured in the backoffice — hidden entirely if neither does, in which
 * case `onAvailabilityChange(false)` tells the caller not to gate
 * submission on `checked`.
 */
export default function LegalConsentCheckbox({
  checked,
  onChange,
  onAvailabilityChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  onAvailabilityChange?: (hasContent: boolean) => void
}) {
  const { language, t } = useTranslation()
  const [termsDoc, setTermsDoc] = useState<LegalDocument | null>(null)
  const [privacyDoc, setPrivacyDoc] = useState<LegalDocument | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLegalContent()
      .then(data => {
        if (cancelled) return
        const terms = data.documents.find(d => d.typeKey === 'terms' && (d.langs.id.title || d.langs.en.title)) ?? null
        const privacy = data.documents.find(d => d.typeKey === 'privacy' && (d.langs.id.title || d.langs.en.title)) ?? null
        setTermsDoc(terms)
        setPrivacyDoc(privacy)
        onAvailabilityChange?.(!!(terms || privacy))
      })
      .catch(() => onAvailabilityChange?.(false))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!termsDoc && !privacyDoc) return null

  const templateKey = termsDoc && privacyDoc ? 'legalConsent.both' : termsDoc ? 'legalConsent.termsOnly' : 'legalConsent.privacyOnly'
  const template = t(templateKey) // no params passed — {{terms}}/{{privacy}} tokens stay literal for splitting below
  const parts = template.split(/(\{\{terms\}\}|\{\{privacy\}\})/g)

  return (
    <div className="flex items-start gap-2.5 mb-[18px]">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="mt-0.5 w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 cursor-pointer"
        style={{
          border: `1.5px solid ${checked ? 'var(--color-border-brand)' : 'var(--color-border-default)'}`,
          background: checked ? 'var(--color-bg-brand)' : 'transparent',
        }}
      >
        {checked && <IconCheck size={11} color="#fff" strokeWidth={3} />}
      </button>
      <p className="text-xs text-secondary leading-normal cursor-pointer" onClick={() => onChange(!checked)}>
        {parts.map((part, i) => {
          if (part === '{{terms}}' && termsDoc) {
            const title = termsDoc.langs[language]?.title || termsDoc.langs.id.title
            return (
              <Link key={i} href={`/legal/${termsDoc.slug}`} onClick={e => e.stopPropagation()} className="text-link font-medium">
                {title}
              </Link>
            )
          }
          if (part === '{{privacy}}' && privacyDoc) {
            const title = privacyDoc.langs[language]?.title || privacyDoc.langs.id.title
            return (
              <Link key={i} href={`/legal/${privacyDoc.slug}`} onClick={e => e.stopPropagation()} className="text-link font-medium">
                {title}
              </Link>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </p>
    </div>
  )
}
