'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fmtDateTime } from '@/lib/utils'
import BlastComposeModal from '@/components/admin/BlastComposeModal'
import BlastDetailModal from '@/components/admin/BlastDetailModal'

type Blast = {
  id: string
  batchName: string
  title: string
  targetType: string
  targetUsernames: string[] | null
  status: 'scheduled' | 'sending' | 'sent' | 'canceled' | 'failed'
  scheduledAt: string | null
  sentAt: string | null
  sentCount: number
  clickedCount: number
  readCount: number
}

const STATUS_LABEL: Record<Blast['status'], string> = {
  scheduled: 'Dijadwalkan',
  sending: 'Mengirim',
  sent: 'Terkirim',
  canceled: 'Dibatalkan',
  failed: 'Gagal',
}
const STATUS_STYLE: Record<Blast['status'], string> = {
  scheduled: 'bg-blue-50 text-blue-600',
  sending: 'bg-amber-50 text-amber-600',
  sent: 'bg-[#D4F5E4] text-[#1F9D57]',
  canceled: 'bg-[#F3F4F6] text-[#6B7280]',
  failed: 'bg-red-50 text-red-600',
}

function targetLabel(b: Blast) {
  return b.targetType === 'all' ? 'Seluruh User' : `${(b.targetUsernames ?? []).length} username`
}

export default function BlastPage() {
  const [blasts, setBlasts] = useState<Blast[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [canceling, setCanceling] = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    const res = await fetch(`/api/admin/blast?action=list&page=${p}&per_page=15`)
    const d = await res.json()
    setBlasts(d.blasts ?? [])
    setPage(d.page ?? p)
    setTotalPages(d.totalPages ?? 1)
    setTotal(d.total ?? 0)
    setLoading(false)
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Blast Push Notifikasi</h1>
          <p className="text-sm text-[#6B7280] mt-1">{total} batch terkirim/terjadwal</p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="shrink-0 bg-[#2ECC71] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#28B765] transition min-h-[44px]"
        >
          + Kirim Baru
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white ring-1 ring-[#E5E7EB] rounded-xl overflow-x-auto shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-[#6B7280] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nama Batch</th>
              <th className="text-left px-4 py-3">Notifikasi</th>
              <th className="text-left px-4 py-3">Target</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Waktu Pengiriman</th>
              <th className="text-left px-4 py-3">Terkirim</th>
              <th className="text-left px-4 py-3">Diklik</th>
              <th className="text-left px-4 py-3">Dibaca</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading && blasts.map((b, i) => (
              <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                <td className="px-4 py-3 font-medium text-[#111827]">{b.batchName}</td>
                <td className="px-4 py-3 text-[#6B7280] max-w-[200px] truncate">{b.title}</td>
                <td className="px-4 py-3 text-[#6B7280]">{targetLabel(b)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                  {b.scheduledAt ? fmtDateTime(b.scheduledAt) : 'Segera'}
                </td>
                <td className="px-4 py-3 tabular-nums text-[#111827]">{b.sentCount}</td>
                <td className="px-4 py-3 tabular-nums text-[#111827]">{b.clickedCount}</td>
                <td className="px-4 py-3 tabular-nums text-[#111827]">{b.readCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {b.status === 'scheduled' && (
                      <button
                        onClick={() => cancelBlast(b.id)}
                        disabled={canceling === b.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition min-h-[36px] disabled:opacity-50"
                      >Batalkan</button>
                    )}
                    <button
                      onClick={() => setDetailId(b.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition min-h-[36px]"
                    >Detail</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && blasts.length === 0 && (
          <div className="text-center py-12 text-[#9CA3AF] text-sm">Belum ada batch notifikasi.</div>
        )}
        {loading && (
          <div className="text-center py-12 text-[#9CA3AF] text-sm">Memuat…</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading && <div className="text-center py-12 text-[#9CA3AF] text-sm">Memuat…</div>}
        {!loading && blasts.length === 0 && (
          <div className="text-center py-12 text-[#9CA3AF] text-sm">Belum ada batch notifikasi.</div>
        )}
        {!loading && blasts.map(b => (
          <div key={b.id} className="bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.04)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-[#111827] text-sm truncate">{b.batchName}</p>
                <p className="text-xs text-[#6B7280] truncate">{b.title}</p>
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
              <span>{b.scheduledAt ? fmtDateTime(b.scheduledAt) : 'Segera'}</span>
            </div>
            <div className="flex border-t border-[#F3F4F6]">
              {b.status === 'scheduled' && (
                <button
                  onClick={() => cancelBlast(b.id)}
                  disabled={canceling === b.id}
                  className="flex-1 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition min-h-[48px] disabled:opacity-50"
                >Batalkan</button>
              )}
              <button
                onClick={() => setDetailId(b.id)}
                className="flex-1 py-3 text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] transition min-h-[48px]"
              >Detail</button>
            </div>
          </div>
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

      {showCompose && (
        <BlastComposeModal
          onClose={() => setShowCompose(false)}
          onCreated={() => { setShowCompose(false); load(1) }}
        />
      )}
      {detailId && (
        <BlastDetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}
