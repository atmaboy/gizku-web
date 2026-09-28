import type { RenderModel } from '@/lib/landing/render'
import { SECTION_LABELS, type BuilderSection, type SectionKey } from '@/lib/landing/schema'
import CtaDownload from './CtaDownload'
import Faq from './Faq'
import Features from './Features'
import Hero from './Hero'
import HowItWorks from './HowItWorks'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import StatsBand from './StatsBand'
import Testimonials from './Testimonials'

function renderSection(k: SectionKey, model: RenderModel) {
  const c = model.content
  switch (k) {
    case 'hero': return <Hero model={model} />
    case 'stats': return <StatsBand model={model} />
    case 'howItWorks': return <HowItWorks model={model} />
    case 'features': return <Features model={model} />
    case 'testimonials': return <Testimonials data={c.testimonials} />
    case 'faq': return <Faq data={c.faq} settings={c.settings} />
    case 'cta': return <CtaDownload model={model} />
  }
}

/** Builder preview only: dashed outline + "Sedang diedit" label on the active section. */
function Editing({ on, section, children }: { on: boolean; section: BuilderSection; children: React.ReactNode }) {
  // `contents` = no box of its own, so the sticky header still sticks to the page.
  if (!on) return <div data-lb-section={section} className="contents">{children}</div>
  return (
    <div data-lb-section={section} className="lb-editing">
      <span className="lb-editing-label">Sedang diedit · {SECTION_LABELS[section]}</span>
      {children}
    </div>
  )
}

/**
 * The whole landing page: Header (locked top) → the visible middle sections
 * in `order` → Footer (locked bottom). Pure/presentational — used by the
 * public page (server) and by the builder preview (client) alike.
 */
export default function SectionRenderer({ model, highlight }: { model: RenderModel; highlight?: BuilderSection | null }) {
  return (
    <div className="bg-page overflow-x-clip font-sans text-primary pt-[var(--staging-banner-h,0px)]">
      <Editing on={highlight === 'header'} section="header"><SiteHeader model={model} /></Editing>
      <main>
        {model.sections.map(k => (
          <Editing key={k} on={highlight === k} section={k}>{renderSection(k, model)}</Editing>
        ))}
      </main>
      <Editing on={highlight === 'footer'} section="footer"><SiteFooter model={model} /></Editing>
    </div>
  )
}
