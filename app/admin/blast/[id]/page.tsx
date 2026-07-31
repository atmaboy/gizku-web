'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fmtDateTime } from '@/lib/utils'

type Blast = {
  id: string
  batchName: string
  channel: 'push' | 'telegram'
  title: string
  body: string
  targetType: string
  targetUsernames: string[] | null
  status: 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  targetedCount: number
  sentCount: number
  clickedCount: number
  readCount: number
  failedCount: number
}
type Failure = { errorMessage: string | null; count: number }
type Provider = { provider: string; targeted: number; success: number; failed: number }

const STATUS_LABEL: Record<Blast['status'], string> = {
  scheduled: 'Terjadwal', sending: 'Mengirim', completed: 'Selesai', cancelled: 'Dibatalkan', failed: 'Gagal',
}
const STATUS_STYLE: Record<Blast['status'], string> = {
  scheduled: 'bg-[#F3EFE7] text-[#92715A]',
  sending: 'bg-amber-50 text-amber-600',
  completed: 'bg-[#D4F5E4] text-[#1F9D57]',
  cancelled: 'bg-[#F3F4F6] text-[#6B7280]',
  failed: 'bg-red-50 text-red-600',
}
const CHANNEL_LABEL: Record<Blast['channel'], string> = { push: 'Push Notifikasi', telegram: 'Telegram' }
const PROVIDER_LABEL: Record<string, string> = {
  fcm: 'FCM — Google (Android)',
  apns: 'APNs — Apple (iOS)',
  telegram: 'Telegram Bot API',
}

function pct(a: number, b: number) {
  if (!b) return '0.0'
  return ((a / b) * 100).toFixed(1)
}

function StatBox({ label, value, rate, color = '#111827', dim = false }: { label: string; value: string | number; rate?: string; color?: string; dim?: boolean }) {
  return (
    <div className={`bg-white ring-1 ring-[#E5E7EB] rounded-xl p-4 ${dim ? 'opacity-45' : ''}`}>
      <div className="text-[11px] text-[#9CA3AF] mb-1.5">{label}</div>
      <div className="text-xl font-bold text-[#111827] tabular-nums">{value}</div>
      {rate !== undefined && <div className="text-[11px] font-semibold mt-0.5" style={{ color }}>{rate}%</div>}
    </div>
  )
}

export default function BlastDetailPage() {
  const params = useParams<{ id: string }>()
  const [blast, setBlast] = useState<Blast | null>(null)
  const [failures, setFailures] = useState<Failure[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/blast?action=detail&id=${params.id}`)
      const d = await res.json()
      if (res.ok) {
        setBlast(d.blast); setFailures(d.failures ?? []); setProviders(d.providers ?? [])
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })()
  }, [params.id])

  if (loading) {
    return <div className="text-center py-16 text-[#9CA3AF] text-sm">Memuat…</div>
  }
  if (notFound || !blast) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[#6B7280] mb-4">Batch tidak ditemukan.</p>
        <Link href="/admin/blast" className="text-sm text-[#2ECC71] font-medium hover:underline">← Kembali ke Riwayat</Link>
      </div>
    )
  }

  const targetLabel = blast.targetType === 'all' ? 'Semua User' : `${(blast.targetUsernames ?? []).length} username`
  const sendTimeLabel = (blast.status === 'scheduled' || blast.status === 'cancelled') ? fmtDateTime(blast.scheduledAt) : fmtDateTime(blast.sentAt)
  const deliveredTimeLabel = (blast.status === 'completed' || blast.status === 'failed') ? fmtDateTime(blast.sentAt) : '—'
  const hasStats = blast.status === 'completed' || blast.status === 'failed'
  const isChannelPush = blast.channel === 'push'
  const failedWithReason = failures.filter(f => f.count > 0)
  const totalFailedForPct = blast.failedCount

  return (
    <div className="space-y-6 w-full max-w-[1100px]">
      <Link href="/admin/blast" className="inline-flex items-center gap-1.5 text-[#6B7280] text-sm font-medium hover:text-[#111827] transition">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        Kembali ke Riwayat
      </Link>

      <div>
        <div className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">Nama Batch</div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-[22px] font-bold text-[#111827]">{blast.batchName}</h1>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLE[blast.status]}`}>
            {STATUS_LABEL[blast.status]}
          </span>
        </div>
        <div className="flex gap-4 flex-wrap mt-3 text-xs text-[#9CA3AF]">
          <span>Channel: <strong className="text-[#6B7280]">{CHANNEL_LABEL[blast.channel]}</strong></span>
          <span>Target: <strong className="text-[#6B7280]">{targetLabel}</strong></span>
          <span>Dibuat: <strong className="text-[#6B7280]">{fmtDateTime(blast.createdAt)}</strong></span>
          <span>Waktu Pengiriman: <strong className="text-[#6B7280]">{sendTimeLabel}</strong></span>
          <span>Waktu Terkirim: <strong className="text-[#6B7280]">{deliveredTimeLabel}</strong></span>
        </div>
      </div>

      <div className="bg-[#F9FAFB] rounded-xl px-5 py-4">
        {isChannelPush && (
          <>
            <div className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">Judul Notifikasi</div>
            <div className="text-sm font-semibold text-[#111827] mb-3">{blast.title}</div>
          </>
        )}
        <div className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">{isChannelPush ? 'Isi Pesan' : 'Isi Chat Telegram'}</div>
        <div className="text-sm text-[#6B7280] leading-relaxed">{blast.body}</div>
      </div>

      {blast.status === 'scheduled' && (
        <div className="flex items-center gap-2.5 bg-[#F9FAFB] rounded-[10px] px-4 py-3 text-xs text-[#6B7280]">
          🕐 Notifikasi ini masih menunggu jadwal pengiriman. Metrik akan terisi setelah batch dikirim.
        </div>
      )}
      {blast.status === 'cancelled' && (
        <div className="flex items-center gap-2.5 bg-[#F3F4F6] rounded-[10px] px-4 py-3 text-xs text-[#6B7280]">
          🚫 Notifikasi terjadwal ini dibatalkan sebelum dikirim.
        </div>
      )}
      {blast.status === 'sending' && (
        <div className="flex items-center gap-2.5 bg-amber-50 rounded-[10px] px-4 py-3 text-xs text-amber-700">
          ⏳ Notifikasi sedang dalam proses pengiriman.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <StatBox label="Ditargetkan" value={hasStats ? blast.targetedCount : '—'} />
        <StatBox label="Terkirim" value={hasStats ? blast.sentCount : '—'} rate={hasStats ? pct(blast.sentCount, blast.targetedCount) : undefined} color="#1F9D57" />
        <StatBox
          label={isChannelPush ? 'Diklik' : 'Diklik (n/a)'}
          value={isChannelPush ? (hasStats ? blast.clickedCount : '—') : 'N/A'}
          rate={isChannelPush && hasStats ? pct(blast.clickedCount, blast.sentCount) : undefined}
          color="#3B82F6"
          dim={!isChannelPush}
        />
        <StatBox label="Dibaca" value={hasStats ? blast.readCount : '—'} rate={hasStats ? pct(blast.readCount, blast.sentCount) : undefined} color="#A855F7" />
        <StatBox label="Gagal" value={hasStats ? blast.failedCount : '—'} rate={hasStats ? pct(blast.failedCount, blast.targetedCount) : undefined} color="#EF4444" />
      </div>

      {hasStats && providers.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {providers.map(p => (
            <div key={p.provider} className="flex-1 min-w-[280px] bg-white ring-1 ring-[#E5E7EB] rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-[#111827]">{PROVIDER_LABEL[p.provider] ?? p.provider}</div>
                  <div className="text-[11px] text-[#9CA3AF] mt-0.5">{p.targeted} perangkat ditargetkan</div>
                </div>
                <div className="flex gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#D4F5E4] text-[#1F9D57]">{p.success} sukses</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600">{p.failed} gagal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasStats && failedWithReason.length > 0 && (
        <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl px-5 py-4">
          <h3 className="text-[13px] font-semibold text-[#111827] mb-3">Rincian Kegagalan Pengiriman</h3>
          <div className="flex flex-col gap-2.5">
            {failedWithReason.map((f, i) => {
              const p = pct(f.count, totalFailedForPct)
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#6B7280]">{f.errorMessage ?? 'Tidak diketahui'}</span>
                    <span className="text-[#6B7280] font-semibold">{f.count} ({p}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${p}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
