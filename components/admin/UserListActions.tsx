'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, History, UserCheck, UserX } from 'lucide-react'
import { Button, TrackedLink } from '@/components/admin/ui'
import { cn } from '@/lib/utils'
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
        try {
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
        } catch {
          toast.error('Gagal menghubungi server')
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const toggleLabel = user.isActive ? 'Nonaktifkan' : 'Aktifkan'
  const ToggleIcon = user.isActive ? UserX : UserCheck

  if (mobileCard) {
    const cell = 'flex-1 flex items-center justify-center gap-1.5 min-h-12 text-[15px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500'
    return (
      <>
        <div className="flex w-full divide-x divide-border border-t border-border">
          <TrackedLink href={riwayatHref} className={cn(cell, 'text-green-700')}>
            <History size={16} aria-hidden />Riwayat
          </TrackedLink>
          <TrackedLink href={`/admin/users/${user.id}`} className={cn(cell, 'text-bark-800')}>
            <Eye size={16} aria-hidden />Detail
          </TrackedLink>
          <button type="button" onClick={askToggleActive} className={cn(cell, user.isActive ? 'text-bark-800' : 'text-green-700')}>
            <ToggleIcon size={16} aria-hidden />{toggleLabel}
          </button>
        </div>
        <ConfirmPasswordModal request={confirm} loading={loading} onCancel={() => setConfirm(null)} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button variant="outline-primary" size="sm" icon={History} href={riwayatHref}>Riwayat</Button>
        <Button variant="outline" size="sm" icon={Eye} href={`/admin/users/${user.id}`}>Detail</Button>
        <Button variant={user.isActive ? 'outline-warning' : 'outline-primary'} size="sm" icon={ToggleIcon} onClick={askToggleActive}>
          {toggleLabel}
        </Button>
      </div>
      <ConfirmPasswordModal request={confirm} loading={loading} onCancel={() => setConfirm(null)} />
    </>
  )
}
