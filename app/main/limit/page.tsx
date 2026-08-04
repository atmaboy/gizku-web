'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { IconGauge, IconLightbulb } from '@/components/ui/icons'

type LimitRequestListItem = {
  id: string
  tierLabel: string
  addPerDay: number
  totalPerDay: number
  price: number
  uniqueCode: number
  totalTransfer: number
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  decidedAt: string | null
}

const STATUS_LABEL: Record<LimitRequestListItem['status'], string> = {
  pending: 'Menunggu Review',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}
const STATUS_COLOR: Record<LimitRequestListItem['status'], string> = {
  pending: 'var(--color-warning)',
  approved: 'var(--color-success)',
  rejected: 'var(--color-danger)',
}
const STATUS_BG: Record<LimitRequestListItem['status'], string> = {
  pending: 'rgba(217,155,63,0.12)',
  approved: 'var(--color-bg-brand-tint)',
  rejected: 'rgba(194,91,88,0.1)',
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('nl_token') || ''}` }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtRupiah(n: number) {
  return n.toLocaleString('id-ID')
}

export default function LimitListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null)
  const [items, setItems] = useState<LimitRequestListItem[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [cfgRes, reqRes] = await Promise.all([
          fetch('/api/limit?action=config', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/limit?action=requests', { headers: authHeaders(), cache: 'no-store' }),
        ])
        if (cfgRes.status === 401 || reqRes.status === 401) { router.replace('/login'); return }
        const cfg = cfgRes.ok ? await cfgRes.json() : null
        const reqs = reqRes.ok ? await reqRes.json() : []
        if (!cancelled) {
          setFeatureEnabled(cfg?.featureEnabled ?? false)
          setItems(Array.isArray(reqs) ? reqs : [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <ScreenHeader title="Request Limit" onBack={() => router.back()} />

      <div className="flex-1 overflow-auto px-4 pt-4 pb-10">
        {featureEnabled && (
          <div className="flex justify-end mb-3.5">
            <Button size="md" fullWidth={false} onClick={() => router.push('/main/limit/new')}>
              + Ajukan
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="gizku-skeleton h-20" />)}
          </div>
        )}

        {!loading && featureEnabled === false && (
          <div className="flex flex-col items-center text-center py-16 px-6 gap-2">
            <IconGauge size={40} color="var(--color-text-tertiary)" strokeWidth={1.5} />
            <div className="text-lg font-semibold text-primary">Coming Soon</div>
            <div className="text-sm text-secondary leading-normal max-w-[260px]">
              Fitur pengajuan penambahan limit analisa belum tersedia saat ini.
            </div>
          </div>
        )}

        {!loading && featureEnabled && items.length === 0 && (
          <div className="flex flex-col items-center text-center py-16 px-6 gap-2">
            <IconLightbulb size={40} color="var(--color-text-tertiary)" strokeWidth={1.5} />
            <div className="text-lg font-semibold text-primary">Belum Ada Request</div>
            <div className="text-sm text-secondary leading-normal max-w-[260px]">
              Ajukan penambahan limit analisa harianmu dengan sekali transfer.
            </div>
          </div>
        )}

        {!loading && featureEnabled && items.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {items.map(item => (
              <Card
                key={item.id}
                className="p-3.5 cursor-pointer"
                onClick={() => router.push(`/main/limit/${item.id}`)}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className="inline-flex items-center rounded-pill px-2.5 py-1 text-2xs font-semibold"
                    style={{ background: STATUS_BG[item.status], color: STATUS_COLOR[item.status] }}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <div className="text-base font-medium text-primary">
                  {item.tierLabel} · {item.totalPerDay} analisa/hari
                </div>
                <div className="text-xs text-secondary mt-0.5">
                  Diajukan {fmtDate(item.submittedAt)} · Rp {fmtRupiah(item.totalTransfer)} · berlaku 30 hari
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
