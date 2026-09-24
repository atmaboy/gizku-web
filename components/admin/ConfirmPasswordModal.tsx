'use client'
import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, ShieldCheck, X } from 'lucide-react'
import { Button, useDialogBehavior } from '@/components/admin/ui'
import { cn } from '@/lib/utils'

export type ConfirmSeverity = 'orange' | 'green' | 'red'

const STRIP: Record<ConfirmSeverity, string> = {
  green:  'bg-brand',
  orange: 'bg-warning',
  red:    'bg-rose-500',
}
const CONFIRM_VARIANT = { green: 'primary', orange: 'warning', red: 'danger' } as const

export type ConfirmRequest = {
  title: string
  message: string
  confirmLabel: string
  severity: ConfirmSeverity
  /** Label for the password field. Defaults to "Password Anda". */
  passwordLabel?: string
  onConfirm: (adminPassword: string) => void | Promise<void>
}

/**
 * Modal konfirmasi "penjagaan ganda" — dipakai bersama oleh semua aksi yang
 * mengubah state user (aktifkan/nonaktifkan, simpan limit, reset password,
 * hapus permanen) dan semua aksi di halaman Pengaturan. Admin wajib mengetik
 * ulang password-nya sendiri sebelum tombol konfirmasi aktif; password ini
 * diverifikasi di server (bukan hanya dicek non-empty di client).
 */
export default function ConfirmPasswordModal({
  request,
  loading,
  onCancel,
}: {
  request: ConfirmRequest | null
  loading: boolean
  onCancel: () => void
}) {
  const [password, setPassword] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  const inputId = useId()

  function handleClose() {
    if (loading) return
    setPassword('')
    onCancel()
  }

  useDialogBehavior(!!request, handleClose, panelRef)

  if (!request || typeof document === 'undefined') return null

  function handleConfirm() {
    if (!password || loading) return
    // Clear immediately on submit — regardless of outcome — so a typed
    // password never lingers in the field for a subsequent action to reuse.
    const submitted = password
    setPassword('')
    request!.onConfirm(submitted)
  }

  const disabled = !password || loading

  return createPortal(
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-bark-900/45 animate-[fadeIn_150ms_ease-out]" onClick={handleClose} aria-hidden />
      <div className="absolute inset-0 overflow-y-auto pointer-events-none">
        <div className="flex justify-center px-4 pt-[calc(72px+var(--staging-banner-h,0px))] lg:pt-[calc(120px+var(--staging-banner-h,0px))] pb-10">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            className="pointer-events-auto w-full lg:w-[460px] bg-surface rounded-[10px] shadow-[0_12px_40px_rgba(36,30,25,0.25)] overflow-hidden focus:outline-none animate-[slideUp_180ms_ease-out]"
          >
            <div className={cn('h-1', STRIP[request.severity])} aria-hidden />
            <form
              onSubmit={e => { e.preventDefault(); handleConfirm() }}
            >
              <div className="flex items-start gap-3 px-5 pt-5">
                <span aria-hidden className="w-10 h-10 rounded-full bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </span>
                <div className="flex-1 min-w-0">
                  <h2 id={titleId} className="text-lg font-semibold text-primary leading-tight">{request.title}</h2>
                  <p id={descId} className="text-base text-bark-700 mt-1.5 leading-normal">{request.message}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Tutup"
                  className="w-8 h-8 max-lg:w-10 max-lg:h-10 -mt-1 -mr-1 rounded-sm text-secondary hover:bg-muted flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>

              <div className="px-5 pt-4 pb-5">
                <label htmlFor={inputId} className="block mb-1.5 text-base font-semibold text-primary">
                  {request.passwordLabel ?? 'Password Anda'}
                </label>
                <input
                  id={inputId}
                  type="password"
                  autoFocus
                  data-autofocus
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Konfirmasi dengan password admin"
                  aria-describedby={`${inputId}-help`}
                  className="w-full min-h-[38px] max-lg:min-h-11 px-3 py-[7px] rounded-sm border border-border-strong bg-surface text-base max-lg:text-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p id={`${inputId}-help`} className="mt-1.5 text-xs text-secondary">
                  Password diverifikasi di server dan langsung dikosongkan setelah dikirim.
                </p>
              </div>

              <div className="px-5 py-3 bg-sunken border-t border-border flex justify-end gap-2 max-lg:flex-col-reverse">
                <Button variant="outline" onClick={handleClose} disabled={loading} className="max-lg:w-full">Batal</Button>
                <Button
                  type="submit"
                  variant={CONFIRM_VARIANT[request.severity]}
                  icon={Lock}
                  loading={loading}
                  disabled={disabled}
                  className={cn('max-lg:w-full', disabled && 'disabled:opacity-100 bg-sand-200 text-secondary border-transparent hover:bg-sand-200 hover:brightness-100')}
                >
                  {loading ? 'Memproses…' : request.confirmLabel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
