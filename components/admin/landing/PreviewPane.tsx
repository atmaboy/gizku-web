'use client'
/**
 * Live preview of the draft. Renders the REAL landing components inside an
 * iframe (/admin/landing-preview) so breakpoints behave exactly like the
 * public page: Desktop = a 1440px viewport scaled to fit, Mobile = 390px.
 * The draft is pushed to the iframe with postMessage on every change.
 */
import { useEffect, useRef, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import type { BuilderSection } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { useBuilder } from './BuilderContext'

export type PreviewDevice = 'desktop' | 'mobile'
export const PREVIEW_MSG = { ready: 'lb:ready', state: 'lb:state' } as const

const WIDTH: Record<PreviewDevice, number> = { desktop: 1440, mobile: 390 }

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

export function PreviewFrame({ device, highlight, className }: { device: PreviewDevice; highlight: BuilderSection | null; className?: string }) {
  const { draft, legalDocs, metrics } = useBuilder()
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const { w, h } = useSize(box)

  // Handshake: the iframe says "ready", we answer with the state.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return
      if (e.data?.type === PREVIEW_MSG.ready) setReady(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    if (!ready || !draft) return
    const t = setTimeout(() => {
      frame.current?.contentWindow?.postMessage({ type: PREVIEW_MSG.state, content: draft, legalDocs, metrics, highlight }, window.location.origin)
    }, 120)
    return () => clearTimeout(t)
  }, [ready, draft, legalDocs, metrics, highlight])

  const pad = device === 'mobile' ? 32 : 0
  const scale = w > 0 ? Math.min(1, (w - pad) / WIDTH[device]) : 1
  const frameH = h > 0 ? (h - pad) / scale : 800

  return (
    <div ref={box} className={cn('relative w-full h-full overflow-hidden bg-sand-100', className)}>
      {!ready && (
        <div aria-hidden className="absolute inset-0 p-4 flex flex-col gap-3">
          <div className="gizku-skeleton h-10 rounded-md" />
          <div className="gizku-skeleton h-40 rounded-md" />
          <div className="gizku-skeleton h-6 w-2/3 rounded-md" />
          <div className="gizku-skeleton h-24 rounded-md" />
        </div>
      )}
      {w > 0 && (
        <div
          className={cn('absolute top-0 origin-top-left', device === 'mobile' ? 'rounded-[28px] overflow-hidden shadow-card bg-page' : '')}
          style={{
            width: WIDTH[device],
            height: frameH,
            left: device === 'mobile' ? Math.max(0, (w - WIDTH[device] * scale) / 2) : 0,
            top: device === 'mobile' ? 16 : 0,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            ref={frame}
            title={`Pratinjau landing page (${device === 'mobile' ? 'mobile' : 'desktop'})`}
            src="/admin/landing-preview"
            className={cn('w-full h-full border-0 bg-page transition-opacity', ready ? 'opacity-100' : 'opacity-0')}
          />
        </div>
      )}
    </div>
  )
}

export default function PreviewPane({ highlight }: { highlight: BuilderSection | null }) {
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  return (
    <section aria-label="Pratinjau" className="bg-surface rounded-md shadow-card overflow-hidden flex flex-col min-h-0 h-full">
      <div className="min-h-[52px] px-4 py-2 border-b border-border flex items-center gap-3">
        <h2 className="text-md font-semibold text-primary flex-1">Pratinjau</h2>
        <div role="group" aria-label="Ukuran pratinjau" className="inline-flex rounded-sm bg-sunken p-0.5">
          {(['desktop', 'mobile'] as const).map(d => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={cn(
                'inline-flex items-center gap-1.5 min-h-8 px-3 rounded-sm text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                device === d ? 'bg-surface text-primary shadow-xs' : 'text-secondary hover:text-primary',
              )}
            >
              {d === 'desktop' ? <Monitor size={14} aria-hidden /> : <Smartphone size={14} aria-hidden />}
              {d === 'desktop' ? 'Desktop' : 'Mobile'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0"><PreviewFrame device={device} highlight={highlight} /></div>
    </section>
  )
}
