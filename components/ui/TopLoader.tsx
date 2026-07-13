'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const MIN_VISIBLE_MS = 300

/**
 * Slim indeterminate progress bar shown during route transitions.
 *
 * The App Router has no public "navigation start" event. The root layout's
 * inline <script> patches history.pushState/replaceState (before Next's own
 * router bundle initializes) to dispatch 'gizku:nav-start' on every
 * client-side navigation; usePathname() then reflects the moment the new
 * route has actually committed, so we hide the bar there.
 *
 * Many transitions in this app are prefetched and resolve almost
 * instantly, so the bar enforces a minimum visible duration — otherwise
 * show/hide would collapse within the same paint and never be seen.
 */
export default function TopLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const shownAtRef = useRef<number | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    const onStart = () => {
      if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null }
      shownAtRef.current = Date.now()
      setVisible(true)
    }
    window.addEventListener('gizku:nav-start', onStart)
    return () => window.removeEventListener('gizku:nav-start', onStart)
  }, [])

  // The committed route changed — navigation is done. Hide, but not before
  // the bar has been visible for at least MIN_VISIBLE_MS.
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (shownAtRef.current === null) return
    const elapsed = Date.now() - shownAtRef.current
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
    hideTimerRef.current = setTimeout(() => {
      setVisible(false)
      shownAtRef.current = null
    }, remaining)
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [pathname])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden pointer-events-none">
      <div
        className="h-full w-1/3"
        style={{
          background: 'var(--color-bg-brand)',
          animation: 'gizku-toploader-slide 0.9s ease-in-out infinite',
        }}
      />
    </div>
  )
}
