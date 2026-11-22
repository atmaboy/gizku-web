'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/** ID sensitif yang disensor secara default; satu klik untuk tampilkan/sembunyikan. */
export default function MaskedId({ value, label = 'ID perangkat' }: { value: string; label?: string }) {
  const [shown, setShown] = useState(false)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
      <span>{label}</span>
      <code className="font-mono tabular-nums break-all" aria-live="polite">{shown ? value : '••••••••-••••-••••-••••-••••••••••••'}</code>
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
