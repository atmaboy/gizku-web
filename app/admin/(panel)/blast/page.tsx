'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { fmtDateTime } from '@/lib/utils'

type Blast = {
  id: string
  batchName: string
  channel: 'push' | 'telegram' | 'email'
  title: string
  targetType: string
  targetUsernames: string[] | null
  status: 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed'
  scheduledAt: string | null
  sentAt: string | null
  sentCount: number
  clickedCount: number
  readCount: number
}

const STATUS_LABEL: Record<Blast['status'], string> = {
  scheduled: 'Terjadwal',
  sending: 'Mengirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  failed: 'Gagal',
}
const STATUS_STYLE: Record<Blast['status'], string> = {
  scheduled: 'bg-[#F3EFE7] text-[#92715A]',
  sending: 'bg-amber-50 text-amber-600',
  completed: 'bg-[#D4F5E4] text-[#1F9D57]',
  cancelled: 'bg-[#F3F4F6] text-[#6B7280]',
  failed: 'bg-red-50 text-red-600',
}
const CHANNEL_LABEL: Record<Blast['channel'], string> = {
  push: 'Push Notifikasi',
  telegram: 'Telegram',
  email: 'Email',
}
const CHANNEL_STYLE: Record<Blast['channel'], string> = {
  push: 'bg-[#D4F5E4] text-[#1F9D57]',
  telegram: 'bg-[#EAF4FC] text-[#2B7FC1]',
  email: 'bg-[#FEF3C7] text-[#92400E]',
}

function targetLabel(b: Blast) {
  if (b.targetType === 'all') return 'Seluruh User'
  const n = (b.targetUsernames ?? []).length
  return b.channel === 'email' ? `${n} email` : `${n} username`
}

export default function BlastHistoryPage() {
  const router = useRouter()
  const [blasts, setBlasts] = useState<Blast[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [canceling, setCanceling] = useState<string | null>(null)

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
    if (!confirm('Batalkan pengiriman batch ini?')) return
    setCanceling(id)
    const res = await fetch('/api/admin/blast?action=cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const d = await res.json()
    if (res.ok) { toast.success('Batch dibatalkan'); load(page) }
    else toast.error(d.error)
    setCanceling(null)
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Blast Notifikasi</h1>
        <p className="text-sm text-[#6B7280] mt-1">Kirim notifikasi push atau Telegram ke seluruh atau sebagian user Gizku, langsung atau terjadwal.</p>
        <div className="inline-flex gap-0.5 bg-[#F3F4F6] p-0.5 rounded-xl mt-5">
          <Link
            href="/admin/blast/new"
            className="text-sm font-semibold px-4 py-2 rounded-lg transition text-[#6B7280] hover:text-[#111827]"
          >
            Kirim Baru
          </Link>
          <span className="text-sm font-semibold px-4 py-2 rounded-lg bg-white text-[#111827] shadow-[0_1px_4px_rgba(16,24,40,0.06)]">
            Riwayat Batch ({total})
          </span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white ring-1 ring-[#E5E7EB] rounded-xl overflow-x-auto shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-[#6B7280] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nama Batch</th>
              <th className="text-left px-4 py-3">Channel</th>
              <th className="text-left px-4 py-3">Notifikasi</th>
              <th className="text-left px-4 py-3">Target</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Waktu Pengiriman</th>
              <th className="text-right px-4 py-3">Terkirim</th>
              <th className="text-right px-4 py-3">Diklik</th>
              <th className="text-right px-4 py-3">Dibaca</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading && blasts.map((b, i) => (
              <tr
                key={b.id}
                className={`cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                onClick={() => router.push(`/admin/blast/${b.id}`)}
              >
                <td className="px-4 py-3 font-medium text-[#111827] max-w-[220px] truncate">{b.batchName}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${CHANNEL_STYLE[b.channel]}`}>
                    {CHANNEL_LABEL[b.channel]}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6B7280] max-w-[200px] truncate">{b.title || '—'}</td>
                <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{targetLabel(b)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                  {b.scheduledAt && b.status === 'scheduled' ? fmtDateTime(b.scheduledAt) : (b.sentAt ? fmtDateTime(b.sentAt) : '—')}
                </td>
                <td className="px-4 py-3 tabular-nums text-right text-[#111827]">{b.sentCount}</td>
                <td className="px-4 py-3 tabular-nums text-right text-[#111827]">{b.clickedCount}</td>
                <td className="px-4 py-3 tabular-nums text-right text-[#111827]">{b.readCount}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  {b.status === 'scheduled' ? (
                    <button
                      onClick={() => cancelBlast(b.id)}
                      disabled={canceling === b.id}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition min-h-[36px] disabled:opacity-50"
                    >Batalkan</button>
                  ) : (
                    <Link
                      href={`/admin/blast/${b.id}`}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition inline-block min-h-[36px]"
                    >Detail</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && loadError && (
          <div className="text-center py-12 text-sm">
            <p className="text-red-500 font-medium">{loadError}</p>
            <button onClick={() => load(page)} className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition">Coba lagi</button>
          </div>
        )}
        {!loading && !loadError && blasts.length === 0 && (
          <div className="text-center py-12 text-[#9CA3AF] text-sm">Belum ada batch notifikasi.</div>
        )}
        {loading && (
          <div className="text-center py-12 text-[#9CA3AF] text-sm">Memuat…</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading && <div className="text-center py-12 text-[#9CA3AF] text-sm">Memuat…</div>}
        {!loading && loadError && (
          <div className="text-center py-12 text-sm">
            <p className="text-red-500 font-medium">{loadError}</p>
            <button onClick={() => load(page)} className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition">Coba lagi</button>
          </div>
        )}
        {!loading && !loadError && blasts.length === 0 && (
          <div className="text-center py-12 text-[#9CA3AF] text-sm">Belum ada batch notifikasi.</div>
        )}
        {!loading && blasts.map(b => (
          <Link key={b.id} href={`/admin/blast/${b.id}`} className="block bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.04)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-[#111827] text-sm truncate">{b.batchName}</p>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold ${CHANNEL_STYLE[b.channel]}`}>
                  {CHANNEL_LABEL[b.channel]}
                </span>
              </div>
              <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLE[b.status]}`}>
                {STATUS_LABEL[b.status]}
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#F3F4F6] border-b border-[#F3F4F6]">
              <div className="px-3 py-2.5 text-center">
                <p className="text-xs text-[#9CA3AF]">Terkirim</p>
                <p className="text-sm font-bold tabular-nums text-[#111827]">{b.sentCount}</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="text-xs text-[#9CA3AF]">Diklik</p>
                <p className="text-sm font-bold tabular-nums text-[#111827]">{b.clickedCount}</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="text-xs text-[#9CA3AF]">Dibaca</p>
                <p className="text-sm font-bold tabular-nums text-[#111827]">{b.readCount}</p>
              </div>
            </div>
            <div className="px-4 py-2.5 text-xs text-[#6B7280] flex items-center justify-between">
              <span>{targetLabel(b)}</span>
              <span>{b.scheduledAt && b.status === 'scheduled' ? fmtDateTime(b.scheduledAt) : (b.sentAt ? fmtDateTime(b.sentAt) : '—')}</span>
            </div>
            {b.status === 'scheduled' && (
              <button
                onClick={e => { e.preventDefault(); cancelBlast(b.id) }}
                disabled={canceling === b.id}
                className="w-full py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition min-h-[48px] disabled:opacity-50 border-t border-[#F3F4F6]"
              >Batalkan</button>
            )}
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {!loading && blasts.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[#6B7280] tabular-nums">Hal. {page} / {totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <button onClick={() => load(1)} className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition">Pertama</button>
            )}
            <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-40">← Sebelumnya</button>
            <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition disabled:opacity-40">Berikutnya →</button>
          </div>
        </div>
      )}
    </div>
  )
}
