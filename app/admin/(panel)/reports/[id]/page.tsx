'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ChevronDown, ChevronLeft, ImagePlus, Info, MessageSquare, Send, Trash2, UserRound, Video,
} from 'lucide-react'
import AdminPage from '@/components/admin/shell/AdminPage'
import {
  Alert, Avatar, Badge, Button, Card, CardTool, EmptyState, FormField, KeyValue, Modal, Progress, Select, Skeleton, Textarea,
} from '@/components/admin/ui'
import {
  AttachmentThumb, FolderCard, SourcePill, STATUS_LABEL, countByStatus, displayName,
  type Attachment, type ReportRow, type ReportStatus, type ThreadData,
} from '@/components/admin/reports/shared'
import { fmtDateLongID, fmtDateTimePrecise, fmtRelativeID, cn } from '@/lib/utils'

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024

const QUICK_REPLIES = [
  { value: 'qr1', label: 'Terima kasih laporannya', text: 'Terima kasih laporannya, kami cek dulu ya.' },
  { value: 'qr2', label: 'Minta detail tambahan', text: 'Boleh minta detail tambahan (screenshot / tipe HP)?' },
  { value: 'qr3', label: 'Sudah diperbaiki', text: 'Sudah kami perbaiki, silakan dicoba kembali.' },
  { value: 'qr4', label: 'Mohon maaf', text: 'Mohon maaf atas ketidaknyamanannya.' },
]

function fmtClock(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [thread, setThread] = useState<ThreadData | null>(null)
  const [threadLoading, setThreadLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reports, setReports] = useState<ReportRow[] | null>(null)

  const [draft, setDraft] = useState('')
  const [draftAttachments, setDraftAttachments] = useState<Attachment[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [sending, setSending] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [ctxOpen, setCtxOpen] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=reports')
      const data = await res.json()
      if (res.ok) setReports(data.reports ?? [])
    } catch { /* folder counts are non-critical */ }
  }, [])

  const loadThread = useCallback(async (reportId: string, quiet = false) => {
    if (!quiet) setThreadLoading(true)
    try {
      const res = await fetch(`/api/admin?action=report_thread&id=${reportId}`)
      const data = await res.json()
      if (res.ok) setThread(data)
      else if (res.status === 404) setNotFound(true)
      else toast.error(data.error ?? 'Gagal memuat detail laporan')
    } catch {
      toast.error('Gagal memuat detail laporan')
    } finally {
      setThreadLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!id) return
    loadThread(id)
    loadReports()
  }, [id, loadThread, loadReports])

  const counts = useMemo(() => countByStatus(reports), [reports])

  async function changeStatus(status: ReportStatus) {
    if (!thread) return
    const reportId = thread.report.id
    const prevThread = thread
    const prevReports = reports
    setThread(t => t ? { ...t, report: { ...t.report, status } } : t)
    setReports(rs => rs?.map(r => r.id === reportId ? { ...r, status } : r) ?? rs)
    try {
      const res = await fetch('/api/admin?action=update_report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal memperbarui status')
      toast.success(`Status diperbarui: ${STATUS_LABEL[status]}`)
      document.dispatchEvent(new Event('admin:counts'))
    } catch (e) {
      setThread(prevThread)
      setReports(prevReports)
      toast.error(e instanceof Error ? e.message : 'Gagal memperbarui status')
    }
  }

  async function doDelete() {
    if (!thread) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin?action=delete_report', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: thread.report.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menghapus laporan'); return }
      toast.success('Laporan dihapus')
      document.dispatchEvent(new Event('admin:counts'))
      setConfirmDelete(false)
      router.push('/admin/reports')
    } catch {
      toast.error('Gagal menghapus laporan')
    } finally {
      setDeleting(false)
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
  function pickQuickReply(e: React.ChangeEvent<HTMLSelectElement>) {
    const opt = QUICK_REPLIES.find(q => q.value === e.target.value)
    if (opt) appendDraft(opt.text)
    e.target.value = ''
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
      await Promise.all([loadThread(thread.report.id, true), loadReports()])
      document.dispatchEvent(new Event('admin:counts'))
      requestAnimationFrame(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
    } catch {
      toast.error('Gagal mengirim balasan')
    } finally {
      setSending(false)
    }
  }

  const sendDisabled = !draft.trim() && draftAttachments.length === 0
  const crumbs = [{ label: 'Laporan & Helpdesk', href: '/admin/reports' }, { label: thread ? `#${thread.report.ticketNumber}` : 'Detail' }]

  if (notFound) {
    return (
      <AdminPage title="Detail Laporan" breadcrumb={crumbs}>
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="Laporan tidak ditemukan"
            description="Laporan ini mungkin sudah dihapus."
            action={<Button variant="outline" icon={ChevronLeft} href="/admin/reports">Kembali ke Kotak Masuk</Button>}
          />
        </Card>
      </AdminPage>
    )
  }

  if (threadLoading || !thread) {
    return (
      <AdminPage title="Detail Laporan" breadcrumb={crumbs}>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <Skeleton className="xl:col-span-3 h-[260px] rounded-md max-xl:hidden" />
          <Skeleton className="xl:col-span-9 h-[480px] rounded-md" />
        </div>
      </AdminPage>
    )
  }

  const { report, user } = thread
  const name = displayName(report)
  const statusSelect = (idSuffix: string, className?: string) => (
    <div className={className}>
      <label htmlFor={`report-status-${idSuffix}`} className="block text-sm font-semibold text-primary mb-1">Status Laporan</label>
      <Select id={`report-status-${idSuffix}`} value={report.status} onChange={e => changeStatus(e.target.value as ReportStatus)}>
        <option value="open">Open</option>
        {report.source === 'email' && (
          <>
            <option value="replied">Dibalas</option>
            <option value="waiting">Menunggu user</option>
          </>
        )}
        <option value="done">Selesai</option>
      </Select>
    </div>
  )

  const usagePct = user ? Math.min(100, (user.todayUsage / Math.max(1, user.dailyLimit)) * 100) : 0
  const contextBody = (
    <>
      {user ? (
        <>
          <KeyValue
            dense
            className="-mt-1"
            items={[
              { label: 'Akun', value: user.isActive ? <Badge variant="success" size="sm">Aktif</Badge> : <Badge variant="secondary" size="sm">Nonaktif</Badge> },
              { label: 'Email', value: <span className="break-all font-medium">{user.email ?? '—'}</span> },
              { label: 'Limit harian', value: `${user.dailyLimit} foto/hari` },
              {
                label: 'Pemakaian hari ini',
                value: <span className={cn(user.todayUsage >= user.dailyLimit && 'text-rose-600')}>{user.todayUsage} / {user.dailyLimit}</span>,
              },
            ]}
          />
          <Progress value={usagePct} tone={user.todayUsage >= user.dailyLimit ? 'rose' : 'brand'} className="mt-1" label="Pemakaian hari ini" />
          <p className="text-xs text-secondary mt-1.5">per {fmtDateLongID(new Date())}</p>
          <Button variant="outline-primary" icon={UserRound} href={`/admin/users/${user.id}`} fullWidth className="mt-3">Buka Detail User</Button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div><Badge variant="secondary">Belum terdaftar</Badge></div>
          <p className="text-sm text-secondary leading-normal">Email pengirim tidak ditemukan pada akun Gizku terdaftar.</p>
        </div>
      )}
    </>
  )

  const composer = report.source === 'email' ? (
    <div className="flex flex-col gap-3">
      <FormField label="Balasan cepat" htmlFor="quick-reply">
        <Select id="quick-reply" defaultValue="" onChange={pickQuickReply}>
          <option value="">Pilih balasan cepat…</option>
          {QUICK_REPLIES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
        </Select>
      </FormField>
      {draftAttachments.length > 0 && (
        <div className="flex gap-3 flex-wrap pt-1">
          {draftAttachments.map((a, i) => <AttachmentThumb key={i} att={a} size={72} onRemove={() => removeDraftAttachment(i)} />)}
        </div>
      )}
      <div>
        <label htmlFor="reply-text" className="sr-only">Tulis balasan</label>
        <Textarea id="reply-text" rows={4} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Tulis balasan untuk user…" />
      </div>
      <div className="flex items-center gap-2 flex-wrap max-lg:grid max-lg:grid-cols-2">
        <Button variant="outline" size="sm" icon={ImagePlus} loading={uploadingImage} disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} title="Lampirkan gambar (maks. 5MB)">
          {uploadingImage ? 'Mengunggah…' : 'Gambar'}
        </Button>
        <Button variant="outline" size="sm" icon={Video} loading={uploadingVideo} disabled={uploadingVideo} onClick={() => videoInputRef.current?.click()} title="Lampirkan video (maks. 5MB)">
          {uploadingVideo ? 'Mengunggah…' : 'Video'}
        </Button>
        <span className="text-sm text-secondary max-lg:col-span-2">Maks. 5MB per file</span>
        <Button icon={Send} disabled={sendDisabled} loading={sending} onClick={sendReply} className="lg:ml-auto max-lg:col-span-2">Kirim Balasan</Button>
      </div>
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden" onChange={e => handleFileSelect('image', e.target.files?.[0], e.target)} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={e => handleFileSelect('video', e.target.files?.[0], e.target)} />
    </div>
  ) : (
    <Alert variant="light" icon={Info} title="Balasan lewat aplikasi belum tersedia.">
      Laporan ini masuk dari dalam aplikasi Gizku. Kirim balasan langsung baru bisa untuk laporan yang masuk lewat email.
    </Alert>
  )

  return (
    <AdminPage title="Detail Laporan" breadcrumb={crumbs}>
      <div className="lg:hidden">
        <Button variant="outline" size="sm" icon={ChevronLeft} href="/admin/reports">Kembali</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-4 items-start">
        {/* Left column (desktop) */}
        <div className="xl:col-span-3 flex flex-col gap-5 max-lg:hidden">
          <FolderCard counts={counts} active={report.status} className="max-xl:hidden" />
          <Card title="Konteks Akun" icon={UserRound}>{contextBody}</Card>
        </div>

        {/* Main */}
        <div className="xl:col-span-9 flex flex-col gap-4 min-w-0">
          <Card
            outline="brand"
            icon={MessageSquare}
            title="Detail Laporan"
            noPadding
            className="max-lg:hidden"
            tools={
              <>
                <CardTool icon={Trash2} label="Hapus laporan" onClick={() => setConfirmDelete(true)} className="hover:text-rose-600" />
                <Button variant="outline" size="sm" icon={ChevronLeft} href="/admin/reports">Kembali</Button>
              </>
            }
            footer={composer}
          >
            <div className="flex items-start gap-3 px-4 py-3.5 border-b border-border">
              <Avatar name={name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-primary truncate">{name}</h2>
                  <span className="text-sm text-secondary">#{report.ticketNumber}</span>
                  <SourcePill source={report.source} />
                </div>
                <p className="text-sm text-secondary mt-0.5">
                  Dibuat {fmtDateTimePrecise(report.createdAt)} · diperbarui {fmtRelativeID(report.updatedAt)}
                </p>
                {report.emailSubject && <p className="text-sm text-bark-700 mt-1 truncate">Subjek: {report.emailSubject}</p>}
              </div>
              {statusSelect('d', 'w-[200px] shrink-0')}
            </div>
            <ThreadView thread={thread} name={name} />
            <div ref={threadEndRef} />
          </Card>

          {/* Mobile header card */}
          <Card outline="brand" className="lg:hidden">
            <div className="flex items-start gap-3">
              <Avatar name={name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-md font-semibold text-primary truncate">{name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-secondary">#{report.ticketNumber}</span>
                  <SourcePill source={report.source} />
                </div>
              </div>
              <CardTool icon={Trash2} label="Hapus laporan" onClick={() => setConfirmDelete(true)} />
            </div>
            <p className="text-sm text-secondary mt-2">Dibuat {fmtDateTimePrecise(report.createdAt)}</p>
            {statusSelect('m', 'mt-3')}
          </Card>

          {/* Mobile: collapsible account context */}
          <section className="lg:hidden bg-surface rounded-md shadow-card overflow-hidden">
            <button
              type="button"
              aria-expanded={ctxOpen}
              aria-controls="ctx-body"
              onClick={() => setCtxOpen(o => !o)}
              className="w-full flex items-center gap-2 px-4 min-h-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500"
            >
              <UserRound size={18} className="text-secondary" aria-hidden />
              <span className="text-md font-semibold text-primary flex-1">Konteks Akun</span>
              <ChevronDown size={18} className={cn('text-secondary transition-transform', ctxOpen && 'rotate-180')} aria-hidden />
            </button>
            {ctxOpen && <div id="ctx-body" className="px-4 pb-4 border-t border-border pt-3">{contextBody}</div>}
          </section>

          {/* Mobile thread */}
          <div className="lg:hidden">
            <ThreadView thread={thread} name={name} mobile />
          </div>

          <Card outline="brand" icon={Send} title="Balas" className="lg:hidden">{composer}</Card>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        closeDisabled={deleting}
        title="Hapus laporan ini?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Batal</Button>
            <Button variant="danger" icon={Trash2} loading={deleting} onClick={doDelete}>Hapus</Button>
          </>
        }
      >
        <p className="text-base text-bark-700 leading-normal">
          Laporan dari <strong className="text-primary">{name}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
        </p>
      </Modal>
    </AdminPage>
  )
}

function ThreadView({ thread, name, mobile }: { thread: ThreadData; name: string; mobile?: boolean }) {
  // Date separators between messages from different days.
  const days = thread.messages.map(m => fmtDateLongID(m.createdAt))
  return (
    <ol className={cn('list-none m-0 flex flex-col gap-4', mobile ? 'p-0' : 'px-4 py-4')} aria-label="Percakapan">
      {thread.messages.map((m, i) => {
        const day = days[i]
        const showDay = i === 0 || day !== days[i - 1]
        const admin = m.sender === 'admin'
        return (
          <li key={m.id} className="flex flex-col gap-1">
            {showDay && (
              <div className="flex justify-center my-1"><Badge variant="light" pill>{day}</Badge></div>
            )}
            <div className={cn('flex flex-col gap-1', admin ? 'items-end' : 'items-start')}>
              <span className="text-xs text-secondary px-1">
                <strong className="font-semibold text-primary">{admin ? 'Admin Gizku' : name}</strong> · {fmtClock(m.createdAt)}
              </span>
              <div
                className={cn(
                  'rounded-md px-3.5 py-2.5 text-base whitespace-pre-wrap break-words leading-normal',
                  mobile ? 'max-w-[82%]' : 'max-w-[75%]',
                  admin ? 'bg-brand text-white' : mobile ? 'bg-surface text-primary border border-border' : 'bg-muted text-primary',
                )}
              >
                {m.body || <span className={cn('italic', admin ? 'text-white/80' : 'text-secondary')}>(lampiran tanpa teks)</span>}
              </div>
              {m.attachments.length > 0 && (
                <div className={cn('flex gap-2 flex-wrap max-w-[300px]', admin && 'justify-end')}>
                  {m.attachments.map((a, i) => <AttachmentThumb key={a.id ?? i} att={a} size={88} />)}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
