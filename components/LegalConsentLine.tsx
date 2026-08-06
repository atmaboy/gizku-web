'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { fetchLegalContent, type LegalDocument } from '@/lib/legalContent'

/**
 * "Dengan ini saya setuju terhadap Syarat & Ketentuan serta Kebijakan
 * Privasi aplikasi" — shown on the login/register form, with each document
 * name as a hyperlink into its public /legal/[slug] page. Adapts to
 * whichever of the two builtin document types (terms/privacy) actually has
 * content configured in the backoffice — hidden entirely if neither does.
 */
export default function LegalConsentLine() {
  const { language, t } = useTranslation()
  const [termsDoc, setTermsDoc] = useState<LegalDocument | null>(null)
  const [privacyDoc, setPrivacyDoc] = useState<LegalDocument | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLegalContent()
      .then(data => {
        if (cancelled) return
        setTermsDoc(data.documents.find(d => d.typeKey === 'terms' && (d.langs.id.title || d.langs.en.title)) ?? null)
        setPrivacyDoc(data.documents.find(d => d.typeKey === 'privacy' && (d.langs.id.title || d.langs.en.title)) ?? null)
      })
      .catch(() => {
        // fail-open — sembunyikan baris konsen jika gagal memuat
      })
    return () => { cancelled = true }
  }, [])

  if (!termsDoc && !privacyDoc) return null

  const templateKey = termsDoc && privacyDoc ? 'legalConsent.both' : termsDoc ? 'legalConsent.termsOnly' : 'legalConsent.privacyOnly'
  const template = t(templateKey) // no params passed — {{terms}}/{{privacy}} tokens stay literal for splitting below
  const parts = template.split(/(\{\{terms\}\}|\{\{privacy\}\})/g)

  return (
    <p className="text-2xs text-secondary text-center leading-normal mt-3.5">
      {parts.map((part, i) => {
        if (part === '{{terms}}' && termsDoc) {
          const title = termsDoc.langs[language]?.title || termsDoc.langs.id.title
          return <Link key={i} href={`/legal/${termsDoc.slug}`} className="text-link font-medium">{title}</Link>
        }
        if (part === '{{privacy}}' && privacyDoc) {
          const title = privacyDoc.langs[language]?.title || privacyDoc.langs.id.title
          return <Link key={i} href={`/legal/${privacyDoc.slug}`} className="text-link font-medium">{title}</Link>
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}
