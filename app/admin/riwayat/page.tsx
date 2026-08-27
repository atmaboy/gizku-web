import { db } from '@/lib/db'
import { users, meals } from '@/drizzle/schema'
import { ilike, eq, count } from 'drizzle-orm'
import Link from 'next/link'
export const dynamic = 'force-dynamic'

export default async function RiwayatSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const searched = query.length > 0

  let results: { id: string; username: string; email: string | null; totalMeals: number }[] = []
  if (searched) {
    const rows = await db.select({ id: users.id, username: users.username, email: users.email })
      .from(users).where(ilike(users.username, `%${query}%`)).limit(20)
    results = await Promise.all(rows.map(async u => {
      const [{ c }] = await db.select({ c: count() }).from(meals).where(eq(meals.userId, u.id))
      return { ...u, totalMeals: c }
    }))
  }

  return (
    <div className="max-w-[640px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Riwayat</h1>
        <p className="text-sm text-[#6B7280] mt-1">Cari username untuk melihat riwayat analisa makanan.</p>
      </div>

      <form action="/admin/riwayat" method="get" className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] p-4 flex gap-2 shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
        <div className="relative flex-1">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={query}
            required
            placeholder="Cari username…"
            className="w-full pl-9 pr-3 py-2.5 text-base rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[#111827]
              placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#2ECC71] text-white hover:bg-[#28B765] transition min-h-[44px] shrink-0"
        >
          Cari
        </button>
      </form>

      {!searched && (
        <div className="text-center py-16 px-6 text-[#9CA3AF]">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm max-w-xs mx-auto leading-relaxed">
            Daftar tidak dimuat otomatis agar query tetap ringan. Cari username user untuk melihat riwayat analisa makanannya.
          </p>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="text-center py-16 text-[#6B7280] text-sm">
          Tidak ada user dengan username &ldquo;{query}&rdquo;
        </div>
      )}

      {searched && results.length > 0 && (
        <div className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] divide-y divide-[#F3F4F6] overflow-hidden shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
          {results.map(u => (
            <Link
              key={u.id}
              href={`/admin/riwayat/${u.id}?from=search&q=${encodeURIComponent(query)}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition"
            >
              <div className="w-9 h-9 rounded-full bg-[#D4F5E4] flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-[#1F9D57] uppercase">{u.username.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[#111827] truncate">{u.username}</p>
                <p className="text-xs text-[#6B7280] truncate">{u.email ?? '—'}</p>
              </div>
              <span className="text-xs text-[#6B7280] whitespace-nowrap tabular-nums">{u.totalMeals} entri</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
