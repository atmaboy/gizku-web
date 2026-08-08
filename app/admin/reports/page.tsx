'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import TextField from '@/components/ui/TextField'
import Chip from '@/components/ui/Chip'
import Dialog from '@/components/ui/Dialog'
import {
  IconSearch, IconMail, IconPhone, IconTrash, IconInfo, IconSend, IconClose,
  IconGallery, IconVideoCamera, IconPlay,
} from '@/components/ui/icons'
import { fmtRelativeID, fmtDateTimePrecise, fmtDateLongID } from '@/lib/utils'

type ReportStatus = 'open' | 'replied' | 'waiting' | 'done'
type ReportSource = 'app' | 'email'

type ReportRow = {
  id: string
  userId: string | null
  username: string | null
  message: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
  source: ReportSource
  fromEmail: string | null
  emailMessageId: string | null
  emailSubject: string | null
}

type Attachment = { id?: string; url: string; kind: 'image' | 'video'; sizeBytes?: number | null }
type ThreadMessage = { id: string; sender: 'admin' | 'user'; body: string; createdAt: string; attachments: Attachment[] }
type ThreadUser = {
  id: string; username: string; email: string | null
  isActive: boolean; dailyLimit: number; isCustomLimit: boolean; todayUsage: number
} | null
type ThreadData = { report: ReportRow; user: ThreadUser; messages: ThreadMessage[] }

const PAGE_SIZE = 8
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024

const STATUS_LABEL: Record<ReportStatus, string> = { open: 'Open', replied: 'Dibalas', waiting: 'Menunggu user', done: 'Selesai' }
const STATUS_PILL_STYLE: Record<ReportStatus, string> = {
  open:    'bg-amber-100 text-amber-700',
  replied: 'bg-green-100 text-green-700',
  waiting: 'bg-sand-200 text-clay-600',
  done:    'bg-sand-100 text-green-700',
}
const FILTERS: { key: 'all' | ReportStatus; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'open', label: 'Open' },
  { key: 'replied', label: 'Dibalas' },
  { key: 'waiting', label: 'Menunggu user' },
  { key: 'done', label: 'Selesai' },
]
const QUICK_REPLIES = [
  'Terima kasih laporannya, kami cek dulu ya.',
  'Boleh minta detail tambahan (screenshot / tipe HP)?',
  'Sudah kami perbaiki, silakan dicoba kembali.',
  'Mohon maaf atas ketidaknyamanannya.',
]

function displayName(r: { username: string | null; fromEmail?: string | null }) {
  return r.username || r.fromEmail || '?'
}

function Avatar({ label, size = 36 }: { label: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold uppercase shrink-0"
      style={{ width: size, height: size, fontSize: size >= 34 ? 14 : 13 }}
    >
      {label.charAt(0)}
    </div>
  )
}

function SourcePill({ source }: { source: ReportSource }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-pill text-2xs font-medium bg-muted text-secondary whitespace-nowrap shrink-0">
      {source === 'app' ? <IconPhone size={10} /> : <IconMail size={11} />}
      {source === 'app' ? 'App' : 'Email'}
    </span>
  )
}

function StatusPill({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-medium whitespace-nowrap shrink-0 ${STATUS_PILL_STYLE[status]}`}>
      <span className="w-[6px] h-[6px] rounded-full bg-current shrink-0" />
      {STATUS_LABEL[status]}
    </span>
  )
}

function AttachmentThumb({ att, size, onRemove }: { att: Attachment; size: number; onRemove?: () => void }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
        {att.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={att.url} alt="Lampiran" className="w-full h-full object-cover rounded-md" />
        ) : (
          <div className="flex items-center justify-center w-full h-full rounded-md bg-inverse relative">
            <IconPlay size={size >= 90 ? 26 : 20} />
            {size >= 90 && <span className="absolute bottom-1.5 left-1.5 text-2xs text-white font-medium">Video</span>}
          </div>
        )}
      </a>
      {onRemove && (
        <button
          onClick={onRemove}
          title="Hapus lampiran"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[11px] leading-none cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  )
}

function StatMini({ title, value, caption, tone = 'default' }: { title: string; value: string; caption?: string; tone?: 'default' | 'danger' }) {
  return (
    <div className="bg-sunken rounded-lg shadow-hairline p-3 flex flex-col gap-1 min-w-0">
      <span className="text-2xs text-tertiary font-medium">{title}</span>
      <span className={`text-lg font-semibold tabular-nums truncate ${tone === 'danger' ? 'text-danger' : 'text-primary'}`}>{value}</span>
      {caption && <span className="text-2xs text-secondary truncate">{caption}</span>}
    </div>
  )
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all')
  const [page, setPage] = useState(1)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [thread, setThread] = useState<ThreadData | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)

  const [draft, setDraft] = useState('')
  const [draftAttachments, setDraftAttachments] = useState<Attachment[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [sending, setSending] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

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

  const loadThread = useCallback(async (id: string) => {
    setThreadLoading(true)
    try {
      const res = await fetch(`/api/admin?action=report_thread&id=${id}`)
      const data = await res.json()
      if (res.ok) setThread(data)
      else toast.error(data.error ?? 'Gagal memuat detail laporan')
    } catch {
      toast.error('Gagal memuat detail laporan')
    } finally {
      setThreadLoading(false)
    }
  }, [])

  useEffect(() => { loadReports() }, [loadReports])

  useEffect(() => {
    if (selectedId) {
      const frame = requestAnimationFrame(() => setDrawerVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setDrawerVisible(false)
  }, [selectedId])

  function openDrawer(id: string) {
    setSelectedId(id)
    setDraft('')
    setDraftAttachments([])
    loadThread(id)
  }
  function closeDrawer() {
    setSelectedId(null)
    setThread(null)
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

  const counts = useMemo(() => {
    const base = { all: reports?.length ?? 0, open: 0, replied: 0, waiting: 0, done: 0 }
    reports?.forEach(r => { base[r.status]++ })
    return base
  }, [reports])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE)

  function changeFilter(key: 'all' | ReportStatus) {
    setStatusFilter(key)
    setPage(1)
  }
  function changeQuery(v: string) {
    setQuery(v)
    setPage(1)
  }

  async function changeStatus(status: ReportStatus) {
    if (!thread) return
    const id = thread.report.id
    const prevReports = reports
    const prevThread = thread
    setReports(rs => rs?.map(r => r.id === id ? { ...r, status } : r) ?? rs)
    setThread(t => t ? { ...t, report: { ...t.report, status } } : t)
    try {
      const res = await fetch('/api/admin?action=update_report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal memperbarui status')
      toast.success(`Status diperbarui: ${STATUS_LABEL[status]}`)
    } catch (e) {
      setReports(prevReports)
      setThread(prevThread)
      toast.error(e instanceof Error ? e.message : 'Gagal memperbarui status')
    }
  }

  function askDelete(id: string) { setConfirmDeleteId(id) }
  function cancelDelete() { setConfirmDeleteId(null) }

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
      if (selectedId === confirmDeleteId) closeDrawer()
      toast.success('Laporan dihapus')
    } catch {
      toast.error('Gagal menghapus laporan')
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  async function handleFileSelect(kind: 'image' | 'video', file: File | undefined, inputEl: HTMLInputElement | null) {
    if (!file) return
    if (file.size > MAX_ATTACHMENT_SIZE) {
      toast.error('Ukuran file maksimal 5MB.')
      if (inputEl) inputEl.value = ''
      return
    }
    const setUploading = kind === 'image' ? setUploadingImage : setUploadingVideo
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-report-attachment', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal mengunggah lampiran'); return }
      setDraftAttachments(prev => [...prev, { url: data.url, kind: data.kind, sizeBytes: data.sizeBytes }])
    } catch {
      toast.error('Gagal mengunggah lampiran')
    } finally {
      setUploading(false)
      if (inputEl) inputEl.value = ''
    }
  }
  function removeDraftAttachment(idx: number) {
    setDraftAttachments(prev => prev.filter((_, i) => i !== idx))
  }
  function appendDraft(text: string) {
    setDraft(prev => prev ? `${prev}\n${text}` : text)
  }

  async function sendReply() {
    if (!thread || sending) return
    const text = draft.trim()
    if (!text && draftAttachments.length === 0) return
    setSending(true)
    try {
      const res = await fetch('/api/admin?action=reply_report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: thread.report.id, text, attachments: draftAttachments }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal mengirim balasan'); return }
      setDraft('')
      setDraftAttachments([])
      toast.success('Balasan terkirim ke user')
      await Promise.all([loadThread(thread.report.id), loadReports()])
    } catch {
      toast.error('Gagal mengirim balasan')
    } finally {
      setSending(false)
    }
  }

  const todayLabel = fmtDateLongID(new Date())
  const sendDisabled = !draft.trim() && draftAttachments.length === 0

  return (
    <div className="space-y-5 w-full">
      <div>
        <h1 className="text-2xl font-semibold text-primary tracking-tight">Laporan &amp; Helpdesk</h1>
        <p className="text-base text-secondary mt-1.5">
          {loading ? 'Memuat…' : `${counts.all} laporan total · ${counts.open} perlu dibalas`}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px] max-w-[360px]">
          <TextField
            placeholder="Cari username atau email…"
            leadingIcon={<IconSearch size={16} />}
            value={query}
            onChange={e => changeQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <Chip key={f.key} label={`${f.label} (${counts[f.key]})`} selected={statusFilter === f.key} onClick={() => changeFilter(f.key)} />
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow-hairline overflow-hidden">
        {loading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
                <div className="w-9 h-9 rounded-full gizku-skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 gizku-skeleton" />
                  <div className="h-3 w-2/3 gizku-skeleton" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && pageItems.map(r => (
          <div
            key={r.id}
            onClick={() => openDrawer(r.id)}
            className="flex items-center gap-3.5 px-4 sm:px-[18px] py-3.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-sunken transition-colors"
          >
            <Avatar label={displayName(r)} size={36} />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-medium text-base text-primary truncate">{displayName(r)}</span>
                <span className="text-xs text-tertiary whitespace-nowrap">{fmtRelativeID(r.createdAt)}</span>
              </div>
              <span className="text-base text-secondary truncate">{r.message}</span>
            </div>
            <SourcePill source={r.source} />
            <StatusPill status={r.status} />
            <button
              onClick={e => { e.stopPropagation(); askDelete(r.id) }}
              title="Hapus laporan"
              className="flex items-center justify-center w-8 h-8 rounded-md text-tertiary hover:bg-sunken hover:text-danger transition shrink-0 cursor-pointer"
            >
              <IconTrash size={15} />
            </button>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-tertiary text-base">Tidak ada laporan yang cocok.</div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-base text-secondary">
            Menampilkan {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} dari {filtered.length} laporan
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" fullWidth={false} disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>‹ Sebelumnya</Button>
            <Button variant="outline" size="sm" fullWidth={false} disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>Selanjutnya ›</Button>
          </div>
        </div>
      )}

      {/* ── Reply drawer ── */}
      {selectedId && (
        <>
          <div
            className="fixed inset-0 z-[200] transition-opacity duration-200"
            style={{ background: 'var(--color-bg-scrim)', opacity: drawerVisible ? 1 : 0 }}
            onClick={closeDrawer}
          />
          <div
            className="fixed top-0 right-0 bottom-0 z-[201] w-[480px] max-w-[94vw] bg-surface shadow-md flex flex-col transition-transform duration-200 ease-out"
            style={{ transform: drawerVisible ? 'translateX(0)' : 'translateX(100%)' }}
          >
            {!thread || threadLoading ? (
              <div className="flex-1 flex items-center justify-center text-tertiary text-base">Memuat…</div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
                  <Avatar label={displayName(thread.report)} size={34} />
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-semibold text-md text-primary truncate">{displayName(thread.report)}</span>
                      <SourcePill source={thread.report.source} />
                      {thread.report.source === 'email' && (
                        thread.user
                          ? <span className="px-2 py-0.5 rounded-pill text-2xs font-medium bg-green-100 text-green-700 whitespace-nowrap">Terdaftar</span>
                          : <span className="px-2 py-0.5 rounded-pill text-2xs font-medium bg-sand-200 text-clay-600 whitespace-nowrap">Belum terdaftar</span>
                      )}
                    </div>
                    {thread.report.source === 'app' && thread.user?.email && (
                      <span className="text-xs text-tertiary truncate">{thread.user.email}</span>
                    )}
                  </div>
                  <button
                    onClick={() => askDelete(thread.report.id)}
                    title="Hapus laporan"
                    className="flex items-center justify-center w-8 h-8 rounded-md text-tertiary hover:bg-sunken hover:text-danger transition shrink-0 cursor-pointer"
                  >
                    <IconTrash size={15} />
                  </button>
                  <button
                    onClick={closeDrawer}
                    title="Tutup"
                    className="flex items-center justify-center w-8 h-8 rounded-md bg-muted text-secondary hover:bg-sunken transition shrink-0 cursor-pointer"
                  >
                    <IconClose size={14} />
                  </button>
                </div>

                {/* Status chips */}
                <div className="px-5 py-3.5 border-b border-border flex flex-col gap-2 shrink-0">
                  <span className="text-xs uppercase tracking-[0.5px] text-tertiary font-semibold">Status Laporan</span>
                  <div className="flex gap-2 flex-wrap">
                    <Chip label="Open" selected={thread.report.status === 'open'} onClick={() => changeStatus('open')} />
                    {thread.report.source === 'email' && (
                      <>
                        <Chip label="Dibalas" selected={thread.report.status === 'replied'} onClick={() => changeStatus('replied')} />
                        <Chip label="Menunggu user" selected={thread.report.status === 'waiting'} onClick={() => changeStatus('waiting')} />
                      </>
                    )}
                    <Chip label="Selesai" selected={thread.report.status === 'done'} onClick={() => changeStatus('done')} />
                  </div>
                </div>

                {/* Account context */}
                {thread.user && (
                  <div className="px-5 py-4 border-b border-border flex flex-col gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base text-secondary">Status akun:</span>
                      <span className={`text-xs font-medium px-2.5 py-[3px] rounded-pill ${thread.user.isActive ? 'bg-green-100 text-green-700' : 'bg-sand-200 text-clay-600'}`}>
                        {thread.user.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <StatMini
                          title="Limit Harian"
                          value={`${thread.user.dailyLimit} foto/hari`}
                          caption={thread.user.isCustomLimit ? 'Custom (override)' : undefined}
                        />
                        <span className="text-2xs text-tertiary px-0.5">Data per {todayLabel}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <StatMini
                          title="Pemakaian Hari Ini"
                          value={`${thread.user.todayUsage}/${thread.user.dailyLimit}`}
                          tone={thread.user.todayUsage >= thread.user.dailyLimit ? 'danger' : 'default'}
                          caption={thread.user.todayUsage >= thread.user.dailyLimit ? 'Limit tercapai' : `${thread.user.dailyLimit - thread.user.todayUsage} tersisa hari ini`}
                        />
                        <span className="text-2xs text-tertiary px-0.5">Data per {todayLabel}</span>
                      </div>
                    </div>
                  </div>
                )}
                {thread.report.source === 'email' && !thread.user && (
                  <div className="px-5 py-3 border-b border-border shrink-0">
                    <span className="text-xs text-tertiary">Email pengirim tidak ditemukan pada akun Gizku terdaftar.</span>
                  </div>
                )}

                {/* Thread */}
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
                  {thread.messages.map(m => (
                    <div key={m.id} className={`flex flex-col gap-1.5 ${m.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-base whitespace-pre-wrap break-words ${m.sender === 'admin' ? 'bg-brand-tint text-primary' : 'bg-sunken text-primary shadow-hairline'}`}>
                        {m.body || <span className="italic text-tertiary">(lampiran tanpa teks)</span>}
                      </div>
                      {m.attachments.length > 0 && (
                        <div className={`flex gap-2 flex-wrap max-w-[260px] ${m.sender === 'admin' ? 'justify-end' : ''}`}>
                          {m.attachments.map((a, i) => <AttachmentThumb key={a.id ?? i} att={a} size={96} />)}
                        </div>
                      )}
                      <span className="text-xs text-tertiary px-1">
                        {m.sender === 'admin' ? 'Admin Gizku' : displayName(thread.report)} · {fmtDateTimePrecise(m.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Composer (email source only) */}
                {thread.report.source === 'email' ? (
                  <>
                    <div className="px-5 pt-2.5 pb-2 border-t border-border flex flex-col gap-2 shrink-0">
                      <span className="text-xs uppercase tracking-[0.5px] text-tertiary font-semibold">Balasan Cepat</span>
                      <div className="flex gap-2 flex-wrap">
                        {QUICK_REPLIES.map(q => (
                          <Chip key={q} label={q} selected={false} onClick={() => appendDraft(q)} />
                        ))}
                      </div>
                    </div>
                    <div className="px-5 pt-3.5 pb-5 border-t border-border flex flex-col gap-2.5 shrink-0">
                      {draftAttachments.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {draftAttachments.map((a, i) => (
                            <AttachmentThumb key={i} att={a} size={72} onRemove={() => removeDraftAttachment(i)} />
                          ))}
                        </div>
                      )}
                      <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        placeholder="Tulis balasan untuk user…"
                        className="w-full min-h-[80px] resize-y rounded-lg bg-sunken px-3.5 py-3 text-base text-primary placeholder:text-tertiary outline-none"
                      />
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploadingImage}
                            title="Lampirkan gambar (maks. 5MB)"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-secondary text-xs font-medium hover:bg-sunken transition disabled:opacity-50 cursor-pointer"
                          >
                            <IconGallery size={14} /> {uploadingImage ? 'Mengunggah…' : 'Gambar'}
                          </button>
                          <button
                            onClick={() => videoInputRef.current?.click()}
                            disabled={uploadingVideo}
                            title="Lampirkan video (maks. 5MB)"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-secondary text-xs font-medium hover:bg-sunken transition disabled:opacity-50 cursor-pointer"
                          >
                            <IconVideoCamera size={14} /> {uploadingVideo ? 'Mengunggah…' : 'Video'}
                          </button>
                        </div>
                        <Button
                          variant="primary" size="md" fullWidth={false}
                          icon={<IconSend size={15} />}
                          disabled={sendDisabled}
                          loading={sending}
                          onClick={sendReply}
                        >
                          Kirim Balasan
                        </Button>
                      </div>
                      <span className="text-2xs text-tertiary">Ukuran maksimal 5MB per foto/video.</span>
                      <input
                        ref={imageInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden"
                        onChange={e => handleFileSelect('image', e.target.files?.[0], e.target)}
                      />
                      <input
                        ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
                        onChange={e => handleFileSelect('video', e.target.files?.[0], e.target)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="px-5 pt-4 pb-5 border-t border-border shrink-0">
                    <div className="flex gap-2.5 p-3.5 rounded-lg bg-sunken">
                      <IconInfo size={16} className="text-tertiary shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-medium text-primary">Balasan lewat aplikasi belum tersedia</span>
                        <span className="text-xs text-secondary">Laporan ini masuk dari dalam aplikasi Gizku. Kirim balasan langsung baru bisa untuk laporan yang masuk lewat email.</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      <Dialog
        open={!!confirmDeleteId}
        onClose={cancelDelete}
        title="Hapus laporan ini?"
        description={`Laporan dari ${displayName(reports?.find(r => r.id === confirmDeleteId) ?? { username: null, fromEmail: null })} akan dihapus permanen dan tidak bisa dikembalikan.`}
        actions={[
          { label: 'Hapus', variant: 'danger-outline', onClick: confirmDelete, loading: deleting },
          { label: 'Batal', variant: 'outline', onClick: cancelDelete },
        ]}
      />
    </div>
  )
}
