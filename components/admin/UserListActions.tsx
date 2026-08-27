'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ConfirmPasswordModal, { type ConfirmRequest } from './ConfirmPasswordModal'

type U = { id: string; username: string; isActive: boolean }

export default function UserListActions({
  user,
  riwayatHref,
  mobileCard = false,
}: {
  user: U
  riwayatHref: string
  /** Saat true, render sebagai full-width button strip di mobile card */
  mobileCard?: boolean
}) {
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function askToggleActive() {
    setConfirm({
      title: user.isActive ? `Nonaktifkan @${user.username}?` : `Aktifkan @${user.username}?`,
      message: user.isActive
        ? 'User tidak akan bisa login sampai diaktifkan kembali.'
        : 'User akan bisa login kembali seperti biasa.',
      confirmLabel: user.isActive ? 'Nonaktifkan' : 'Aktifkan',
      severity: user.isActive ? 'orange' : 'green',
      onConfirm: async adminPassword => {
        setLoading(true)
        const r = await fetch('/api/admin?action=update_user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, isActive: !user.isActive, adminPassword }),
        })
        const d = await r.json()
        if (r.ok) {
          toast.success('Berhasil')
          setConfirm(null)
          router.refresh()
        } else {
          toast.error(d.error)
        }
        setLoading(false)
      },
    })
  }

  const toggleLabel = user.isActive ? 'Nonaktifkan' : 'Aktifkan'

  if (mobileCard) {
    return (
      <>
        <div className="flex w-full divide-x divide-[#F3F4F6]">
          <Link
            href={riwayatHref}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-[#3B82F6] hover:bg-[#EFF6FF] transition-colors min-h-[48px]"
          >
            Riwayat
          </Link>
          <Link
            href={`/admin/users/${user.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] transition-colors min-h-[48px]"
          >
            Detail
          </Link>
          <button
            onClick={askToggleActive}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors min-h-[48px] ${
              user.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-[#2ECC71] hover:bg-[#F0FDF4]'
            }`}
          >
            {toggleLabel}
          </button>
        </div>
        <ConfirmPasswordModal request={confirm} loading={loading} onCancel={() => setConfirm(null)} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Link
          href={riwayatHref}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-[#BFDBFE] text-[#3B82F6] hover:bg-[#EFF6FF] transition min-h-[36px] flex items-center"
        >
          Riwayat
        </Link>
        <Link
          href={`/admin/users/${user.id}`}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition min-h-[36px] flex items-center"
        >
          Detail
        </Link>
        <button
          onClick={askToggleActive}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition min-h-[36px] ${
            user.isActive
              ? 'border-orange-200 text-orange-600 hover:bg-orange-50'
              : 'border-[#BBF7D0] text-[#2ECC71] hover:bg-[#F0FDF4]'
          }`}
        >
          {toggleLabel}
        </button>
      </div>
      <ConfirmPasswordModal request={confirm} loading={loading} onCancel={() => setConfirm(null)} />
    </>
  )
}
