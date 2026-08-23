import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { legalDocuments } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import LegalDocumentView from '@/components/legal/LegalDocumentView'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const [doc] = await db
      .select({ title: legalDocuments.titleId })
      .from(legalDocuments)
      .where(eq(legalDocuments.slug, slug))
      .limit(1)

    if (!doc?.title) return { title: 'Dokumen' }
    return {
      title: doc.title,
      alternates: { canonical: `/legal/${slug}` },
    }
  } catch (e) {
    console.error('[legal/[slug] generateMetadata]', e)
    return { title: 'Dokumen' }
  }
}

// Public route (not under /main) — reachable pre-login, so the register/login
// consent line (components/LegalConsentLine.tsx) can link straight into it,
// as well as the authenticated About page.
export default function LegalDocumentDetailPage() {
  return <LegalDocumentView />
}
