'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Thin green progress bar di top halaman — muncul saat navigasi antar route admin.
 * Mirip YouTube / GitHub navigation indicator.
 */
export default function NavProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPathRef = useRef(pathname)

  // Saat pathname berubah → navigasi selesai → selesaikan bar
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname
      // Selesaikan bar ke 100% lalu hilangkan
      setProgress(100)
      const hideTimer = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 400)
      if (timerRef.current) clearInterval(timerRef.current)
      return () => clearTimeout(hideTimer)
    }
  }, [pathname])

  // Expose startProgress ke link klik via event
  useEffect(() => {
    function handleStart() {
      setVisible(true)
      setProgress(15)
      let p = 15
      timerRef.current = setInterval(() => {
        // Increment makin lambat semakin mendekati 85
        p = Math.min(p + Math.random() * 8 * (1 - p / 90), 85)
        setProgress(p)
      }, 200)
    }

    document.addEventListener('nav:start', handleStart)
    return () => document.removeEventListener('nav:start', handleStart)
  }, [])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms' }}
    >
      <div
        className="h-full bg-brand shadow-[0_0_8px_rgba(61,120,51,0.5)]"
        style={{
          width: `${progress}%`,
          transition: progress === 100
            ? 'width 200ms ease-out'
            : 'width 200ms linear',
        }}
      />
    </div>
  )
}
