import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import SectionRenderer from '@/components/landing/sections/SectionRenderer'
import { hasAdminCookie } from '@/lib/admin'
import { buildRenderModel, type RenderModel } from '@/lib/landing/render'
import { getDraftLanding, getPublishedLanding, type PublishedLanding } from '@/lib/landing/repo'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gizku.com'

/* ─── Content source ─────────────────────────────────────────────────────────
   Visitors: the published document (cached, tag 'landing' — purged on
   "Terbitkan"). Admins who opened "Pratinjau" in the Landing Builder get
   draftMode + a valid admin cookie → the uncached draft instead. Draft mode
   alone (without the cookie) is ignored, so a visitor can't turn it on. ── */
async function loadLanding(): Promise<{ data: PublishedLanding; preview: boolean }> {
  const { isEnabled } = await draftMode()
  if (isEnabled && await hasAdminCookie()) {
    try {
      return { data: await getDraftLanding(), preview: true }
    } catch (e) {
      console.error('[HomePage] gagal memuat draf — menampilkan versi tayang', e)
    }
  }
  return { data: await getPublishedLanding(), preview: false }
}

export async function generateMetadata(): Promise<Metadata> {
  const { data, preview } = await loadLanding()
  const { title, description, ogImageUrl } = data.content.settings.seo
  const images = ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630 }] : undefined
  return {
    // `absolute` — the root layout's "%s · Gizku" template would double the brand.
    title: { absolute: title },
    description,
    alternates: { canonical: '/' },
    openGraph: { title, description, url: '/', siteName: 'Gizku', locale: 'id_ID', type: 'website', ...(images ? { images } : {}) },
    twitter: { card: 'summary_large_image', title, description, ...(images ? { images: images.map(i => i.url) } : {}) },
    ...(preview ? { robots: { index: false, follow: false } } : {}),
  }
}

/* ─── Structured data — only fields backed by real, on-page content
       (no fabricated ratings/review counts). FAQPage only when the FAQ
       section actually renders. ── */
function jsonLd(model: RenderModel) {
  const c = model.content
  const description = c.hero.subtitle || c.settings.seo.description
  const out: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: c.header.brandName || 'Gizku',
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: c.header.brandName || 'Gizku',
      url: SITE_URL,
      description,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      inLanguage: 'id',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
    },
  ]
  if (model.rendered.has('faq')) {
    const live = c.faq.items.filter(i => i.status === 'live' && i.question.trim())
    if (live.length) {
      out.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: live.map(i => ({
          '@type': 'Question',
          name: i.question,
          acceptedAnswer: { '@type': 'Answer', text: i.answerHtml },
        })),
      })
    }
  }
  return out
}

// JSON-LD is embedded in a <script>; escape "<" so content can't close the tag.
const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

export default async function HomePage() {
  const { data, preview } = await loadLanding()
  const model = buildRenderModel(data.content, { legalDocs: data.legalDocs })

  return (
    <>
      {jsonLd(model).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(d) }} />
      ))}
      {preview && (
        <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-[560px] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 rounded-lg bg-honey-100 border border-honey-300 shadow-md text-sm text-bark-800">
          <strong className="font-semibold">Mode pratinjau draf</strong>
          <span>Pengunjung belum melihat perubahan ini.</span>
          <a href="/api/admin/landing-builder/preview?exit=1" className="font-semibold text-green-700 underline underline-offset-2">Keluar pratinjau</a>
        </div>
      )}
      <SectionRenderer model={model} />
    </>
  )
}
