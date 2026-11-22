'use client'

import { startTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button } from '@/components/admin/ui'

/**
 * Batas error untuk halaman admin. Tanpa ini, request RSC yang gagal di tengah jalan (koneksi putus saat
 * navigasi client-side, mis. ERR_HTTP2_PING_FAILED) menampilkan layar putih "Application error" dan baru
 * pulih setelah refresh manual. Di sini kita coba muat ulang sekali otomatis, lalu tawarkan tombol manual.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const retried = useRef(false)

  useEffect(() => {
    console.error('[admin]', error)
    if (retried.current) return
    retried.current = true
    // Gangguan jaringan sesaat: render ulang segmen ini tanpa reload penuh.
    const timer = setTimeout(() => {
      startTransition(() => {
        router.refresh()
        reset()
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [error, reset, router])

  return (
    <div className="p-4 md:p-6">
      <Alert
        variant="danger"
        title="Halaman gagal dimuat"
        action={<Button onClick={() => startTransition(() => { router.refresh(); reset() })}>Coba lagi</Button>}
      >
        Koneksi ke server terputus sesaat atau terjadi kesalahan saat memuat halaman. Coba lagi; kalau terus berulang, muat ulang halaman.
        {error.digest ? <span className="block text-xs mt-1 opacity-70">Kode: {error.digest}</span> : null}
      </Alert>
    </div>
  )
}
