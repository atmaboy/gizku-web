'use client'
import { useEffect, useState } from 'react'
import { fmtDateTime } from '@/lib/utils'

type Blast = {
  id: string
  batchName: string
  title: string
  body: string
  targetType: string
  targetUsernames: string[] | null
  status: string
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

export default function BlastDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [blast, setBlast] = useState<Blast | null>(null)
  const [failures, setFailures] = useState<Failure[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/blast?action=detail&id=${id}`)
      const d = await res.json()
      if (res.ok) { setBlast(d.blast); setFailures(d.failures ?? []) }
      setLoading(false)
    })()
  }, [id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white ring-1 ring-[#E5E7EB] shadow-xl flex flex-col w-full rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[85vh] sm:max-w-lg">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-[#E5E7EB]">
          <h2 className="text-base font-semibold text-[#111827]">Detail Batch</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4">
          {loading && <p className="text-sm text-[#6B7280] text-center py-8">Memuat…</p>}
          {!loading && !blast && <p className="text-sm text-[#6B7280] text-center py-8">Batch tidak ditemukan.</p>}

          {!loading && blast && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">{blast.batchName}</h3>
                <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
                  <p>Target: <span className="text-[#111827]">
                    {blast.targetType === 'all' ? 'Seluruh User' : (blast.targetUsernames ?? []).map(u => `@${u}`).join(', ')}
                  </span></p>
                  <p>Dibuat: <span className="text-[#111827]">{fmtDateTime(blast.createdAt)}</span></p>
                  <p>Waktu Pengiriman: <span className="text-[#111827]">{blast.scheduledAt ? fmtDateTime(blast.scheduledAt) : 'Segera'}</span></p>
                  <p>Waktu Terkirim: <span className="text-[#111827]">{blast.sentAt ? fmtDateTime(blast.sentAt) : '-'}</span></p>
                </div>
              </div>

              <div className="bg-[#F9FAFB] rounded-xl p-3.5 space-y-1.5">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Judul Notifikasi</p>
                <p className="text-sm text-[#111827]">{blast.title}</p>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide pt-2">Isi Pesan</p>
                <p className="text-sm text-[#111827]">{blast.body}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <StatBox label="Ditargetkan" value={blast.targetedCount} />
                <StatBox label="Terkirim" value={blast.sentCount} color="#1F9D57" />
                <StatBox label="Diklik" value={blast.clickedCount} color="#3B82F6" />
                <StatBox label="Dibaca" value={blast.readCount} color="#A855F7" />
                <StatBox label="Gagal" value={blast.failedCount} color="#EF4444" />
              </div>

              {failures.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Rincian Kegagalan Pengiriman</p>
                  <div className="space-y-1.5">
                    {failures.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <span className="text-red-700">{f.errorMessage ?? 'Tidak diketahui'}</span>
                        <span className="text-red-700 font-semibold tabular-nums">{f.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-[#E5E7EB]">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition min-h-[48px]"
          >Tutup</button>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color = '#111827' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-3 text-center">
      <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[11px] text-[#6B7280] mt-0.5">{label}</p>
    </div>
  )
}
