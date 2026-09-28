'use client'
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, Button, Modal, TrackedLink } from '@/components/admin/ui'
import type { ChangeKey } from '@/lib/landing/diff'
import type { IssueSection, PublishIssue } from '@/lib/landing/publish-rules'
import { SECTION_LABELS } from '@/lib/landing/schema'
import { cn } from '@/lib/utils'
import { useBuilder } from './BuilderContext'
import { sectionHref } from './SectionList'

export const CHANGE_LABELS: Record<ChangeKey, string> = {
  ...SECTION_LABELS,
  order: 'Urutan section',
  settings: 'Pengaturan global',
}
const ISSUE_LABEL = (s: IssueSection) => (s === 'settings' ? 'Pengaturan global' : SECTION_LABELS[s])
const issueHref = (s: IssueSection) => (s === 'settings' ? '/admin/landing/settings' : sectionHref(s))

export function StatusChip({ className }: { className?: string }) {
  const { total, saveState, conflict } = useBuilder()
  const base = 'inline-flex items-center gap-2 px-3.5 min-h-9 rounded-pill text-sm font-semibold'
  if (conflict) return <span role="status" className={cn(base, 'bg-rose-50 text-rose-600', className)}><AlertTriangle size={15} aria-hidden />Diubah admin lain</span>
  if (saveState === 'error') return <span role="status" className={cn(base, 'bg-rose-50 text-rose-600', className)}><span aria-hidden className="w-2 h-2 rounded-full bg-rose-500" />Belum tersimpan</span>
  if (total > 0) {
    return (
      <span role="status" className={cn(base, 'bg-honey-50 text-bark-800', className)}>
        <span aria-hidden className="w-2 h-2 rounded-full bg-honey-500" />Draf · {total} perubahan belum diterbitkan
      </span>
    )
  }
  return <span role="status" className={cn(base, 'bg-green-50 text-green-800', className)}><span aria-hidden className="w-2 h-2 rounded-full bg-green-600" />Tayang · tidak ada perubahan</span>
}

function IssueList({ issues, tone }: { issues: PublishIssue[]; tone: 'error' | 'warning' }) {
  const bySection = new Map<IssueSection, PublishIssue[]>()
  for (const i of issues) bySection.set(i.section, [...(bySection.get(i.section) ?? []), i])
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-2">
      {[...bySection.entries()].map(([s, list]) => (
        <li key={s} className={cn('rounded-md border px-3 py-2.5', tone === 'error' ? 'border-rose-300 bg-rose-50' : 'border-honey-300 bg-honey-50')}>
          <TrackedLink href={issueHref(s)} className="text-base font-semibold text-link hover:underline">{ISSUE_LABEL(s)}</TrackedLink>
          <ul className="mt-1 mb-0 pl-5 list-disc text-sm text-bark-800">
            {list.map((i, n) => <li key={n}>{i.message}</li>)}
          </ul>
        </li>
      ))}
    </ul>
  )
}

export function openPreviewTab(flush: () => Promise<boolean>) {
  // Open synchronously (popup blockers), then point it at the preview once saved.
  const w = window.open('about:blank', '_blank')
  void flush().then(() => {
    if (w) w.location.href = '/api/admin/landing-builder/preview'
    else window.location.href = '/api/admin/landing-builder/preview'
  })
}

export function PublishModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changes, total, check, publish } = useBuilder()
  const [busy, setBusy] = useState(false)
  const [serverErrors, setServerErrors] = useState<PublishIssue[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const errors = serverErrors ?? check.errors
  const close = () => { if (!busy) { setServerErrors(null); setMessage(null); onClose() } }

  async function confirm() {
    setBusy(true)
    setMessage(null)
    const r = await publish()
    setBusy(false)
    if (r.ok) {
      toast.success('Landing page diterbitkan — pengunjung melihat versi baru.')
      r.warnings.forEach(w => toast.message(w.message))
      setServerErrors(null)
      onClose()
    } else {
      if (r.errors.length) setServerErrors(r.errors)
      setMessage(r.message)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Terbitkan perubahan?"
      closeDisabled={busy}
      footer={(
        <>
          <Button variant="outline" onClick={close} disabled={busy}>Batal</Button>
          <Button icon={Send} onClick={confirm} loading={busy} disabled={errors.length > 0 || total === 0}>Terbitkan sekarang</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        {message && <Alert variant="danger">{message}</Alert>}
        {errors.length > 0 ? (
          <>
            <p className="text-base text-primary">Perbaiki dulu {errors.length} masalah berikut sebelum menerbitkan:</p>
            <IssueList issues={errors} tone="error" />
          </>
        ) : (
          <>
            <p className="text-base text-primary">Perubahan ini akan langsung tampil untuk semua pengunjung <strong>/</strong>:</p>
            <ul className="m-0 p-0 list-none divide-y divide-border rounded-md border border-border">
              {(Object.entries(changes) as [ChangeKey, number][]).map(([k, n]) => (
                <li key={k} className="flex items-center justify-between px-3 py-2.5 text-base">
                  <span className="text-primary">{CHANGE_LABELS[k]}</span>
                  <span className="text-secondary">{n} perubahan</span>
                </li>
              ))}
            </ul>
            {check.warnings.length > 0 && (
              <>
                <p className="text-sm text-secondary">Catatan (tidak menghalangi terbit):</p>
                <IssueList issues={check.warnings} tone="warning" />
              </>
            )}
            <p className="text-sm text-secondary">Angka statistik otomatis dihitung ulang saat terbit. Versi sebelumnya tersimpan di riwayat.</p>
          </>
        )}
      </div>
    </Modal>
  )
}

export function DiscardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { total, discard } = useBuilder()
  const [busy, setBusy] = useState(false)
  async function confirm() {
    setBusy(true)
    const ok = await discard()
    setBusy(false)
    if (ok) { toast.success('Draf dibuang — kembali sama dengan versi tayang.'); onClose() }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buang draf?"
      size="sm"
      closeDisabled={busy}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
          <Button variant="danger" icon={Trash2} onClick={confirm} loading={busy}>Buang {total} perubahan</Button>
        </>
      )}
    >
      <p className="text-base text-primary leading-normal">Semua perubahan yang belum diterbitkan akan dihapus dan draf dikembalikan sama dengan versi yang sedang tayang. Tindakan ini tidak bisa dibatalkan.</p>
    </Modal>
  )
}

/** Top bar: status chip + Buang draf · Pratinjau · Terbitkan. */
export default function StatusBar() {
  const { total, flush, conflict, reload } = useBuilder()
  const [publishOpen, setPublishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  return (
    <>
      {conflict && (
        <Alert
          variant="danger"
          title="Diubah admin lain, muat ulang."
          action={<Button size="sm" variant="outline" icon={RefreshCw} onClick={() => void reload()}>Muat ulang</Button>}
        >
          Draf ini baru saja disimpan dari tab/admin lain. Muat ulang untuk melihat versi terbaru — perubahan terakhirmu yang belum tersimpan tidak ditimpa diam-diam.
        </Alert>
      )}
      <div className="hidden lg:flex items-center justify-end gap-2 flex-wrap">
        <StatusChip className="mr-auto" />
        <Button variant="tool" icon={Trash2} onClick={() => setDiscardOpen(true)} disabled={total === 0 || conflict}>Buang draf</Button>
        <Button variant="outline" icon={ExternalLink} onClick={() => openPreviewTab(flush)}>Pratinjau</Button>
        <Button icon={total === 0 ? CheckCircle2 : Send} onClick={() => setPublishOpen(true)} disabled={total === 0 || conflict}>Terbitkan</Button>
      </div>
      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} />
      <DiscardModal open={discardOpen} onClose={() => setDiscardOpen(false)} />
    </>
  )
}

/** Mobile sticky bottom bar: Pratinjau + Terbitkan. */
export function MobileActionBar({ onPreview }: { onPreview: () => void }) {
  const { total, conflict } = useBuilder()
  const [publishOpen, setPublishOpen] = useState(false)
  return (
    <>
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-surface border-t border-border px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onPreview}>Pratinjau</Button>
        <Button onClick={() => setPublishOpen(true)} disabled={total === 0 || conflict}>Terbitkan</Button>
      </div>
      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} />
    </>
  )
}
