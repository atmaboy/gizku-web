'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertOctagon, Bell, Eye, History, Plus, RotateCcw, XCircle } from 'lucide-react'
import { fmtDateTime, fmtNum } from '@/lib/utils'
import AdminPage from '@/components/admin/shell/AdminPage'
import { Alert, Badge, Button, Card, DataTable, EmptyState, Modal, Pagination, Skeleton, TrackedLink } from '@/components/admin/ui'
import {
  BLAST_STATUS_BADGE, BLAST_STATUS_LABEL, ChannelLabel, type BlastChannel, type BlastStatus,
} from '@/components/admin/blast/shared'

type Blast = {
  id: string
  batchName: string
  channel: BlastChannel
  title: string
  targetType: string
  targetUsernames: string[] | null
  status: BlastStatus
  scheduledAt: string | null
  sentAt: string | null
  sentCount: number
  clickedCount: number
  readCount: number
}

function targetLabel(b: Blast) {
  if (b.targetType === 'all') return 'Seluruh User'
  const n = (b.targetUsernames ?? []).length
  return b.channel === 'email' ? `${n} email` : `${n} username`
}
function whenLabel(b: Blast) {
  return b.scheduledAt && b.status === 'scheduled' ? fmtDateTime(b.scheduledAt) : (b.sentAt ? fmtDateTime(b.sentAt) : '—')
}

export default function BlastHistoryPage() {
  const [blasts, setBlasts] = useState<Blast[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [canceling, setCanceling] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<Blast | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/admin/blast?action=list&page=${p}&per_page=15`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || `Gagal memuat data (${res.status})`)
      setBlasts(d.blasts ?? [])
      setPage(d.page ?? p)
      setTotalPages(d.totalPages ?? 1)
      setTotal(d.total ?? 0)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Gagal memuat riwayat batch')
      setBlasts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1) }, [load])

  async function cancelBlast(id: string) {
    setCanceling(id)
    try {
      const res = await fetch('/api/admin/blast?action=cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json()
      if (res.ok) { toast.success('Batch dibatalkan'); setConfirmCancel(null); load(page) }
      else toast.error(d.error)
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setCanceling(null)
    }
  }

  const errorState = loadError && (
    <EmptyState
      icon={AlertOctagon}
      title={<span className="text-rose-600">{loadError}</span>}
      action={<Button variant="outline" size="sm" icon={RotateCcw} onClick={() => load(page)}>Coba lagi</Button>}
    />
  )
  const emptyState = <EmptyState icon={History} title="Belum ada batch notifikasi." />
  const pagination = !loading && blasts.length > 0 && (
    <Pagination page={page} totalPages={totalPages} onPage={load} label={`Hal. ${page} / ${totalPages} · ${fmtNum(total)} batch`} />
  )

  return (
    <AdminPage title="Blast Notifikasi" breadcrumb={[{ label: 'Blast Notifikasi' }]}>
      <Alert variant="info" icon={Bell} action={<Button icon={Plus} href="/admin/blast/new" className="max-md:hidden">Kirim Baru</Button>}>
        Kirim notifikasi push, Telegram, atau email ke seluruh atau sebagian user Gizku, langsung atau terjadwal. Blast terjadwal dikirim oleh cron tiap jam sesuai jadwal.
      </Alert>

      {/* Desktop / tablet */}
      <Card
        outline="brand"
        icon={History}
        title="Riwayat Batch"
        subtitle={`${fmtNum(total)} batch`}
        className="max-md:hidden"
        noPadding
        footer={pagination || undefined}
      >
        {loadError ? errorState : (
          <DataTable
            rows={blasts}
            rowKey={b => b.id}
            loading={loading}
            striped
            minWidth={1100}
            emptyState={emptyState}
            columns={[
              { key: 'n', header: 'Nama Batch', render: b => (
                <TrackedLink href={`/admin/blast/${b.id}`} className="font-semibold text-link hover:text-green-800 hover:underline block max-w-[220px] truncate">{b.batchName}</TrackedLink>
              ) },
              { key: 'c', header: 'Channel', render: b => <ChannelLabel channel={b.channel} short /> },
              { key: 't', header: 'Notifikasi', className: 'text-bark-700', render: b => <span className="block max-w-[200px] truncate">{b.title || '—'}</span> },
              { key: 'g', header: 'Target', className: 'text-secondary whitespace-nowrap', render: targetLabel },
              { key: 's', header: 'Status', render: b => <Badge variant={BLAST_STATUS_BADGE[b.status]}>{BLAST_STATUS_LABEL[b.status]}</Badge> },
              { key: 'w', header: 'Waktu Pengiriman', className: 'text-secondary whitespace-nowrap', render: whenLabel },
              { key: 'sc', header: 'Terkirim', align: 'right', render: b => fmtNum(b.sentCount) },
              { key: 'cc', header: 'Diklik', align: 'right', render: b => fmtNum(b.clickedCount) },
              { key: 'rc', header: 'Dibaca', align: 'right', render: b => fmtNum(b.readCount) },
              { key: 'a', header: 'Aksi', render: b => b.status === 'scheduled'
                ? <Button variant="outline-danger" size="sm" icon={XCircle} loading={canceling === b.id} onClick={() => setConfirmCancel(b)}>Batalkan</Button>
                : <Button variant="outline-primary" size="sm" icon={Eye} href={`/admin/blast/${b.id}`}>Detail</Button> },
            ]}
          />
        )}
      </Card>

      {/* Mobile */}
      <div className="md:hidden flex flex-col gap-3">
        <Button icon={Plus} href="/admin/blast/new" fullWidth>Kirim Baru</Button>
        <h2 className="text-md font-semibold text-primary mt-1">Riwayat Batch <span className="text-secondary font-normal">({fmtNum(total)})</span></h2>
        {loading && [1, 2, 3].map(i => <Skeleton key={i} className="h-[150px] rounded-md" />)}
        {!loading && loadError && <Card>{errorState}</Card>}
        {!loading && !loadError && blasts.length === 0 && <Card>{emptyState}</Card>}
        {!loading && blasts.map(b => (
          <article key={b.id} className="bg-surface rounded-md shadow-card overflow-hidden">
            <TrackedLink href={`/admin/blast/${b.id}`} className="block px-3.5 pt-3 pb-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-md text-primary min-w-0 truncate">{b.batchName}</p>
                <Badge variant={BLAST_STATUS_BADGE[b.status]} size="sm">{BLAST_STATUS_LABEL[b.status]}</Badge>
              </div>
              <p className="text-sm text-secondary mt-1 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                <ChannelLabel channel={b.channel} short /><span aria-hidden>·</span>{targetLabel(b)}<span aria-hidden>·</span>{whenLabel(b)}
              </p>
            </TrackedLink>
            <div className="grid grid-cols-3 mx-3.5 mb-3 rounded-sm bg-sunken divide-x divide-border text-center">
              {[['Terkirim', b.sentCount], ['Diklik', b.clickedCount], ['Dibaca', b.readCount]].map(([l, v]) => (
                <div key={l as string} className="py-2">
                  <p className="text-md font-bold tabular-nums text-primary">{fmtNum(v as number)}</p>
                  <p className="text-xs text-secondary">{l}</p>
                </div>
              ))}
            </div>
            {b.status === 'scheduled' && (
              <div className="px-3.5 pb-3">
                <Button variant="outline-danger" icon={XCircle} fullWidth loading={canceling === b.id} onClick={() => setConfirmCancel(b)}>Batalkan Jadwal</Button>
              </div>
            )}
          </article>
        ))}
        {pagination}
      </div>

      <Modal
        open={!!confirmCancel}
        onClose={() => !canceling && setConfirmCancel(null)}
        closeDisabled={!!canceling}
        title="Batalkan pengiriman batch ini?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmCancel(null)} disabled={!!canceling}>Tidak</Button>
            <Button variant="danger" icon={XCircle} loading={!!canceling} onClick={() => confirmCancel && cancelBlast(confirmCancel.id)}>Batalkan Jadwal</Button>
          </>
        }
      >
        <p className="text-base text-bark-700 leading-normal">
          Batch <strong className="text-primary">{confirmCancel?.batchName}</strong> tidak akan dikirim oleh cron terjadwal.
        </p>
      </Modal>
    </AdminPage>
  )
}
