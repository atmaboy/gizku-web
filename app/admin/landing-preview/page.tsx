'use client'
/**
 * Iframe target for the Landing Builder's live preview (admin-only via
 * middleware — everything under /admin requires the admin cookie). Receives
 * the draft from the parent builder with postMessage and renders the real
 * landing components, so what the admin sees is exactly what `/` will show.
 */
import { useEffect, useMemo, useState } from 'react'
import SectionRenderer from '@/components/landing/sections/SectionRenderer'
import { buildRenderModel, type LegalDocLink } from '@/lib/landing/render'
import { LandingContent, type BuilderSection } from '@/lib/landing/schema'
import { applyMetrics, type MetricValues } from '@/lib/landing/stats'

type State = { content: LandingContent; legalDocs: LegalDocLink[]; metrics: MetricValues | null; highlight: BuilderSection | null }

export default function LandingPreviewFrame() {
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return
      if (e.data?.type !== 'lb:state') return
      const parsed = LandingContent.safeParse(e.data.content)
      if (!parsed.success) return
      setState({ content: parsed.data, legalDocs: e.data.legalDocs ?? [], metrics: e.data.metrics ?? null, highlight: e.data.highlight ?? null })
    }
    window.addEventListener('message', onMsg)
    window.parent?.postMessage({ type: 'lb:ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const model = useMemo(() => {
    if (!state) return null
    const content = state.metrics ? applyMetrics(state.content, state.metrics) : state.content
    return buildRenderModel(content, { legalDocs: state.legalDocs })
  }, [state])

  // Bring the section being edited into view.
  const highlight = state?.highlight ?? null
  const hasModel = model !== null
  useEffect(() => {
    if (!highlight) return
    const el = document.querySelector<HTMLElement>(`[data-lb-section="${highlight}"]`)
    const target = el && getComputedStyle(el).display === 'contents' ? el.firstElementChild as HTMLElement | null : el
    // Not scrollIntoView(): that would also scroll the parent builder page.
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' })
    // Only when the edited section changes — not on every keystroke.
  }, [highlight, hasModel])

  if (!model) {
    return (
      <div role="status" aria-label="Memuat pratinjau" className="min-h-screen bg-page p-6 flex flex-col gap-4">
        <div className="gizku-skeleton h-16" />
        <div className="gizku-skeleton h-[420px]" />
        <div className="gizku-skeleton h-24" />
      </div>
    )
  }
  // Links stay visual-only inside the preview (no navigating the iframe away).
  return (
    <div onClickCapture={e => { if ((e.target as HTMLElement).closest('a')) e.preventDefault() }}>
      <SectionRenderer model={model} highlight={highlight} />
    </div>
  )
}
