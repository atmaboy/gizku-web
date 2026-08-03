'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Button from '@/components/ui/Button'
import { IconClock, IconCheck, IconClose } from '@/components/ui/icons'

type RequestDetail = {
  id: string
  tierId: string | null
  tierLabel: string
  addPerDay: number
  totalPerDay: number
  price: number
  uniqueCode: number
  totalTransfer: number
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  decidedAt: string | null
  proofImageUrl: string
  note: string | null
  rejectReason: string | null
  rejectNote: string | null
  expiresAt?: string
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') || ''}` }
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtRupiah(n: number) {
  return n.toLocaleString('id-ID')
}

const STATUS_META = {
  pending:  { label: 'Menunggu Review', color: 'var(--color-warning)', bg: 'rgba(217,155,63,0.12)', icon: IconClock },
  approved: { label: 'Disetujui',       color: 'var(--color-success)', bg: 'var(--color-bg-brand-tint)', icon: IconCheck },
  rejected: { label: 'Ditolak',         color: 'var(--color-danger)',  bg: 'rgba(194,91,88,0.1)', icon: IconClose },
} as const

export default function LimitRequestDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<RequestDetail | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/limit?action=request&id=${params.id}`, { headers: authHeaders(), cache: 'no-store' })
      .then(res => {
        if (res.status === 401) { router.replace('/login'); return null }
        if (!res.ok) return null
        return res.json()
      })
      .then(data => { if (!cancelled) setDetail(data ?? null) })
    return () => { cancelled = true }
  }, [params.id, router])

  if (detail === undefined) return null
  if (detail === null) {
    return (
      <div className="flex flex-col min-h-0 flex-1">
        <ScreenHeader title="Detail Request" onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center text-sm text-secondary">Request tidak ditemukan.</div>
      </div>
    )
  }

  const meta = STATUS_META[detail.status]
  const StatusIcon = meta.icon
  const statusDate = detail.status === 'pending' ? detail.submittedAt : detail.decidedAt

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title="Detail Request" onBack={() => router.back()} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-10">
        <div className="rounded-lg px-4 py-3.5 mb-4 flex items-center gap-3" style={{ background: meta.bg }}>
          <StatusIcon size={22} color={meta.color} />
          <div className="min-w-0">
            <div className="text-base font-semibold" style={{ color: meta.color }}>{meta.label}</div>
            {statusDate && <div className="text-xs mt-0.5" style={{ color: meta.color }}>{fmtDateTime(statusDate)}</div>}
          </div>
        </div>

        <div className="bg-surface shadow-hairline rounded-lg px-4 py-3.5 mb-4">
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">Paket</span>
            <span className="font-medium text-primary text-right">{detail.tierLabel}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">Total limit/hari</span>
            <span className="font-medium text-primary text-right">{detail.totalPerDay} analisa/hari</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">Nominal transfer</span>
            <span className="font-medium text-primary text-right">Rp {fmtRupiah(detail.totalTransfer)} (kode unik {detail.uniqueCode})</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">Berlaku</span>
            <span className="font-medium text-primary text-right">30 hari sejak disetujui</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-secondary">Tanggal pengajuan</span>
            <span className="font-medium text-primary text-right">{fmtDateTime(detail.submittedAt)}</span>
          </div>
          {detail.note && (
            <div className="mt-2 pt-2.5 text-sm text-secondary italic" style={{ borderTop: '1px solid var(--color-border-default)' }}>
              &ldquo;{detail.note}&rdquo;
            </div>
          )}
        </div>

        <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-2.5">Bukti Transfer</div>
        <div className="w-full rounded-lg bg-sunken overflow-hidden mb-4" style={{ minHeight: 180 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={detail.proofImageUrl} alt="Bukti transfer" className="w-full h-auto block" />
        </div>

        {detail.status === 'approved' && (
          <div className="rounded-lg px-4 py-3.5 mb-4" style={{ background: 'var(--color-bg-brand-tint)' }}>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-brand)' }}>Disetujui</div>
            <div className="text-sm" style={{ color: 'var(--color-text-brand)' }}>Limit aktif: {detail.totalPerDay} analisa/hari</div>
            {detail.expiresAt && (
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-brand)' }}>Aktif hingga {fmtDate(detail.expiresAt)}</div>
            )}
          </div>
        )}

        {detail.status === 'rejected' && (
          <div className="bg-surface shadow-hairline rounded-lg px-4 py-3.5 mb-4">
            <div className="text-sm font-bold text-danger mb-1.5">{detail.rejectReason}</div>
            {detail.rejectNote && <div className="text-sm text-secondary mb-2.5">{detail.rejectNote}</div>}
            <div className="text-xs text-secondary leading-normal mb-3">
              Kamu bisa mengajukan kembali dengan memperbaiki bukti transfer atau nominal sesuai paket.
            </div>
            <Button onClick={() => router.push(`/main/limit/new${detail.tierId ? `?tierId=${detail.tierId}` : ''}`)}>
              Ajukan Ulang
            </Button>
          </div>
        )}

        {detail.status === 'pending' && (
          <div className="bg-muted rounded-md px-3.5 py-3 text-xs text-secondary leading-normal">
            Request akan direview oleh admin dalam 1x24 jam.
          </div>
        )}
      </div>
    </div>
  )
}
