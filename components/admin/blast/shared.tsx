import { Bell, Mail, Send, type LucideIcon } from 'lucide-react'
import type { BadgeVariant } from '@/components/admin/ui'

export type BlastChannel = 'push' | 'telegram' | 'email'
export type BlastStatus = 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'

export const BLAST_STATUS_LABEL: Record<BlastStatus, string> = {
  scheduled: 'Terjadwal',
  sending: 'Mengirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  failed: 'Gagal',
}
export const BLAST_STATUS_BADGE: Record<BlastStatus, BadgeVariant> = {
  scheduled: 'light',
  sending: 'warning',
  completed: 'success',
  cancelled: 'secondary',
  failed: 'danger',
}
export const CHANNEL_META: Record<BlastChannel, { label: string; short: string; icon: LucideIcon }> = {
  push:     { label: 'Push Notifikasi', short: 'Push',     icon: Bell },
  telegram: { label: 'Telegram',        short: 'Telegram', icon: Send },
  email:    { label: 'Email',           short: 'Email',    icon: Mail },
}

export function ChannelLabel({ channel, short }: { channel: BlastChannel; short?: boolean }) {
  const m = CHANNEL_META[channel]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <m.icon size={14} className="text-secondary" aria-hidden />{short ? m.short : m.label}
    </span>
  )
}
