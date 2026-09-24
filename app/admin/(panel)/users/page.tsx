import { db } from '@/lib/db'
import { users, dailyUsage } from '@/drizzle/schema'
import { getGlobalLimit } from '@/lib/admin'
import { fmtDateTime, todayISO } from '@/lib/utils'
import { count, desc, sql } from 'drizzle-orm'
import Link from 'next/link'
import UserListActions from '@/components/admin/UserListActions'
import PageSizeSelect from '@/components/admin/PageSizeSelect'
export const dynamic = 'force-dynamic'

const PAGE_SIZES = [5, 10, 20, 50]
const DEFAULT_PAGE_SIZE = 5

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function EmailBadge({ verified }: { verified: boolean }) {
  return (
    <span
      title={verified ? 'Email terverifikasi' : 'Belum verifikasi email'}
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0 ${
        verified ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-amber-100 text-amber-600'
      }`}
    >
      {verified ? (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <span className="text-[9px] font-bold leading-none">!</span>
      )}
    </span>
  )
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>
}) {
  const { page: pageParam, pageSize: pageSizeParam } = await searchParams
  const today = todayISO()
  const globalLimit = await getGlobalLimit()

  const pageSize = PAGE_SIZES.includes(Number(pageSizeParam)) ? Number(pageSizeParam) : DEFAULT_PAGE_SIZE

  const [{ c: totalUsers }] = await db.select({ c: count() }).from(users)
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))
  const page = Math.min(Math.max(1, parseInt(pageParam ?? '1', 10) || 1), totalPages)
  const offset = (page - 1) * pageSize

  const pagedUsers = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    emailVerifiedAt: users.emailVerifiedAt,
    isActive: users.isActive,
    lastLoginAt: users.lastLoginAt,
    mustChangePassword: users.mustChangePassword,
  }).from(users).orderBy(desc(users.createdAt)).limit(pageSize).offset(offset)

  // Stats bounded to the current page (≤50 users), not the whole table.
  const usersWithStats = await Promise.all(pagedUsers.map(async u => {
    const [td] = await db.select({ cnt: sql<number>`coalesce(sum(${dailyUsage.count}), 0)` })
      .from(dailyUsage)
      .where(sql`${dailyUsage.userId} = ${u.id} AND ${dailyUsage.date} = ${today}`)
    return { ...u, todayUsage: Number(td.cnt ?? 0) }
  }))

  function pageHref(p: number) {
    return `/admin/users?page=${p}&pageSize=${pageSize}`
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Manajemen User</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Limit global: <strong className="text-[#111827]">{globalLimit} foto/hari</strong>
          <span className="ml-2 text-[#9CA3AF]">·</span>
          <span className="ml-2">{totalUsers} user</span>
        </p>
      </div>

      {/* ════════════════════════════════════════
          DESKTOP VIEW — tabel ringkas (md ke atas)
          ════════════════════════════════════════ */}
      <div className="hidden md:block bg-white ring-1 ring-[#E5E7EB] rounded-[18px] overflow-x-auto shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-[#6B7280] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Last Login</th>
              <th className="text-left px-4 py-3">Meal Hari Ini</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {usersWithStats.map((u, i) => (
              <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[#111827]">{u.username}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      u.isActive ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}>
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    {u.mustChangePassword && (
                      <span title="User wajib ganti password saat login berikutnya" className="text-amber-600">
                        <LockIcon />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#6B7280]">
                  {u.email ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#111827]">{u.email}</span>
                      <EmailBadge verified={!!u.emailVerifiedAt} />
                    </div>
                  ) : (
                    <span className="italic text-xs text-[#9CA3AF]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {u.lastLoginAt
                    ? <span className="text-[#111827] tabular-nums">{fmtDateTime(u.lastLoginAt)}</span>
                    : <span className="italic text-xs text-[#9CA3AF]">Belum pernah</span>
                  }
                </td>
                <td className="px-4 py-3 tabular-nums text-[#111827]">{u.todayUsage}</td>
                <td className="px-4 py-3">
                  <UserListActions user={u} riwayatHref={`/admin/riwayat/${u.id}?from=list&fromPage=${page}&fromPageSize=${pageSize}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ════════════════════════════════════════
          MOBILE VIEW — card list (di bawah md)
          ════════════════════════════════════════ */}
      <div className="md:hidden space-y-3">
        {usersWithStats.length === 0 && (
          <div className="text-center py-12 text-[#9CA3AF] text-sm">
            <div className="text-4xl mb-3">👤</div>
            <p>Belum ada user terdaftar</p>
          </div>
        )}

        {usersWithStats.map(u => (
          <div
            key={u.id}
            className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] shadow-[0_1px_4px_rgba(16,24,40,0.04)] overflow-hidden"
          >
            {/* Card Header — avatar + username + status */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#D4F5E4] flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-[#1F9D57] uppercase">
                    {u.username.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[#111827] text-sm truncate max-w-[140px]">
                      {u.username}
                    </span>
                    {u.mustChangePassword && (
                      <span title="User wajib ganti password" className="text-amber-600 shrink-0">
                        <LockIcon />
                      </span>
                    )}
                  </div>
                  {u.email && (
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-[#6B7280] truncate max-w-[150px]">{u.email}</p>
                      <EmailBadge verified={!!u.emailVerifiedAt} />
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                u.isActive ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}>
                {u.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            {/* Card Stats — grid 2 kolom */}
            <div className="grid grid-cols-2 divide-x divide-[#F3F4F6] border-b border-[#F3F4F6]">
              <div className="px-4 py-3">
                <p className="text-xs text-[#9CA3AF] mb-0.5">Last Login</p>
                <p className="text-xs font-medium text-[#111827]">
                  {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : <span className="italic text-[#9CA3AF]">Belum pernah</span>}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-[#9CA3AF] mb-0.5">Meal Hari Ini</p>
                <p className="text-base font-bold tabular-nums text-[#111827]">{u.todayUsage}</p>
              </div>
            </div>

            {/* Card Actions — full width buttons */}
            <UserListActions
              user={u}
              riwayatHref={`/admin/riwayat/${u.id}?from=list&fromPage=${page}&fromPageSize=${pageSize}`}
              mobileCard
            />
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════
          PAGINATION
          ════════════════════════════════════════ */}
      {totalUsers > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B7280] tabular-nums">Hal. {page} / {totalPages} · {totalUsers} user</span>
            <PageSizeSelect value={pageSize} />
          </div>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={pageHref(1)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition"
              >Pertama</Link>
            )}
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition"
              >← Sebelumnya</Link>
            ) : (
              <span className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#D1D5DB] cursor-not-allowed">← Sebelumnya</span>
            )}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition"
              >Berikutnya →</Link>
            ) : (
              <span className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#D1D5DB] cursor-not-allowed">Berikutnya →</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
