'use client'
import { useState } from 'react'

export type ConfirmSeverity = 'orange' | 'green' | 'red'

const SEVERITY_STYLES: Record<ConfirmSeverity, string> = {
  orange: 'bg-orange-500 hover:bg-orange-600',
  green:  'bg-[#2ECC71] hover:bg-[#28B765]',
  red:    'bg-red-500 hover:bg-red-600',
}

export type ConfirmRequest = {
  title: string
  message: string
  confirmLabel: string
  severity: ConfirmSeverity
  onConfirm: (adminPassword: string) => void | Promise<void>
}

/**
 * Modal konfirmasi "penjagaan ganda" — dipakai bersama oleh semua aksi yang
 * mengubah state user (aktifkan/nonaktifkan, simpan limit, reset password,
 * hapus permanen). Admin wajib mengetik ulang password-nya sendiri sebelum
 * tombol konfirmasi aktif; password ini diverifikasi di server (bukan hanya
 * dicek non-empty di client).
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

  if (!request) return null

  function handleConfirm() {
    if (!password || loading) return
    // Clear immediately on submit — regardless of outcome — so a typed
    // password never lingers in the field for a subsequent action to reuse.
    const submitted = password
    setPassword('')
    request!.onConfirm(submitted)
  }

  function handleClose() {
    setPassword('')
    onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-white ring-1 ring-[#E5E7EB] shadow-xl rounded-3xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#111827]">{request.title}</h2>
          <p className="text-sm text-[#6B7280] mt-1.5 leading-relaxed">{request.message}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#111827]">Password Anda</label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            placeholder="Konfirmasi dengan password admin"
            className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-base bg-white text-[#111827]
              placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-50 min-h-[48px]"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!password || loading}
            className={`flex-1 py-3 rounded-xl text-sm font-medium text-white transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px] ${SEVERITY_STYLES[request.severity]}`}
          >
            {loading ? 'Memproses…' : request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
