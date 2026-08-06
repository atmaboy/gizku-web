'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { fetchLegalContent } from '@/lib/legalContent'

// Public route (not under /main) — reachable pre-login, so the register/login
// consent line (components/LegalConsentLine.tsx) can link straight into it,
// as well as the authenticated About page.
export default function LegalDocumentDetailPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { language, t } = useTranslation()
  const [title, setTitle] = useState<string | null>(null)
  const [bodyHtml, setBodyHtml] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchLegalContent()
      .then(data => {
        const doc = data.documents.find(d => d.slug === params.slug)
        if (!doc) { setNotFound(true); return }
        const content = doc.langs[language]?.title ? doc.langs[language] : doc.langs.id
        setTitle(content.title)
        setBodyHtml(content.bodyHtml)
      })
      .catch(() => setNotFound(true))
  }, [params.slug, language])

  return (
    <div className="flex flex-col min-h-dvh">
      <ScreenHeader title={title ?? t('about.documentFallbackTitle')} onBack={() => router.back()} />
      <div className="flex-1 overflow-auto px-4 pt-5 pb-10 max-w-[560px] w-full mx-auto box-border">
        {notFound ? (
          <p className="text-sm text-secondary text-center mt-10">{t('about.documentNotFound')}</p>
        ) : bodyHtml ? (
          <div className="legal-doc-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        ) : (
          <p className="text-sm text-secondary text-center mt-10">{t('about.loading')}</p>
        )}
      </div>
    </div>
  )
}
