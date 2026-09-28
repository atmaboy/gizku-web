'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import NavAuthArea from '@/components/landing/NavAuthArea'
import type { NavLinkView } from './SiteHeader'

/* ─── Mobile nav (< lg): 44px hamburger that opens a panel under the header
       with the menu links + the header button. Closes on link tap, Esc, or
       tapping outside. ── */
export default function MobileMenu({ links, brandName, button }: {
  links: NavLinkView[]
  brandName: string
  button: { label: string; guestHref: string; authHref: string }
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [open])

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        type="button"
        aria-label={open ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        className="w-11 h-11 inline-flex items-center justify-center rounded-md text-primary hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full px-5 pt-2 pb-4"
      >
        <nav aria-label={`Menu ${brandName}`} className="rounded-2xl bg-surface shadow-[0_12px_32px_rgba(36,30,25,0.16)] border border-sand-200 p-4">
          <ul className="list-none m-0 p-0 flex flex-col">
            {links.map(l => (
              <li key={l.id} className="border-b border-sand-200 last:border-b-0">
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="flex items-center min-h-12 px-1 text-[16px] font-semibold text-primary no-underline"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 [&>a]:w-full [&>a]:justify-center">
            <NavAuthArea label={button.label} guestHref={button.guestHref} authHref={button.authHref} className="h-12 text-[15px]" />
          </div>
        </nav>
      </div>
    </div>
  )
}
