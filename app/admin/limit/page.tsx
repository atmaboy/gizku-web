'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fmtDateTime, fmtDate } from '@/lib/utils'
import { REJECT_REASONS } from '@/lib/limitReasons'

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
  senderAccountHolder: string | null; senderAccountNumber: string | null
  note: string | null; rejectReason: string | null; rejectNote: string | null; expiresAt?: string
}
type LedgerRowType = 'usage' | 'tier-approved-reset' | 'expiry-reset' | 'daily-reset'
type LedgerRow = { date: string; type: LedgerRowType; title: string; before: number; after: number; delta: number }
type SearchUserResult = { userId: string; name: string; email: string | null; dailyLimit: number }
type TierDraft = { id?: string; label: string; addPerDay: number; price: number }
type ConfigData = { bankName: string; accountNumber: string; accountHolder: string; featureEnabled: boolean; tiers: TierDraft[] }

const STATUS_LABEL: Record<ReqStatus, string> = { pending: 'Menunggu Review', approved: 'Disetujui', rejected: 'Ditolak' }
const STATUS_STYLE: Record<ReqStatus, string> = {
  pending: 'bg-amber-50 text-amber-600',
  approved: 'bg-[#D4F5E4] text-[#1F9D57]',
  rejected: 'bg-red-50 text-red-600',
}
const LEDGER_BADGE_LABEL: Record<LedgerRowType, string> = {
  usage: 'Pemakaian', 'tier-approved-reset': 'Disetujui', 'expiry-reset': 'Kedaluwarsa', 'daily-reset': 'Reset Harian',
}
const LEDGER_BADGE_STYLE: Record<LedgerRowType, string> = {
  usage: 'bg-[#F3F4F6] text-[#6B7280]',
  'tier-approved-reset': 'bg-[#D4F5E4] text-[#1F9D57]',
  'expiry-reset': 'bg-amber-50 text-amber-600',
  'daily-reset': 'bg-[#F3F4F6] text-[#9CA3AF]',
}
const FIELD_PLACEHOLDER: Record<'name' | 'email' | 'id', string> = {
  name: 'Cari username...', email: 'Cari email...', id: 'Cari ID user...',
}

function fmtRupiah(n: number) {
  return n.toLocaleString('id-ID')
}

const inputCls = "w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
        active ? 'bg-white text-[#111827] shadow-[0_1px_4px_rgba(16,24,40,0.06)]' : 'text-[#6B7280] hover:text-[#111827]'
      }`}
    >
      {label}
    </button>
  )
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-4">
      <div className="text-[11px] text-[#9CA3AF] mb-1.5">{label}</div>
      <div className="text-xl font-bold text-[#111827] tabular-nums">{value}</div>
    </div>
  )
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

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Request Kenaikan Limit Analisa</h1>
        <p className="text-sm text-[#6B7280] mt-1">Review pengajuan penambahan limit analisa harian, riwayat limit user, dan konfigurasi rekening/tier/fitur.</p>
        <div className="inline-flex gap-0.5 bg-[#F3F4F6] p-0.5 rounded-xl mt-5">
          <Pill label="Request Penambahan Limit" active={tab === 'requests'} onClick={() => setTab('requests')} />
          <Pill label="Riwayat Limit User" active={tab === 'ledger'} onClick={() => setTab('ledger')} />
          <Pill label="Konfigurasi" active={tab === 'config'} onClick={() => setTab('config')} />
        </div>
      </div>

      {/* ═══════════ TAB A ═══════════ */}
      {tab === 'requests' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile label="Menunggu Review" value={stats?.pendingCount ?? '—'} />
            <StatTile label="Disetujui Bulan Ini" value={stats?.approvedThisMonthCount ?? '—'} />
            <StatTile label="Nominal Masuk Bulan Ini" value={stats ? `Rp ${fmtRupiah(stats.nominalMasukThisMonth)}` : '—'} />
          </div>

          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as Status[]).map(s => (
                  <button
                    key={s}
                    onClick={() => changeStatusFilter(s)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                      statusFilter === s
                        ? 'bg-[#111827] text-white border-[#111827]'
                        : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {s === 'all' ? 'Semua' : s === 'pending' ? 'Menunggu' : s === 'approved' ? 'Disetujui' : 'Ditolak'}
                  </button>
                ))}
              </div>

              <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl overflow-x-auto shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
                <table className="w-full text-sm">
                  <thead className="bg-[#F9FAFB] text-[#6B7280] text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3">User</th>
                      <th className="text-left px-4 py-3">Paket</th>
                      <th className="text-right px-4 py-3">Nominal</th>
                      <th className="text-left px-4 py-3">Tanggal</th>
                      <th className="text-left px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!listLoading && items.map(item => (
                      <tr
                        key={item.id}
                        onClick={() => selectRequest(item.id)}
                        className={`cursor-pointer ${selectedId === item.id ? 'bg-[#EAFBF1]' : 'bg-white hover:bg-[#F9FAFB]'}`}
                      >
                        <td className="px-4 py-3 font-medium text-[#111827]">{item.userName}</td>
                        <td className="px-4 py-3 text-[#6B7280]">{item.tierLabel} · {item.totalPerDay}/hari</td>
                        <td className="px-4 py-3 tabular-nums text-right text-[#111827]">Rp {fmtRupiah(item.totalTransfer)}</td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtDateTime(item.submittedAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {listLoading && <div className="text-center py-12 text-[#9CA3AF] text-sm">Memuat…</div>}
                {!listLoading && items.length === 0 && <div className="text-center py-12 text-[#9CA3AF] text-sm">Belum ada request.</div>}
              </div>

              {!listLoading && items.length > 0 && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-[#6B7280] tabular-nums">{page}/{pageCount} · {total} data</span>
                  <div className="flex items-center gap-2">
                    {page > 1 && (
                      <button onClick={() => loadList(1, statusFilter)} className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition">Kembali ke Awal</button>
                    )}
                    <button disabled={page <= 1} onClick={() => loadList(page - 1, statusFilter)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-40">← Sebelumnya</button>
                    <button disabled={page >= pageCount} onClick={() => loadList(page + 1, statusFilter)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-40">Berikutnya →</button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* ── REQUEST DETAIL MODAL ── */}
      {selectedId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
          onClick={closeRequestModal}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[88vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 text-base truncate">{detail?.userName ?? 'Detail Request'}</h2>
                {detail && <p className="text-xs text-gray-400 mt-0.5">{detail.tierLabel}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {detail && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[detail.status]}`}>{STATUS_LABEL[detail.status]}</span>
                )}
                <button
                  onClick={closeRequestModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {detailLoading && <div className="text-center py-8 text-sm text-[#9CA3AF]">Memuat…</div>}
              {!detailLoading && detail && (
                <div className="space-y-3.5">
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between"><span className="text-[#9CA3AF]">Paket</span><span className="text-[#111827] font-medium">{detail.tierLabel}</span></div>
                    <div className="flex justify-between"><span className="text-[#9CA3AF]">Total/hari</span><span className="text-[#111827] font-medium">{detail.totalPerDay} analisa/hari</span></div>
                    <div className="flex justify-between"><span className="text-[#9CA3AF]">Nominal</span><span className="text-[#111827] font-medium">Rp {fmtRupiah(detail.totalTransfer)} (kode {detail.uniqueCode})</span></div>
                    <div className="flex justify-between"><span className="text-[#9CA3AF]">Tanggal</span><span className="text-[#111827] font-medium">{fmtDateTime(detail.submittedAt)}</span></div>
                    {detail.status === 'approved' && detail.expiresAt && (
                      <div className="flex justify-between"><span className="text-[#9CA3AF]">Aktif hingga</span><span className="text-[#111827] font-medium">{fmtDate(detail.expiresAt)}</span></div>
                    )}
                  </div>

                  {detail.note && (
                    <div className="text-xs text-[#6B7280] italic bg-[#F9FAFB] rounded-lg p-2.5">&ldquo;{detail.note}&rdquo;</div>
                  )}

                  {detail.status === 'rejected' && (
                    <div className="text-xs bg-red-50 rounded-lg p-2.5 space-y-1">
                      <div className="font-semibold text-red-600">{detail.rejectReason}</div>
                      {detail.rejectNote && <div className="text-red-600">{detail.rejectNote}</div>}
                    </div>
                  )}

                  {(detail.senderAccountHolder || detail.senderAccountNumber) && (
                    <div className="text-xs bg-[#EAFBF1] rounded-lg p-2.5 space-y-1">
                      <p className="text-[11px] font-semibold text-[#1F9D57] uppercase tracking-wide mb-1">Rekening Pengirim</p>
                      {detail.senderAccountHolder && (
                        <div className="flex justify-between gap-2"><span className="text-[#4B7A63]">Nama</span><span className="text-[#111827] font-medium text-right">{detail.senderAccountHolder}</span></div>
                      )}
                      {detail.senderAccountNumber && (
                        <div className="flex justify-between gap-2"><span className="text-[#4B7A63]">Nomor</span><span className="text-[#111827] font-medium text-right">{detail.senderAccountNumber}</span></div>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] text-[#9CA3AF] mb-1.5">Bukti Transfer</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detail.proofImageUrl} alt="Bukti transfer" className="w-full h-auto rounded-lg ring-1 ring-[#E5E7EB]" />
                  </div>

                  <button
                    onClick={() => jumpToLedger(detail.userId, detail.userName)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition min-h-[40px]"
                  >
                    Lihat Riwayat Limit Lengkap
                  </button>

                  {detail.status === 'pending' && (
                    <div className="pt-3 border-t border-[#F3F4F6] space-y-2.5">
                      <p className="text-xs font-semibold text-[#111827]">Review Request</p>
                      <select value={reviewReason} onChange={e => setReviewReason(e.target.value)} className={inputCls}>
                        <option value="">Pilih alasan…</option>
                        {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <textarea
                        value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                        placeholder="Catatan tambahan (opsional)" rows={2}
                        className={`${inputCls} resize-none`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={doReject}
                          disabled={!reviewReason || reviewing !== null}
                          className="flex-1 text-sm font-semibold px-3 py-2.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
                        >
                          {reviewing === 'reject' ? '…' : 'Tolak'}
                        </button>
                        <button
                          onClick={doApprove}
                          disabled={reviewing !== null}
                          className="flex-1 text-sm font-semibold px-3 py-2.5 rounded-lg bg-[#2ECC71] text-white hover:bg-[#28B765] transition disabled:opacity-50 min-h-[40px]"
                        >
                          {reviewing === 'approve' ? '…' : 'Setujui'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB B ═══════════ */}
      {tab === 'ledger' && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="w-full lg:w-[320px] lg:shrink-0 space-y-3">
            <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-4 space-y-2.5">
              <select value={searchField} onChange={e => setSearchField(e.target.value as 'name' | 'email' | 'id')} className={inputCls}>
                <option value="name">Nama</option>
                <option value="email">Email</option>
                <option value="id">ID User</option>
              </select>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                placeholder={FIELD_PLACEHOLDER[searchField]}
                className={inputCls}
              />
              <button
                onClick={runSearch}
                disabled={!searchQuery.trim() || searching}
                className="w-full bg-[#2ECC71] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#28B765] transition disabled:opacity-50 min-h-[40px]"
              >
                {searching ? 'Mencari…' : 'Cari'}
              </button>
            </div>

            {!searched && <p className="text-xs text-[#9CA3AF] text-center px-2">Ketik lalu klik Cari untuk menemukan user.</p>}
            {searched && !searching && searchResults.length === 0 && (
              <p className="text-xs text-[#9CA3AF] text-center px-2">Tidak ada user yang cocok.</p>
            )}
            {searched && !searching && searchResults.length > 0 && (
              <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl divide-y divide-[#F3F4F6] overflow-hidden">
                {searchResults.map(u => (
                  <button
                    key={u.userId}
                    onClick={() => { setLedgerUserName(u.name); loadUserLedger(u.userId, 1) }}
                    className={`w-full text-left px-4 py-3 transition ${ledgerUserId === u.userId ? 'bg-[#EAFBF1]' : 'hover:bg-[#F9FAFB]'}`}
                  >
                    <p className="text-sm font-semibold text-[#111827]">{u.name}</p>
                    <p className="text-xs text-[#6B7280] truncate">{u.email ?? '—'} · {u.userId}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">Saldo {u.dailyLimit}/hari</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-5 shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
              {!ledgerUserId && (
                <p className="text-sm text-[#9CA3AF] text-center py-10">Cari dan pilih user di panel kiri untuk melihat riwayat limitnya.</p>
              )}
              {ledgerUserId && ledgerLoading && <div className="text-center py-10 text-sm text-[#9CA3AF]">Memuat…</div>}
              {ledgerUserId && !ledgerLoading && (
                <>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{ledgerUserName}</p>
                      <p className="text-xs text-[#9CA3AF]">Riwayat pemakaian & penambahan limit</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[#9CA3AF]">Saldo saat ini</p>
                      <p className="text-xl font-bold text-[#1F9D57] tabular-nums">{ledgerBalance}/hari</p>
                    </div>
                  </div>

                  {ledgerRows.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF] text-center py-8">Belum ada riwayat untuk user ini.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F9FAFB] text-[#6B7280] text-xs uppercase tracking-wide">
                          <tr>
                            <th className="text-left px-3 py-2.5">Tanggal</th>
                            <th className="text-left px-3 py-2.5">Kejadian</th>
                            <th className="text-right px-3 py-2.5">Sebelum</th>
                            <th className="text-right px-3 py-2.5">Perubahan</th>
                            <th className="text-right px-3 py-2.5">Sesudah</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerRows.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                              <td className="px-3 py-2.5 text-[#6B7280] whitespace-nowrap">{fmtDate(row.date)}</td>
                              <td className="px-3 py-2.5">
                                <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${LEDGER_BADGE_STYLE[row.type]}`}>{LEDGER_BADGE_LABEL[row.type]}</span>
                                <span className="ml-1.5 text-[#111827]">{row.title}</span>
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-[#6B7280]">{row.before}</td>
                              <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${row.delta >= 0 ? 'text-[#1F9D57]' : 'text-red-500'}`}>
                                {row.delta >= 0 ? `+${row.delta}` : row.delta}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-[#111827] font-medium">{row.after}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {ledgerRows.length > 0 && (
                    <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-3 border-t border-[#F3F4F6]">
                      <span className="text-xs text-[#6B7280] tabular-nums">{ledgerPage}/{ledgerPageCount} · {ledgerTotal} data</span>
                      <div className="flex items-center gap-2">
                        <button disabled={ledgerPage <= 1} onClick={() => goToLedgerPage(ledgerPage - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-40">← Sebelumnya</button>
                        <button disabled={ledgerPage >= ledgerPageCount} onClick={() => goToLedgerPage(ledgerPage + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-40">Berikutnya →</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB C ═══════════ */}
      {tab === 'config' && draft && (
        <div className="space-y-5 max-w-2xl">
          {configLoading && <div className="text-sm text-[#9CA3AF]">Memuat konfigurasi…</div>}

          <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-5 shadow-[0_1px_4px_rgba(16,24,40,0.04)] space-y-3">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-[#6B7280]">Rekening Tujuan Transfer</h2>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Nama Bank</label>
              <input value={draft.bankName} onChange={e => setDraft({ ...draft, bankName: e.target.value })} className={inputCls} placeholder="mis. BCA" />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Nomor Rekening Tujuan</label>
              <input value={draft.accountNumber} onChange={e => setDraft({ ...draft, accountNumber: e.target.value })} className={inputCls} placeholder="mis. 1234567890" />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Atas Nama Rekening Tujuan</label>
              <input value={draft.accountHolder} onChange={e => setDraft({ ...draft, accountHolder: e.target.value })} className={inputCls} placeholder="mis. PT Gizku Sehat Indonesia" />
            </div>
          </div>

          <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-5 shadow-[0_1px_4px_rgba(16,24,40,0.04)] space-y-3">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-[#6B7280]">Tier / Paket Penambahan Limit</h2>
            <div className="space-y-2.5">
              {draft.tiers.map((t, i) => (
                <div key={t.id ?? `new-${i}`} className="flex items-end gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-[11px] text-[#9CA3AF] mb-1 block">Nama Tier</label>
                    <input value={t.label} onChange={e => updateTierField(i, 'label', e.target.value)} className={inputCls} />
                  </div>
                  <div className="w-[110px]">
                    <label className="text-[11px] text-[#9CA3AF] mb-1 block">Tambahan/hari</label>
                    <input type="number" min={1} value={t.addPerDay} onChange={e => updateTierField(i, 'addPerDay', Number(e.target.value))} className={inputCls} />
                  </div>
                  <div className="w-[130px]">
                    <label className="text-[11px] text-[#9CA3AF] mb-1 block">Harga (Rp)</label>
                    <input type="number" min={0} step={1000} value={t.price} onChange={e => updateTierField(i, 'price', Number(e.target.value))} className={inputCls} />
                  </div>
                  <button
                    onClick={() => removeTier(i)}
                    disabled={draft.tiers.length <= 1}
                    className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed min-h-[38px] shrink-0"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addTier}
              disabled={draft.tiers.length >= 10}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Tambah Tier
            </button>
            <p className="text-[11px] text-[#9CA3AF]">{draft.tiers.length}/10 tier · limit dasar gratis 3 analisa/hari</p>
          </div>

          <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-5 shadow-[0_1px_4px_rgba(16,24,40,0.04)] space-y-2">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-[#6B7280]">Menu Ajukan Limit Tambahan</h2>
            <button
              type="button" onClick={() => setDraft({ ...draft, featureEnabled: !draft.featureEnabled })}
              role="switch" aria-checked={draft.featureEnabled}
              className="flex items-center gap-3 min-h-[40px]"
            >
              <div className={`w-10 h-6 rounded-full transition-colors relative ${draft.featureEnabled ? 'bg-[#2ECC71]' : 'bg-[#E5E7EB]'}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${draft.featureEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-medium text-[#111827]">{draft.featureEnabled ? 'Aktif' : 'Nonaktif'}</span>
            </button>
            <p className="text-xs text-[#6B7280]">Saat OFF, user melihat status &quot;Coming Soon&quot; dan tombol Ajukan nonaktif.</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            {dirty && <span className="text-xs font-medium text-amber-600">Ada perubahan belum disimpan</span>}
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!dirty || saving}
              className="bg-[#2ECC71] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#28B765] transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              Simpan Konfigurasi
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/30" onClick={() => !saving && setConfirmOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#111827] text-center mb-2">Simpan perubahan konfigurasi?</h3>
            <p className="text-sm text-[#6B7280] text-center leading-normal mb-5">
              Perubahan rekening tujuan, tier paket, atau status fitur akan langsung berlaku bagi semua user. Pastikan data sudah benar sebelum menyimpan.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="w-full bg-[#2ECC71] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#28B765] transition disabled:opacity-60 min-h-[44px]"
              >
                {saving ? 'Menyimpan…' : 'Ya, Simpan'}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="w-full bg-white text-[#111827] px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E5E7EB] hover:bg-[#F3F4F6] transition disabled:opacity-60 min-h-[44px]"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
