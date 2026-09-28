'use client'
/**
 * Generic image uploader for the Landing Builder (generalizes the old
 * HeroImageUploader). Uploads to Supabase Storage via
 * POST /api/admin/upload-image with a `folder` (type & size rules per folder
 * live server-side). Deliberately never sends `oldUrl`: the previous image
 * may still be used by the PUBLISHED version until the next "Terbitkan".
 */
import { useRef, useState } from 'react'
import { ImageOff, Trash2, UploadCloud } from 'lucide-react'
import { Button, Progress } from '@/components/admin/ui'
import { cn } from '@/lib/utils'

export type UploadFolder = 'landing/hero' | 'landing/og' | 'landing/logo' | 'landing/testimonials' | 'landing/features'

const RULES: Record<UploadFolder, { accept: string; types: string[]; maxMb: number }> = {
  'landing/hero': { accept: 'image/png,image/webp', types: ['image/png', 'image/webp'], maxMb: 2 },
  'landing/og': { accept: 'image/png,image/jpeg,image/webp', types: ['image/png', 'image/jpeg', 'image/webp'], maxMb: 5 },
  'landing/logo': { accept: 'image/svg+xml,image/png,image/webp', types: ['image/svg+xml', 'image/png', 'image/webp'], maxMb: 1 },
  'landing/testimonials': { accept: 'image/jpeg,image/png,image/webp', types: ['image/jpeg', 'image/png', 'image/webp'], maxMb: 2 },
  'landing/features': { accept: 'image/png,image/jpeg,image/webp', types: ['image/png', 'image/jpeg', 'image/webp'], maxMb: 2 },
}

export function uploadImage(file: File, folder: UploadFolder, onProgress?: (pct: number) => void): Promise<string> {
  const rule = RULES[folder]
  if (!rule.types.includes(file.type)) return Promise.reject(new Error(`Tipe file tidak didukung (${file.type || '?'}).`))
  if (file.size > rule.maxMb * 1024 * 1024) return Promise.reject(new Error(`Ukuran maksimal ${rule.maxMb} MB.`))
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('folder', folder)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/admin/upload-image')
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 90)) }
    xhr.onload = () => {
      let json: { url?: string; error?: string } = {}
      try { json = JSON.parse(xhr.responseText) } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && json.url) { onProgress?.(100); resolve(json.url) }
      else reject(new Error(json.error ?? `Upload gagal (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Koneksi gagal. Periksa jaringan Anda.'))
    xhr.send(form)
  })
}

export default function ImageUploader({ value, onChange, folder, hint, previewClass = 'w-24 h-24', label = 'Upload gambar', compact }: {
  value: string | null
  onChange: (url: string | null) => void
  folder: UploadFolder
  hint?: React.ReactNode
  previewClass?: string
  label?: string
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [broken, setBroken] = useState(false)

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    setProgress(0)
    try {
      const url = await uploadImage(file, folder, setProgress)
      setLoaded(false)
      setBroken(false)
      onChange(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload gagal')
    } finally {
      setProgress(null)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className={cn('relative shrink-0 rounded-md overflow-hidden bg-sunken border border-border flex items-center justify-center', previewClass)}>
        {value && !broken ? (
          <>
            {!loaded && <div aria-hidden className="absolute inset-0 gizku-skeleton rounded-none" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" onLoad={() => setLoaded(true)} onError={() => setBroken(true)} />
          </>
        ) : (
          <ImageOff size={20} className="text-tertiary" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size={compact ? 'sm' : 'md'} icon={UploadCloud} onClick={() => input.current?.click()} loading={progress !== null}>
            {value ? 'Ganti' : label}
          </Button>
          {value && (
            <Button variant="tool" size={compact ? 'sm' : 'md'} icon={Trash2} onClick={() => { onChange(null); setBroken(false) }}>Hapus</Button>
          )}
        </div>
        <input ref={input} type="file" accept={RULES[folder].accept} className="sr-only" tabIndex={-1} aria-hidden onChange={e => pick(e.target.files?.[0])} />
        {progress !== null && <Progress value={progress} />}
        {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
        {hint && !error && <p className="text-sm text-secondary leading-normal">{hint}</p>}
      </div>
    </div>
  )
}
