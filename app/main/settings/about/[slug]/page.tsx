'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { useTranslation } from '@/lib/i18n/LanguageContext'

type LegalContent = {
  documents: { slug: string; langs: { id: { title: string; bodyHtml: string } } }[]
}

export default function LegalDocumentDetailPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const [title, setTitle] = useState<string | null>(null)
  const [bodyHtml, setBodyHtml] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch('/api/legal-content')
      .then(r => r.json())
      .then((j: LegalContent) => {
        const doc = (j.documents ?? []).find(d => d.slug === params.slug)
        if (!doc) { setNotFound(true); return }
        setTitle(doc.langs.id.title)
        setBodyHtml(doc.langs.id.bodyHtml)
      })
      .catch(() => setNotFound(true))
  }, [params.slug])

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title={title ?? t('about.documentFallbackTitle')} onBack={() => router.push('/main/settings/about')} />
      <div className="flex-1 overflow-auto px-4 pt-5 pb-10">
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
