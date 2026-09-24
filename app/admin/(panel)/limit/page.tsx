'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  BadgeCheck, CheckCircle2, ClipboardList, Clock, History, Hourglass, Inbox, Info, Landmark, Layers, Plus, Save, Search, ToggleRight,
  Trash2, Wallet, XCircle,
} from 'lucide-react'
import { fmtDateTime, fmtDate, cn } from '@/lib/utils'
import { REJECT_REASONS } from '@/lib/limitReasons'
import AdminPage from '@/components/admin/shell/AdminPage'
import {
  Alert, Avatar, Badge, Button, Card, DataTable, EmptyState, FormField, Input, KeyValue, ListRow, Modal, Pagination, Select,
  Skeleton, SmallBox, Switch, Tabs, Textarea, type BadgeVariant,
} from '@/components/admin/ui'

type Tab = 'requests' | 'ledger' | 'config'
type Status = 'all' | 'pending' | 'approved' | 'rejected'
type ReqStatus = 'pending' | 'approved' | 'rejected'

type Stats = { pendingCount: number; approvedThisMonthCount: number; nominalMasukThisMonth: number }
type RequestListItem = {
  id: string; userId: string; userName: string; tierLabel: string
  totalPerDay: number; totalTransfer: number; submittedAt: string; status: ReqStatus
}
type RequestDetail = RequestListItem & {
  addPerDay: number; price: number; uniqueCode: number; decidedAt: string | null
  proofImageUrl: string
  senderAccountHolder: string | null; senderAccountNumber: string | null; senderBankName: string | null
  note: string | null; rejectReason: string | null; rejectNote: string | null; expiresAt?: string
}
type LedgerRowType = 'usage' | 'tier-approved-reset' | 'expiry-reset' | 'daily-reset'
type LedgerRow = { date: string; type: LedgerRowType; title: string; before: number; after: number; delta: number }
type SearchUserResult = { userId: string; name: string; email: string | null; dailyLimit: number }
type TierDraft = { id?: string; label: string; addPerDay: number; price: number }
type ConfigData = { bankName: string; accountNumber: string; accountHolder: string; featureEnabled: boolean; tiers: TierDraft[] }

const STATUS_LABEL: Record<ReqStatus, string> = { pending: 'Menunggu Review', approved: 'Disetujui', rejected: 'Ditolak' }
const STATUS_BADGE: Record<ReqStatus, BadgeVariant> = { pending: 'warning', approved: 'success', rejected: 'danger' }
const LEDGER_BADGE_LABEL: Record<LedgerRowType, string> = {
  usage: 'Pemakaian', 'tier-approved-reset': 'Disetujui', 'expiry-reset': 'Kedaluwarsa', 'daily-reset': 'Reset Harian',
}
const LEDGER_BADGE: Record<LedgerRowType, BadgeVariant> = {
  usage: 'light', 'tier-approved-reset': 'success', 'expiry-reset': 'secondary', 'daily-reset': 'soft',
}
const FIELD_PLACEHOLDER: Record<'name' | 'email' | 'id', string> = {
  name: 'Cari username...', email: 'Cari email...', id: 'Cari ID user...',
}
const STATUS_FILTERS: { value: Status; label: string; icon: typeof Inbox }[] = [
  { value: 'all', label: 'Semua', icon: Inbox },
  { value: 'pending', label: 'Menunggu', icon: Hourglass },
  { value: 'approved', label: 'Disetujui', icon: CheckCircle2 },
  { value: 'rejected', label: 'Ditolak', icon: XCircle },
]

function fmtRupiah(n: number) {
  return n.toLocaleString('id-ID')
}

export default function AdminLimitPage() {
  const [tab, setTab] = useState<Tab>('requests')

  // ══════════════ Tab A — Request Penambahan Limit ══════════════
  const [stats, setStats] = useState<Stats | null>(null)
  const [statusFilter, setStatusFilter] = useState<Status>('all')
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<RequestListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RequestDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reviewReason, setReviewReason] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [reviewing, setReviewing] = useState<'approve' | 'reject' | null>(null)

  const loadStats = useCallback(() => {
    fetch('/api/admin/limit?action=stats').then(r => r.json()).then(d => setStats(d)).catch(() => {})
  }, [])

  const loadList = useCallback((p: number, status: Status) => {
    setListLoading(true)
    fetch(`/api/admin/limit?action=requests&status=${status}&page=${p}&pageSize=10`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setPage(d.page ?? p); setPageCount(d.pageCount ?? 1); setTotal(d.total ?? 0) })
      .finally(() => setListLoading(false))
  }, [])

  const loadDetail = useCallback((id: string) => {
    setDetailLoading(true)
    setReviewReason(''); setReviewNote('')
    fetch(`/api/admin/limit?action=request&id=${id}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .finally(() => setDetailLoading(false))
  }, [])

  useEffect(() => { loadStats(); loadList(1, 'all') }, [loadStats, loadList])

  function changeStatusFilter(s: Status) {
    setStatusFilter(s)
    setSelectedId(null); setDetail(null)
    loadList(1, s)
  }
  function selectRequest(id: string) {
    setSelectedId(id)
    loadDetail(id)
  }
  function closeRequestModal() {
    setSelectedId(null)
    setDetail(null)
  }

  async function doApprove() {
    if (!detail) return
    setReviewing('approve')
    try {
      const res = await fetch('/api/admin/limit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id: detail.id }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Gagal menyetujui request'); return }
      toast.success('Request disetujui')
      document.dispatchEvent(new Event('admin:counts'))
      loadStats(); loadList(page, statusFilter); loadDetail(detail.id)
    } finally { setReviewing(null) }
  }

  async function doReject() {
    if (!detail || !reviewReason) return
    setReviewing('reject')
    try {
      const res = await fetch('/api/admin/limit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', id: detail.id, reason: reviewReason, note: reviewNote.trim() || undefined }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Gagal menolak request'); return }
      toast.success('Request ditolak')
      document.dispatchEvent(new Event('admin:counts'))
      loadStats(); loadList(page, statusFilter); loadDetail(detail.id)
    } finally { setReviewing(null) }
  }

  // ══════════════ Tab B — Riwayat Limit User ══════════════
  const [searchField, setSearchField] = useState<'name' | 'email' | 'id'>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([])
  const [ledgerUserId, setLedgerUserId] = useState<string | null>(null)
  const [ledgerUserName, setLedgerUserName] = useState<string | null>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerBalance, setLedgerBalance] = useState<number | null>(null)
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([])
  const [ledgerPage, setLedgerPage] = useState(1)
  const [ledgerPageCount, setLedgerPageCount] = useState(1)
  const [ledgerTotal, setLedgerTotal] = useState(0)

  async function runSearch() {
    if (!searchQuery.trim()) return
    setSearching(true); setSearched(true)
    try {
      const res = await fetch(`/api/admin/limit?action=search_users&field=${searchField}&query=${encodeURIComponent(searchQuery.trim())}`)
      const d = await res.json()
      setSearchResults(res.ok && Array.isArray(d) ? d : [])
    } finally { setSearching(false) }
  }

  // Passing no page (or a different userId) resets to page 1 — used whenever
  // a new user is selected; page navigation passes the target page explicitly.
  const loadUserLedger = useCallback((userId: string, p: number = 1) => {
    setLedgerLoading(true)
    setLedgerUserId(userId)
    fetch(`/api/admin/limit?action=user_ledger&userId=${userId}&page=${p}&pageSize=10`)
      .then(r => r.json())
      .then(d => {
        setLedgerUserName(d.userName ?? null)
        setLedgerBalance(d.balance ?? 0)
        setLedgerRows(Array.isArray(d.rows) ? d.rows : [])
        setLedgerPage(d.page ?? p)
        setLedgerPageCount(d.pageCount ?? 1)
        setLedgerTotal(d.total ?? 0)
      })
      .finally(() => setLedgerLoading(false))
  }, [])

  function goToLedgerPage(p: number) {
    if (!ledgerUserId) return
    loadUserLedger(ledgerUserId, p)
  }

  function jumpToLedger(userId: string, userName: string) {
    closeRequestModal()
    setTab('ledger')
    setLedgerUserName(userName)
    loadUserLedger(userId)
  }

  // ══════════════ Tab C — Konfigurasi ══════════════
  const [savedConfig, setSavedConfig] = useState<ConfigData | null>(null)
  const [draft, setDraft] = useState<ConfigData | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/limit?action=config').then(r => r.json()).then(d => {
      const cfg: ConfigData = {
        bankName: d.bankName ?? '', accountNumber: d.accountNumber ?? '', accountHolder: d.accountHolder ?? '',
        featureEnabled: !!d.featureEnabled, tiers: Array.isArray(d.tiers) ? d.tiers : [],
      }
      setSavedConfig(cfg); setDraft(cfg)
    }).finally(() => setConfigLoading(false))
  }, [])

  const dirty = !!(draft && savedConfig) && JSON.stringify(draft) !== JSON.stringify(savedConfig)

  // Mirrors the server-side check in update_config — tiers must be
  // non-decreasing in addPerDay by list position (the same order rendered/
  // edited here and shown to users in the picker).
  const tierOrderErrorIdx = draft
    ? draft.tiers.findIndex((t, i) => i > 0 && t.addPerDay < draft.tiers[i - 1].addPerDay)
    : -1
  const tierOrderError = tierOrderErrorIdx >= 0 && draft
    ? `Tier ke-${tierOrderErrorIdx + 1} (Tambahan/hari: ${draft.tiers[tierOrderErrorIdx].addPerDay}) tidak boleh lebih kecil dari tier sebelumnya (Tambahan/hari: ${draft.tiers[tierOrderErrorIdx - 1].addPerDay}). Urutkan tier dari limit tambahan terkecil ke terbesar.`
    : null

  function updateTierField(idx: number, field: keyof TierDraft, value: string | number) {
    if (!draft) return
    setDraft({ ...draft, tiers: draft.tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t) })
  }
  function addTier() {
    if (!draft || draft.tiers.length >= 10) return
    setDraft({ ...draft, tiers: [...draft.tiers, { label: '', addPerDay: 1, price: 0 }] })
  }
  function removeTier(idx: number) {
    if (!draft || draft.tiers.length <= 1) return
    setDraft({ ...draft, tiers: draft.tiers.filter((_, i) => i !== idx) })
  }

  async function saveConfig() {
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/limit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_config', ...draft }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Gagal menyimpan konfigurasi'); return }
      toast.success('Konfigurasi berhasil disimpan')

      const cfgRes = await fetch('/api/admin/limit?action=config')
      const cfg = await cfgRes.json()
      const fresh: ConfigData = {
        bankName: cfg.bankName ?? '', accountNumber: cfg.accountNumber ?? '', accountHolder: cfg.accountHolder ?? '',
        featureEnabled: !!cfg.featureEnabled, tiers: Array.isArray(cfg.tiers) ? cfg.tiers : [],
      }
      setSavedConfig(fresh); setDraft(fresh)
    } finally { setSaving(false); setConfirmOpen(false) }
  }

  const detailRef = useRef<HTMLDivElement>(null)
  // Below xl the detail card sits under the list — bring it into view on select.
  useEffect(() => {
    if (!selectedId || typeof window === 'undefined') return
    if (window.matchMedia('(max-width: 1279px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedId])

  const filterChips = (
    <div role="group" aria-label="Filter status request" className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 lg:flex-wrap lg:overflow-visible">
      {STATUS_FILTERS.map(s => {
        const active = statusFilter === s.value
        return (
          <button
            key={s.value}
            type="button"
            aria-pressed={active}
            onClick={() => changeStatusFilter(s.value)}
            className={cn(
              'inline-flex items-center gap-1.5 shrink-0 min-h-8 max-lg:min-h-10 px-3 rounded-pill border text-sm font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
              active ? 'bg-brand text-white border-brand' : 'bg-surface text-bark-800 border-border-strong hover:bg-muted',
            )}
          >
            <s.icon size={14} aria-hidden />
            {s.label}
            {s.value === 'pending' && stats && stats.pendingCount > 0 && (
              <span className={cn('min-w-[18px] px-1 rounded-pill text-[11px] font-bold', active ? 'bg-white/25' : 'bg-warning text-primary')}>{stats.pendingCount}</span>
            )}
          </button>
        )
      })}
    </div>
  )

  const detailPanel = (
    <Card
      outline="warning"
      icon={ClipboardList}
      title="Detail Request"
      tools={detail && !detailLoading ? <Badge variant={STATUS_BADGE[detail.status]}>{STATUS_LABEL[detail.status]}</Badge> : undefined}
    >
      {!selectedId && <EmptyState icon={ClipboardList} title="Pilih request untuk melihat detail" description="Klik salah satu request di daftar." className="p-8" />}
      {selectedId && detailLoading && (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-10" /><Skeleton className="h-24" /><Skeleton className="h-[150px]" />
        </div>
      )}
      {selectedId && !detailLoading && detail && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={detail.userName} size={40} />
            <div className="min-w-0">
              <p className="text-md font-semibold text-primary truncate">{detail.userName}</p>
              <p className="text-sm text-secondary">{fmtDateTime(detail.submittedAt)}</p>
            </div>
          </div>

          <KeyValue
            dense
            className="border-y border-border"
            items={[
              { label: 'Paket', value: detail.tierLabel },
              { label: 'Total/hari', value: `${detail.totalPerDay} analisa/hari` },
              { label: 'Nominal', value: <>Rp {fmtRupiah(detail.totalTransfer)} <span className="text-secondary font-normal">(kode {detail.uniqueCode})</span></> },
              ...(detail.status === 'approved' && detail.expiresAt ? [{ label: 'Aktif hingga', value: fmtDate(detail.expiresAt) }] : []),
            ]}
          />

          {detail.note && (
            <p className="text-base text-bark-700 italic bg-sunken rounded-sm p-3">“{detail.note}”</p>
          )}

          {detail.status === 'rejected' && (
            <Alert variant="danger" title={detail.rejectReason ?? 'Ditolak'}>{detail.rejectNote}</Alert>
          )}

          {(detail.senderAccountHolder || detail.senderAccountNumber || detail.senderBankName) && (
            <div>
              <p className="flex items-center gap-2 text-base font-semibold text-primary mb-1"><Landmark size={16} className="text-secondary" aria-hidden />Rekening Pengirim</p>
              <KeyValue
                dense
                items={[
                  ...(detail.senderBankName ? [{ label: 'Bank', value: detail.senderBankName }] : []),
                  ...(detail.senderAccountHolder ? [{ label: 'Nama', value: detail.senderAccountHolder }] : []),
                  ...(detail.senderAccountNumber ? [{ label: 'Nomor', value: <span className="tabular-nums">{detail.senderAccountNumber}</span> }] : []),
                ]}
              />
            </div>
          )}

          <div>
            <p className="text-base font-semibold text-primary mb-1.5">Bukti Transfer</p>
            <a
              href={detail.proofImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka bukti transfer ukuran penuh"
              className="block rounded-sm overflow-hidden border border-border bg-muted hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detail.proofImageUrl} alt="Bukti transfer (klik untuk perbesar)" className="w-full h-[150px] object-cover" />
            </a>
          </div>

          <Button variant="outline" icon={History} fullWidth onClick={() => jumpToLedger(detail.userId, detail.userName)}>
            Lihat Riwayat Limit Lengkap
          </Button>

          {detail.status === 'pending' && (
            <div className="pt-4 border-t border-border flex flex-col gap-3">
              <p className="text-base font-semibold text-primary">Review Request</p>
              <FormField label="Alasan penolakan" htmlFor="reject-reason" help="Wajib diisi hanya bila menolak.">
                <Select id="reject-reason" value={reviewReason} onChange={e => setReviewReason(e.target.value)}>
                  <option value="">Pilih alasan…</option>
                  {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
              </FormField>
              <FormField label="Catatan" htmlFor="reject-note">
                <Textarea id="reject-note" value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Catatan tambahan (opsional)" rows={2} />
              </FormField>
              <div className="flex gap-2">
                <Button variant="outline-danger" icon={XCircle} className="flex-1" onClick={doReject} disabled={!reviewReason || reviewing !== null} loading={reviewing === 'reject'}>Tolak</Button>
                <Button icon={BadgeCheck} className="flex-1" onClick={doApprove} disabled={reviewing !== null} loading={reviewing === 'approve'}>Setujui</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )

  return (
    <AdminPage title="Request Limit" breadcrumb={[{ label: 'Request Limit' }]}>
      <Alert variant="light">
        Review pengajuan penambahan limit analisa harian, riwayat limit user, dan konfigurasi rekening/tier/fitur.
      </Alert>

      <section className="bg-surface rounded-md shadow-card overflow-hidden">
        <div className="px-4 pt-2.5 bg-sunken border-b border-border max-lg:p-2">
          <Tabs
            variant="tabs"
            ariaLabel="Menu Request Limit"
            idPrefix="limit"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'requests', label: 'Request Penambahan Limit', mobileLabel: 'Request' },
              { value: 'ledger', label: 'Riwayat Limit User', mobileLabel: 'Riwayat' },
              { value: 'config', label: 'Konfigurasi', mobileLabel: 'Konfigurasi' },
            ]}
          />
        </div>

        <div className="p-5 max-lg:p-3 bg-sunken" role="tabpanel" id={`limit-panel-${tab}`} aria-labelledby={`limit-tab-${tab}`}>
          {/* ═══════════ TAB A ═══════════ */}
          {tab === 'requests' && (
            <div className="flex flex-col gap-5 max-lg:gap-3">
              <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-lg:gap-3">
                <SmallBox tone="warning" icon={Hourglass} label="Menunggu Review" value={stats?.pendingCount ?? '—'} />
                <SmallBox tone="brand" icon={CheckCircle2} label="Disetujui Bulan Ini" value={stats?.approvedThisMonthCount ?? '—'} />
                <SmallBox tone="clay" icon={Wallet} label="Nominal Masuk Bulan Ini" value={stats ? `Rp ${fmtRupiah(stats.nominalMasukThisMonth)}` : '—'} className="max-lg:col-span-2" valueClassName="lg:text-[28px] xl:text-[34px]" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-3 items-start">
                <Card
                  icon={Inbox}
                  title="Daftar Request"
                  subtitle={`${total} data`}
                  className="xl:col-span-7"
                  noPadding
                  footer={!listLoading && items.length > 0 ? (
                    <Pagination page={page} totalPages={pageCount} onPage={p => loadList(p, statusFilter)} label={`${page}/${pageCount} · ${total} data`} />
                  ) : undefined}
                >
                  <div className="px-4 py-3 border-b border-border">{filterChips}</div>
                  <div className="max-lg:hidden">
                    <DataTable
                      rows={items}
                      rowKey={r => r.id}
                      loading={listLoading}
                      emptyState={<EmptyState icon={Inbox} title="Belum ada request." />}
                      rowClassName={r => selectedId === r.id ? 'bg-green-50 hover:bg-green-50' : undefined}
                      columns={[
                        { key: 'u', header: 'User', render: r => (
                          <button
                            type="button"
                            onClick={() => selectRequest(r.id)}
                            aria-pressed={selectedId === r.id}
                            className={cn('flex items-center gap-2 text-left hover:text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-xs', r.status === 'pending' ? 'font-bold' : 'font-medium')}
                          >
                            <Avatar name={r.userName} size={28} />{r.userName}
                          </button>
                        ) },
                        { key: 'p', header: 'Paket', className: 'text-secondary', render: r => `${r.tierLabel} · ${r.totalPerDay}/hari` },
                        { key: 'n', header: 'Nominal', align: 'right', className: 'font-semibold whitespace-nowrap', render: r => `Rp ${fmtRupiah(r.totalTransfer)}` },
                        { key: 't', header: 'Tanggal', className: 'text-secondary whitespace-nowrap', render: r => fmtDateTime(r.submittedAt) },
                        { key: 's', header: 'Status', render: r => <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
                      ]}
                    />
                  </div>
                  <div className="lg:hidden">
                    {listLoading && <div className="p-4 flex flex-col gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>}
                    {!listLoading && items.length === 0 && <EmptyState icon={Inbox} title="Belum ada request." />}
                    {!listLoading && items.map(r => (
                      <ListRow
                        key={r.id}
                        onClick={() => selectRequest(r.id)}
                        className={selectedId === r.id ? 'bg-green-50' : undefined}
                        leading={<Avatar name={r.userName} size={36} />}
                        title={r.userName}
                        meta={`${r.tierLabel} · ${fmtDateTime(r.submittedAt)}`}
                        trailing={
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-semibold tabular-nums">Rp {fmtRupiah(r.totalTransfer)}</span>
                            <Badge variant={STATUS_BADGE[r.status]} size="sm">{STATUS_LABEL[r.status]}</Badge>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </Card>

                <div ref={detailRef} className="xl:col-span-5 scroll-mt-20">{detailPanel}</div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB B ═══════════ */}
          {tab === 'ledger' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-3 items-start">
              <Card icon={Search} title="Cari User" className="xl:col-span-4" noPadding>
                <form
                  className="p-4 flex flex-col gap-2.5"
                  onSubmit={e => { e.preventDefault(); runSearch() }}
                  role="search"
                >
                  <div className="flex gap-2">
                    <Select aria-label="Cari berdasarkan" value={searchField} onChange={e => setSearchField(e.target.value as 'name' | 'email' | 'id')} className="w-[110px] shrink-0">
                      <option value="name">Nama</option>
                      <option value="email">Email</option>
                      <option value="id">ID User</option>
                    </Select>
                    <Input aria-label="Kata kunci" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={FIELD_PLACEHOLDER[searchField]} />
                  </div>
                  <Button type="submit" icon={Search} fullWidth disabled={!searchQuery.trim() || searching} loading={searching}>
                    {searching ? 'Mencari…' : 'Cari'}
                  </Button>
                </form>
                {!searched && <p className="text-sm text-secondary text-center px-4 pb-4">Ketik lalu klik Cari untuk menemukan user.</p>}
                {searched && !searching && searchResults.length === 0 && (
                  <p className="text-sm text-secondary text-center px-4 pb-4">Tidak ada user yang cocok.</p>
                )}
                {searched && !searching && searchResults.length > 0 && (
                  <ul className="list-none m-0 px-3 pb-3 flex flex-col gap-2">
                    {searchResults.map(u => {
                      const active = ledgerUserId === u.userId
                      return (
                        <li key={u.userId}>
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => { setLedgerUserName(u.name); loadUserLedger(u.userId, 1) }}
                            className={cn(
                              'w-full text-left px-3 py-2.5 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                              active ? 'border-2 border-brand bg-green-50' : 'border-border hover:bg-muted',
                            )}
                          >
                            <p className="text-base font-semibold text-primary">{u.name}</p>
                            <p className="text-sm text-secondary truncate">{u.email ?? '—'} · {u.userId}</p>
                            <p className="text-xs text-secondary mt-0.5">Saldo {u.dailyLimit}/hari</p>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>

              <Card
                icon={History}
                title={ledgerUserName ?? 'Riwayat Limit'}
                subtitle="Riwayat pemakaian & penambahan limit"
                className="xl:col-span-8"
                noPadding
                tools={ledgerUserId && !ledgerLoading ? (
                  <span className="text-sm text-secondary">Saldo saat ini <strong className="text-lg text-green-700 tabular-nums">{ledgerBalance} foto</strong></span>
                ) : undefined}
                footer={ledgerUserId && !ledgerLoading && ledgerRows.length > 0 ? (
                  <Pagination page={ledgerPage} totalPages={ledgerPageCount} onPage={goToLedgerPage} label={`${ledgerPage}/${ledgerPageCount} · ${ledgerTotal} data`} />
                ) : undefined}
              >
                {!ledgerUserId && (
                  <EmptyState icon={Search} title="Belum ada user dipilih" description="Cari dan pilih user di panel kiri untuk melihat riwayat limitnya." />
                )}
                {ledgerUserId && (
                  <DataTable
                    rows={ledgerRows}
                    rowKey={(_, i) => String(i)}
                    loading={ledgerLoading}
                    striped
                    minWidth={560}
                    emptyState={<EmptyState icon={Clock} title="Belum ada riwayat untuk user ini." />}
                    columns={[
                      { key: 'd', header: 'Tanggal', className: 'text-secondary whitespace-nowrap', render: r => fmtDate(r.date) },
                      { key: 'k', header: 'Kejadian', render: r => (
                        <span className="inline-flex items-center gap-2 flex-wrap"><Badge variant={LEDGER_BADGE[r.type]} size="sm">{LEDGER_BADGE_LABEL[r.type]}</Badge>{r.title}</span>
                      ) },
                      { key: 'b', header: 'Sebelum', align: 'right', className: 'text-secondary', render: r => r.before },
                      { key: 'c', header: 'Perubahan', align: 'right', render: r => (
                        <span className={cn('font-semibold', r.delta >= 0 ? 'text-green-700' : 'text-bark-800')}>{r.delta >= 0 ? `+${r.delta}` : `−${Math.abs(r.delta)}`}</span>
                      ) },
                      { key: 'a', header: 'Sesudah', align: 'right', className: 'font-semibold', render: r => r.after },
                    ]}
                  />
                )}
              </Card>
            </div>
          )}

          {/* ═══════════ TAB C ═══════════ */}
          {tab === 'config' && configLoading && (
            <div className="flex flex-col gap-4"><Skeleton className="h-40 rounded-md" /><Skeleton className="h-60 rounded-md" /></div>
          )}
          {tab === 'config' && draft && !configLoading && (
            <div className="flex flex-col gap-5 max-lg:gap-3">
              <Card icon={Landmark} title="Rekening Tujuan Transfer">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <FormField label="Nama Bank" htmlFor="cfg-bank">
                    <Input id="cfg-bank" value={draft.bankName} onChange={e => setDraft({ ...draft, bankName: e.target.value })} placeholder="mis. BCA" />
                  </FormField>
                  <FormField label="Nomor Rekening Tujuan" htmlFor="cfg-acc">
                    <Input id="cfg-acc" inputMode="numeric" value={draft.accountNumber} onChange={e => setDraft({ ...draft, accountNumber: e.target.value })} placeholder="mis. 1234567890" />
                  </FormField>
                  <FormField label="Atas Nama Rekening Tujuan" htmlFor="cfg-holder">
                    <Input id="cfg-holder" value={draft.accountHolder} onChange={e => setDraft({ ...draft, accountHolder: e.target.value })} placeholder="mis. PT Gizku Sehat Indonesia" />
                  </FormField>
                </div>
              </Card>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-3 items-start">
                <Card
                  icon={Layers}
                  title="Tier / Paket Penambahan Limit"
                  subtitle={`${draft.tiers.length}/10 tier · limit dasar gratis 3 analisa/hari`}
                  className="xl:col-span-8"
                  noPadding
                  footer={
                    <Button variant="outline" size="sm" icon={Plus} onClick={addTier} disabled={draft.tiers.length >= 10}>Tambah Tier</Button>
                  }
                >
                  {/* Desktop: inline-editable table */}
                  <div className="max-lg:hidden overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th scope="col" className="px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border text-left w-10">#</th>
                          <th scope="col" className="px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border text-left">Nama Tier</th>
                          <th scope="col" className="px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border text-left w-[150px]">Tambahan/hari</th>
                          <th scope="col" className="px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border text-left w-[170px]">Harga (Rp)</th>
                          <th scope="col" className="px-3 py-2.5 border-b-2 border-border w-12"><span className="sr-only">Aksi</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {draft.tiers.map((t, i) => (
                          <tr key={t.id ?? `new-${i}`} className="align-top">
                            <td className="px-3 py-2 border-t border-border text-secondary tabular-nums pt-4">{i + 1}</td>
                            <td className="px-3 py-2 border-t border-border">
                              <Input aria-label={`Nama tier ${i + 1}`} value={t.label} onChange={e => updateTierField(i, 'label', e.target.value)} />
                              {i === tierOrderErrorIdx && <p className="text-sm text-rose-600 mt-1.5">{tierOrderError}</p>}
                            </td>
                            <td className="px-3 py-2 border-t border-border">
                              <Input aria-label={`Tambahan per hari tier ${i + 1}`} type="number" min={1} value={t.addPerDay} invalid={i === tierOrderErrorIdx} onChange={e => updateTierField(i, 'addPerDay', Number(e.target.value))} />
                            </td>
                            <td className="px-3 py-2 border-t border-border">
                              <Input aria-label={`Harga tier ${i + 1}`} type="number" min={0} step={1000} value={t.price} onChange={e => updateTierField(i, 'price', Number(e.target.value))} />
                            </td>
                            <td className="px-3 py-2 border-t border-border">
                              <Button variant="outline-danger" size="sm" aria-label={`Hapus tier ${i + 1}`} title="Hapus tier" onClick={() => removeTier(i)} disabled={draft.tiers.length <= 1} className="px-2 mt-1"><Trash2 size={14} aria-hidden /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile: one card per tier */}
                  <div className="lg:hidden p-3 flex flex-col gap-3">
                    {draft.tiers.map((t, i) => (
                      <div key={t.id ?? `new-${i}`} className="border border-border rounded-md p-3 bg-surface">
                        <div className="flex items-end gap-2">
                          <FormField label={`Tier ${i + 1}`} htmlFor={`tier-m-${i}`} className="flex-1">
                            <Input id={`tier-m-${i}`} value={t.label} onChange={e => updateTierField(i, 'label', e.target.value)} />
                          </FormField>
                          <Button variant="outline-danger" aria-label={`Hapus tier ${i + 1}`} onClick={() => removeTier(i)} disabled={draft.tiers.length <= 1} className="px-3 shrink-0"><Trash2 size={16} aria-hidden /></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <FormField label="Tambahan/hari" htmlFor={`tier-m-add-${i}`}>
                            <Input id={`tier-m-add-${i}`} type="number" inputMode="numeric" min={1} value={t.addPerDay} invalid={i === tierOrderErrorIdx} onChange={e => updateTierField(i, 'addPerDay', Number(e.target.value))} />
                          </FormField>
                          <FormField label="Harga (Rp)" htmlFor={`tier-m-price-${i}`}>
                            <Input id={`tier-m-price-${i}`} type="number" inputMode="numeric" min={0} step={1000} value={t.price} onChange={e => updateTierField(i, 'price', Number(e.target.value))} />
                          </FormField>
                        </div>
                        {i === tierOrderErrorIdx && <p className="text-sm text-rose-600 mt-1.5">{tierOrderError}</p>}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card icon={ToggleRight} title="Menu Ajukan Limit Tambahan" className="xl:col-span-4">
                  <Switch
                    checked={draft.featureEnabled}
                    onChange={v => setDraft({ ...draft, featureEnabled: v })}
                    label={draft.featureEnabled ? 'Aktif' : 'Nonaktif'}
                    description="Saat OFF, user melihat status “Coming Soon” dan tombol Ajukan nonaktif."
                  />
                </Card>
              </div>

              {tierOrderError && (
                <Alert variant="danger" title="Urutan tier tidak valid.">Perbaiki urutan tier sebelum menyimpan.</Alert>
              )}
              {!tierOrderError && dirty && (
                <Alert
                  variant="warning"
                  icon={Info}
                  action={<Button icon={Save} onClick={() => setConfirmOpen(true)} disabled={saving} className="max-sm:w-full">Simpan Konfigurasi</Button>}
                >
                  Ada perubahan belum disimpan.
                </Alert>
              )}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        closeDisabled={saving}
        title="Simpan perubahan konfigurasi?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>Batal</Button>
            <Button icon={Save} onClick={saveConfig} loading={saving}>{saving ? 'Menyimpan…' : 'Ya, Simpan'}</Button>
          </>
        }
      >
        <p className="text-base text-bark-700 leading-normal">
          Perubahan rekening tujuan, tier paket, atau status fitur akan langsung berlaku bagi semua user. Pastikan data sudah benar sebelum menyimpan.
        </p>
      </Modal>
    </AdminPage>
  )
}
