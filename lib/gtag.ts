// Wrapper tipis di atas gtag.js (Google Analytics 4). Semua pemanggil harus lewat
// sini, bukan `window.gtag` langsung, supaya no-op dengan aman kalau
// NEXT_PUBLIC_GA_MEASUREMENT_ID belum diset (mis. saat dev lokal).

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

export function pageview(url: string) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export function event(name: string, params?: Record<string, unknown>) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}
