'use client'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Inbox, Info, RefreshCw, Search, Trash2 } from 'lucide-react'
import AdminPage from '@/components/admin/shell/AdminPage'
import {
  Alert, Avatar, Button, Card, CardTool, EmptyState, Input, InputGroup, Modal, Pagination, Skeleton, TrackedLink,
} from '@/components/admin/ui'
import {
  FOLDERS, FolderCard, SourcePill, StatusBadge, countByStatus, displayName, type FolderKey, type ReportRow,
} from '@/components/admin/reports/shared'
import { fmtRelativeID, cn } from '@/lib/utils'

const PAGE_SIZE = 8

function isFolder(v: string | null): v is FolderKey {
  return !!v && FOLDERS.some(f => f.key === v)
}

function ReportsInbox() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status')

  const [reports, setReports] = useState<ReportRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FolderKey>(isFolder(initialStatus) ? initialStatus : 'all')
  const [page, setPage] = useState(1)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=reports')
      const data = await res.json()
      if (res.ok) setReports(data.reports ?? [])
      else toast.error(data.error ?? 'Gagal memuat daftar laporan')
    } catch {
      toast.error('Gagal memuat daftar laporan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReports() }, [loadReports])

  async function refresh() {
    setRefreshing(true)
    await loadReports()
    document.dispatchEvent(new Event('admin:counts'))
    setRefreshing(false)
  }

  const filtered = useMemo(() => {
    if (!reports) return []
    const q = query.trim().toLowerCase()
    return reports.filter(r => {
      const matchesQuery = !q || (r.username ?? '').toLowerCase().includes(q) || (r.fromEmail ?? '').toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [reports, query, statusFilter])

  const counts = useMemo(() => countByStatus(reports), [reports])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE)
  const rangeLabel = filtered.length === 0
    ? '0 laporan'
    : `Menampilkan ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, filtered.length)} dari ${filtered.length} laporan`

  function changeFilter(key: FolderKey) {
    setStatusFilter(key)
    setPage(1)
    const url = key === 'all' ? '/admin/reports' : `/admin/reports?status=${key}`
    router.replace(url, { scroll: false })
  }
  function changeQuery(v: string) {
    setQuery(v)
    setPage(1)
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin?action=delete_report', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDeleteId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menghapus laporan'); return }
      setReports(rs => rs?.filter(r => r.id !== confirmDeleteId) ?? rs)
      document.dispatchEvent(new Event('admin:counts'))
      toast.success('Laporan dihapus')
    } catch {
      toast.error('Gagal menghapus laporan')
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  const summary = loading ? 'Memuat…' : `${counts.all} laporan total · ${counts.open} perlu dibalas`
  const detailHref = (id: string) => `/admin/reports/${id}`
  const deleteTarget = reports?.find(r => r.id === confirmDeleteId)

  const searchBox = (id: string, className?: string) => (
    <InputGroup prepend={<Search size={16} aria-hidden />} className={className}>
      <Input id={id} type="search" aria-label="Cari username atau email" placeholder="Cari username atau email…" value={query} onChange={e => changeQuery(e.target.value)} />
    </InputGroup>
  )

  const empty = <EmptyState icon={Inbox} title="Tidak ada laporan yang cocok." />

  return (
    <AdminPage title="Laporan & Helpdesk" breadcrumb={[{ label: 'Laporan & Helpdesk' }]}>
      {/* ── Desktop: AdminLTE mailbox ── */}
      <div className="max-lg:hidden grid grid-cols-12 gap-5 items-start">
        <FolderCard counts={counts} active={statusFilter} onSelect={changeFilter} className="col-span-3" />

        <Card
          outline="brand"
          icon={Inbox}
          title="Kotak Masuk"
          subtitle={summary}
          className="col-span-9"
          noPadding
          tools={searchBox('reports-q', 'w-[280px]')}
        >
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <CardTool icon={RefreshCw} label="Muat ulang" onClick={refresh} disabled={refreshing} className={refreshing ? '[&>svg]:animate-spin' : undefined} />
            <div className="flex-1" />
            <span className="text-sm text-secondary">{loading ? '' : rangeLabel}</span>
            <div className="flex">
              <Button variant="outline" size="sm" aria-label="Halaman sebelumnya" className="rounded-r-none px-2" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} aria-hidden /></Button>
              <Button variant="outline" size="sm" aria-label="Halaman berikutnya" className="rounded-l-none -ml-px px-2" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} aria-hidden /></Button>
            </div>
          </div>

          {loading ? (
            <div className="p-4 flex flex-col gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : filtered.length === 0 ? empty : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <caption className="sr-only">Kotak masuk laporan</caption>
                <thead>
                  <tr>
                    {['Pengirim', 'Pesan', 'Sumber', 'Status'].map(h => (
                      <th key={h} scope="col" className="px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border text-left whitespace-nowrap">{h}</th>
                    ))}
                    <th scope="col" className="px-3 py-2.5 border-b-2 border-border w-12"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(r => {
                    const unread = r.status === 'open'
                    return (
                      <tr key={r.id} className="hover:bg-muted/60 transition-colors">
                        <td className="px-3 py-2.5 border-t border-border align-middle">
                          <TrackedLink href={detailHref(r.id)} className="flex items-center gap-2.5 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-xs">
                            <Avatar name={displayName(r)} size={32} />
                            <span className="min-w-0">
                              <span className={cn('block text-base truncate max-w-[200px]', unread ? 'font-bold text-primary' : 'font-medium text-primary')}>{displayName(r)}</span>
                              <span className="block text-xs text-secondary whitespace-nowrap">#{r.ticketNumber} · {fmtRelativeID(r.createdAt)}</span>
                            </span>
                          </TrackedLink>
                        </td>
                        <td className="px-3 py-2.5 border-t border-border align-middle">
                          <TrackedLink href={detailHref(r.id)} tabIndex={-1} className={cn('block truncate max-w-[420px] text-base', unread ? 'font-semibold text-primary' : 'text-bark-700')}>
                            {r.message}
                          </TrackedLink>
                        </td>
                        <td className="px-3 py-2.5 border-t border-border align-middle"><SourcePill source={r.source} /></td>
                        <td className="px-3 py-2.5 border-t border-border align-middle"><StatusBadge status={r.status} /></td>
                        <td className="px-3 py-2.5 border-t border-border align-middle text-right">
                          <CardTool icon={Trash2} label={`Hapus laporan #${r.ticketNumber}`} onClick={() => setConfirmDeleteId(r.id)} className="hover:text-rose-600" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── Mobile ── */}
      <div className="lg:hidden flex flex-col gap-3">
        <p className="text-base text-secondary">{summary}</p>
        {searchBox('reports-q-m')}
        <div role="group" aria-label="Filter status laporan" className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FOLDERS.map(f => {
            const active = statusFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => changeFilter(f.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 shrink-0 min-h-10 px-3 rounded-pill border text-base font-medium whitespace-nowrap',
                  active ? 'bg-brand text-white border-brand' : 'bg-surface text-bark-800 border-border-strong',
                )}
              >
                {f.label} <span className={cn('tabular-nums', active ? 'text-white/85' : 'text-secondary')}>{counts[f.key]}</span>
              </button>
            )
          })}
        </div>

        {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-md" />)}
        {!loading && filtered.length === 0 && <Card>{empty}</Card>}
        {!loading && pageItems.map(r => (
          <article key={r.id} className="bg-surface rounded-md shadow-card overflow-hidden">
            <TrackedLink href={detailHref(r.id)} className="flex items-start gap-3 px-3.5 pt-3 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500">
              <Avatar name={displayName(r)} size={38} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn('text-md truncate', r.status === 'open' ? 'font-bold' : 'font-semibold')}>{displayName(r)}</span>
                  <span className="text-xs text-secondary whitespace-nowrap">{fmtRelativeID(r.createdAt)}</span>
                </span>
                <span className="block text-base text-bark-700 mt-0.5 line-clamp-2">{r.message}</span>
              </span>
            </TrackedLink>
            <div className="flex items-center gap-2 px-3.5 pb-2.5 pl-[64px]">
              <span className="text-xs text-secondary">#{r.ticketNumber}</span>
              <SourcePill source={r.source} />
              <StatusBadge status={r.status} size="sm" />
              <CardTool icon={Trash2} label={`Hapus laporan #${r.ticketNumber}`} onClick={() => setConfirmDeleteId(r.id)} className="ml-auto" />
            </div>
          </article>
        ))}
        {!loading && filtered.length > 0 && (
          <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} label={rangeLabel} />
        )}
      </div>

      <Alert variant="light" icon={Info}>
        Kotak masuk ini menggabungkan laporan dari dalam aplikasi dan email yang masuk ke <strong>support@gizku.com</strong>. Balasan langsung saat ini tersedia untuk laporan dari email.
      </Alert>

      <Modal
        open={!!confirmDeleteId}
        onClose={() => !deleting && setConfirmDeleteId(null)}
        closeDisabled={deleting}
        title="Hapus laporan ini?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Batal</Button>
            <Button variant="danger" icon={Trash2} loading={deleting} onClick={confirmDelete}>Hapus</Button>
          </>
        }
      >
        <p className="text-base text-bark-700 leading-normal">
          Laporan dari <strong className="text-primary">{deleteTarget ? displayName(deleteTarget) : '?'}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
        </p>
      </Modal>
    </AdminPage>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsInbox />
    </Suspense>
  )
}
