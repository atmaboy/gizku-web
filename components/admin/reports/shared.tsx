'use client'
import { AlertTriangle, Check, Clock, Inbox, Mail, Play, Reply, Smartphone, X, type LucideIcon } from 'lucide-react'
import { Badge, Card, TrackedLink, type BadgeVariant } from '@/components/admin/ui'
import { cn } from '@/lib/utils'

export type ReportStatus = 'open' | 'replied' | 'waiting' | 'done'
export type ReportSource = 'app' | 'email'

export type ReportRow = {
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
  ticketNumber: number
}

export type Attachment = { id?: string; url: string; kind: 'image' | 'video'; sizeBytes?: number | null }
export type ThreadMessage = { id: string; sender: 'admin' | 'user'; body: string; createdAt: string; attachments: Attachment[] }
export type ThreadUser = {
  id: string; username: string; email: string | null
  isActive: boolean; dailyLimit: number; isCustomLimit: boolean; todayUsage: number
} | null
export type ThreadData = { report: ReportRow; user: ThreadUser; messages: ThreadMessage[] }

export type FolderKey = 'all' | ReportStatus

export const STATUS_LABEL: Record<ReportStatus, string> = { open: 'Open', replied: 'Dibalas', waiting: 'Menunggu user', done: 'Selesai' }
export const STATUS_BADGE: Record<ReportStatus, BadgeVariant> = { open: 'warning', replied: 'success', waiting: 'secondary', done: 'soft' }

export const FOLDERS: { key: FolderKey; label: string; icon: LucideIcon }[] = [
  { key: 'all', label: 'Semua', icon: Inbox },
  { key: 'open', label: 'Open', icon: AlertTriangle },
  { key: 'replied', label: 'Dibalas', icon: Reply },
  { key: 'waiting', label: 'Menunggu user', icon: Clock },
  { key: 'done', label: 'Selesai', icon: Check },
]

export function displayName(r: { username: string | null; fromEmail?: string | null }) {
  return r.username || r.fromEmail || '?'
}

export function countByStatus(reports: ReportRow[] | null) {
  const base: Record<FolderKey, number> = { all: reports?.length ?? 0, open: 0, replied: 0, waiting: 0, done: 0 }
  reports?.forEach(r => { base[r.status]++ })
  return base
}

export function StatusBadge({ status, size }: { status: ReportStatus; size?: 'sm' | 'md' }) {
  return <Badge variant={STATUS_BADGE[status]} size={size}>{STATUS_LABEL[status]}</Badge>
}

export function SourcePill({ source }: { source: ReportSource }) {
  const Icon = source === 'app' ? Smartphone : Mail
  return (
    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-pill text-xs font-medium bg-muted text-secondary whitespace-nowrap shrink-0">
      <Icon size={12} aria-hidden />
      {source === 'app' ? 'App' : 'Email'}
    </span>
  )
}

export function AttachmentThumb({ att, size, onRemove }: { att: Attachment; size: number; onRemove?: () => void }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full rounded-sm overflow-hidden border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500" aria-label={att.kind === 'image' ? 'Buka gambar lampiran' : 'Buka video lampiran'}>
        {att.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={att.url} alt="Lampiran" className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-bark-800 text-white relative">
            <Play size={size >= 80 ? 24 : 18} aria-hidden />
            {size >= 80 && <span className="absolute bottom-1 left-1.5 text-[11px] font-medium">Video</span>}
          </div>
        )}
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Hapus lampiran"
          title="Hapus lampiran"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bark-900 text-white flex items-center justify-center shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </div>
  )
}

/** AdminLTE mailbox "folders" card. Either controlled (onSelect) or link-based (hrefs). */
export function FolderCard({ counts, active, onSelect, className }: {
  counts: Record<FolderKey, number>; active: FolderKey | null; onSelect?: (k: FolderKey) => void; className?: string
}) {
  return (
    <Card title="Status Laporan" icon={Inbox} noPadding className={className}>
      <ul className="list-none m-0 p-2 flex flex-col gap-0.5">
        {FOLDERS.map(f => {
          const isActive = active === f.key
          const cls = cn(
            'w-full flex items-center gap-2.5 px-3 min-h-10 rounded-sm text-base transition-colors text-left',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
            isActive ? 'bg-green-50 text-green-800 font-semibold' : 'text-bark-700 hover:bg-muted',
          )
          const inner = (
            <>
              <f.icon size={16} aria-hidden className={isActive ? 'text-brand' : 'text-clay-500'} />
              <span className="flex-1">{f.label}</span>
              {f.key === 'open'
                ? counts.open > 0 && <Badge variant="warning" pill size="sm">{counts.open}</Badge>
                : <span className="text-sm text-secondary tabular-nums">{counts[f.key]}</span>}
            </>
          )
          return (
            <li key={f.key}>
              {onSelect
                ? <button type="button" aria-pressed={isActive} onClick={() => onSelect(f.key)} className={cls}>{inner}</button>
                : <TrackedLink href={f.key === 'all' ? '/admin/reports' : `/admin/reports?status=${f.key}`} aria-current={isActive ? 'true' : undefined} className={cls}>{inner}</TrackedLink>}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
