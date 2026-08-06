'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Card from '@/components/ui/Card'
import ListItem from '@/components/ui/ListItem'
import { useTranslation } from '@/lib/i18n/LanguageContext'

type LegalDocumentSummary = { slug: string; title: string }
type LegalContent = {
  documents: { slug: string; langs: { id: { title: string } } }[]
  about: { id: { description: string; disclaimer: string } }
}

export default function AboutPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<LegalDocumentSummary[]>([])
  const [description, setDescription] = useState<string | null>(null)
  const [disclaimer, setDisclaimer] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/legal-content')
      .then(r => r.json())
      .then((j: LegalContent) => {
        if (j.about?.id?.description) setDescription(j.about.id.description)
        if (j.about?.id?.disclaimer) setDisclaimer(j.about.id.disclaimer)
        setDocuments((j.documents ?? []).filter(d => d.langs.id.title).map(d => ({ slug: d.slug, title: d.langs.id.title })))
      })
      .catch(() => {
        // fail-open — halaman tetap tampil dengan copy default
      })
  }, [])

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title={t('about.title')} onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-7 pb-10 flex flex-col items-center">
        <div className="text-2xl font-semibold text-primary tracking-tight">Gizku</div>
        <div className="text-sm text-secondary mt-0.5">{t('about.version', { version: '1.2.0' })}</div>
        <div className="text-sm text-secondary text-center leading-normal max-w-[280px] mt-3.5">
          {description ?? t('about.tagline')}
        </div>

        <Card className="w-full overflow-hidden mt-6">
          {documents.map(doc => (
            <div key={doc.slug} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
              <ListItem label={doc.title} onClick={() => router.push(`/main/settings/about/${doc.slug}`)} />
            </div>
          ))}
          <a href="https://gizku.com" target="_blank" rel="noopener noreferrer" className="block">
            <ListItem label={t('about.visitWebsite')} supporting="gizku.com" showChevron={false} />
          </a>
        </Card>

        <div className="w-full rounded-lg mt-4 p-3" style={{ background: 'var(--color-bg-muted)' }}>
          <p className="text-xs text-secondary leading-normal">
            <span className="font-semibold text-primary">{t('about.disclaimerLabel')}</span>
            {disclaimer ?? t('about.disclaimerText')}
          </p>
        </div>

        <div className="text-center text-2xs text-tertiary mt-6">{t('about.footer')}</div>
      </div>
    </div>
  )
}
