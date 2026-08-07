import { db } from '@/lib/db'
import { reports } from '@/drizzle/schema'
import { fmtDateTime } from '@/lib/utils'
import { desc } from 'drizzle-orm'
import ReportActions from '@/components/admin/ReportActions'
export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const rows = await db.select().from(reports).orderBy(desc(reports.createdAt))
  const open = rows.filter(r => r.status === 'open')
  const closed = rows.filter(r => r.status !== 'open')

  const ReportList = ({ items }: { items: typeof rows }) => (
    <div>
      {/* ════════════════════════════════════════
          DESKTOP VIEW — tabel (sm ke atas)
          ════════════════════════════════════════ */}
      <div className="hidden sm:block bg-white ring-1 ring-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-[#6B7280] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Pesan</th>
              <th className="text-left px-4 py-3">Waktu</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                <td className="px-4 py-3 text-[#6B7280]">
                  {r.username ?? '—'}
                  {r.source === 'email' && (
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4F46E5] bg-[#EEF2FF] rounded-full px-2 py-0.5">
                        ✉ {r.fromEmail}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 max-w-sm text-[#111827]">{r.message}</td>
                <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                <td className="px-4 py-3"><ReportActions id={r.id} status={r.status} /></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#6B7280]">Tidak ada laporan</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ════════════════════════════════════════
          MOBILE VIEW — card list (di bawah sm)
          ════════════════════════════════════════ */}
      <div className="sm:hidden space-y-3">
        {items.length === 0 && (
          <div className="text-center py-10 text-[#9CA3AF] text-sm">
            <div className="text-3xl mb-2">📭</div>
            <p>Tidak ada laporan</p>
          </div>
        )}
        {items.map(r => (
          <div
            key={r.id}
            className="bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.04)] overflow-hidden"
          >
            {/* Card Header — user + waktu */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#4F46E5] uppercase">
                    {(r.username ?? '?').charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#111827] truncate">
                  {r.username ?? <span className="italic text-[#9CA3AF] font-normal">Anonim</span>}
                </span>
              </div>
              <span className="text-xs text-[#9CA3AF] whitespace-nowrap shrink-0 ml-2">
                {fmtDateTime(r.createdAt)}
              </span>
            </div>

            {r.source === 'email' && (
              <div className="px-4 pt-2.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4F46E5] bg-[#EEF2FF] rounded-full px-2 py-0.5">
                  ✉ {r.fromEmail}
                </span>
              </div>
            )}

            {/* Card Body — pesan laporan */}
            <div className="px-4 py-3">
              <p className="text-sm text-[#374151] leading-relaxed">{r.message}</p>
            </div>

            {/* Card Footer — tombol aksi */}
            <div className="border-t border-[#F3F4F6] px-4 py-2.5">
              <ReportActions id={r.id} status={r.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-[#111827]">Laporan User</h1>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280] mb-3">Open ({open.length})</h2>
        <ReportList items={open} />
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280] mb-3">Selesai ({closed.length})</h2>
        <ReportList items={closed} />
      </div>
    </div>
  )
}
