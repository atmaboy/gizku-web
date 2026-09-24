'use client'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'

// Stack of open dialogs so only the top-most one reacts to Esc / Tab when
// dialogs are nested (e.g. an edit modal + the password confirmation).
const dialogStack: symbol[] = []

/** Focus trap + Esc + restore focus + body scroll lock. Shared by Modal, Drawer, ConfirmPasswordModal. */
export function useDialogBehavior(open: boolean, onClose: () => void, panelRef: React.RefObject<HTMLElement | null>, opts?: { autoFocus?: boolean }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  useEffect(() => {
    if (!open) return
    const me = Symbol('dialog')
    dialogStack.push(me)
    const prev = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = panelRef.current
    if (panel && opts?.autoFocus !== false) {
      const auto = panel.querySelector<HTMLElement>('[autofocus],[data-autofocus]')
      const first = auto ?? panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel).focus()
    }
    function onKey(e: KeyboardEvent) {
      if (dialogStack[dialogStack.length - 1] !== me) return
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      const i = dialogStack.indexOf(me)
      if (i >= 0) dialogStack.splice(i, 1)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prev?.focus?.()
    }
  }, [open, panelRef, opts?.autoFocus])
}

const WIDTH = { sm: 'lg:w-[460px]', md: 'lg:w-[520px]', lg: 'lg:w-[760px]', xl: 'lg:w-[960px]' } as const

export default function Modal({ open, onClose, title, size = 'md', footer, children, sheetOnMobile = false, bodyClassName, headerAction, closeDisabled }: {
  open: boolean; onClose: () => void; title: React.ReactNode; size?: keyof typeof WIDTH; footer?: React.ReactNode
  children: React.ReactNode; sheetOnMobile?: boolean; bodyClassName?: string; headerAction?: React.ReactNode; closeDisabled?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const close = () => { if (!closeDisabled) onClose() }
  useDialogBehavior(open, close, panelRef)
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-bark-900/45 animate-[fadeIn_150ms_ease-out]" onClick={close} aria-hidden />
      <div className={cn('absolute inset-0 overflow-y-auto pointer-events-none', sheetOnMobile ? 'max-lg:overflow-hidden' : '')}>
        <div className={cn('flex justify-center px-4 pt-[72px] pb-10 lg:pt-[110px]', sheetOnMobile && 'max-lg:p-0 max-lg:h-full')}>
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              'pointer-events-auto bg-surface rounded-md shadow-[0_12px_40px_rgba(36,30,25,0.25)] w-full flex flex-col focus:outline-none animate-[slideUp_180ms_ease-out]',
              WIDTH[size],
              sheetOnMobile && 'max-lg:rounded-none max-lg:h-full max-lg:max-h-none max-lg:animate-none',
            )}
          >
            <div className={cn('flex items-center gap-3 px-[18px] py-3.5 border-b border-border', sheetOnMobile && 'max-lg:h-14 max-lg:px-1.5 max-lg:py-0 max-lg:sticky max-lg:top-0 max-lg:bg-surface max-lg:z-10')}>
              {sheetOnMobile && (
                <button type="button" onClick={close} aria-label="Tutup" className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-sm text-secondary hover:bg-muted">
                  <X size={20} aria-hidden />
                </button>
              )}
              <h2 id={titleId} className="text-[18px] max-lg:text-lg font-semibold text-primary flex-1 min-w-0 truncate">{title}</h2>
              {headerAction}
              <button type="button" onClick={close} aria-label="Tutup" className={cn('inline-flex items-center justify-center w-8 h-8 rounded-sm text-secondary hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500', sheetOnMobile && 'max-lg:hidden')}>
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className={cn('p-[18px] max-lg:p-4', sheetOnMobile && 'max-lg:flex-1 max-lg:overflow-y-auto', bodyClassName)}>{children}</div>
            {footer && (
              <div className="px-[18px] py-3 bg-sunken border-t border-border flex flex-wrap justify-end gap-2 rounded-b-md max-lg:rounded-none">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
