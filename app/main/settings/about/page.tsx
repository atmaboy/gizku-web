'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Card from '@/components/ui/Card'
import ListItem from '@/components/ui/ListItem'

type LegalDocumentSummary = { slug: string; title: string }
type LegalContent = {
  documents: { slug: string; langs: { id: { title: string } } }[]
  about: { id: { description: string; disclaimer: string } }
}

const FALLBACK_DESCRIPTION = 'Foto makananmu dan biarkan AI menghitung kalori serta nutrisinya secara instan — tanpa perlu mencatat manual.'
const FALLBACK_DISCLAIMER = 'Hasil analisa gizi sepenuhnya dihasilkan oleh AI dan dapat mengandung ketidaktepatan. Gunakan sebagai referensi, bukan pengganti nasihat ahli gizi profesional.'

export default function AboutPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<LegalDocumentSummary[]>([])
  const [description, setDescription] = useState(FALLBACK_DESCRIPTION)
  const [disclaimer, setDisclaimer] = useState(FALLBACK_DISCLAIMER)

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
      <ScreenHeader title="Tentang Aplikasi" onBack={() => router.push('/main/settings')} />

      <div className="flex-1 overflow-auto px-4 pt-7 pb-10 flex flex-col items-center">
        <div className="text-2xl font-semibold text-primary tracking-tight">Gizku</div>
        <div className="text-sm text-secondary mt-0.5">Versi 1.2.0</div>
        <div className="text-sm text-secondary text-center leading-normal max-w-[280px] mt-3.5">
          {description}
        </div>

        <Card className="w-full overflow-hidden mt-6">
          {documents.map(doc => (
            <div key={doc.slug} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
              <ListItem label={doc.title} onClick={() => router.push(`/main/settings/about/${doc.slug}`)} />
            </div>
          ))}
          <a href="https://gizku.com" target="_blank" rel="noopener noreferrer" className="block">
            <ListItem label="Kunjungi Website" supporting="gizku.com" showChevron={false} />
          </a>
        </Card>

        <div className="w-full rounded-lg mt-4 p-3" style={{ background: 'var(--color-bg-muted)' }}>
          <p className="text-xs text-secondary leading-normal">
            <span className="font-semibold text-primary">Disclaimer: </span>
            {disclaimer}
          </p>
        </div>

        <div className="text-center text-2xs text-tertiary mt-6">© 2026 gizku.com</div>
      </div>
    </div>
  )
}
