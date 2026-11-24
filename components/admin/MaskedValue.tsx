'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/** Data pribadi (gender, tanggal lahir) yang disamarkan secara default; satu klik pada ikon mata untuk tampil/sembunyi. Pola sama dengan MaskedId. */
export default function MaskedValue({ value, mask, label }: { value: string; mask: string; label: string }) {
  const [shown, setShown] = useState(false)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular-nums" aria-live="polite">{shown ? value : mask}</span>
      <button
        type="button"
        onClick={() => setShown(v => !v)}
        aria-pressed={shown}
        aria-label={shown ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
        className="inline-flex items-center justify-center size-6 rounded-sm text-secondary hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        {shown ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
      </button>
    </span>
  )
}
