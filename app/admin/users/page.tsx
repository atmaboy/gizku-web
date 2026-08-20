import { db } from '@/lib/db'
import { users, meals, dailyUsage } from '@/drizzle/schema'
import { getGlobalLimit } from '@/lib/admin'
import { fmtDateTime, todayISO } from '@/lib/utils'
import { count, desc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import UserActions from '@/components/admin/UserActions'
export const dynamic = 'force-dynamic'

const PER_PAGE = 20

function fmtDate(dt: Date | string | null | undefined) {
  if (!dt) return null
  return new Date(dt).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const today = todayISO()
  const globalLimit = await getGlobalLimit()

  const [{ c: totalUsers }] = await db.select({ c: count() }).from(users)
  const totalPages = Math.max(1, Math.ceil(totalUsers / PER_PAGE))
  const page = Math.min(Math.max(1, parseInt(pageParam ?? '1', 10) || 1), totalPages)
  const offset = (page - 1) * PER_PAGE

  const pagedUsers = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    emailVerifiedAt: users.emailVerifiedAt,
    isActive: users.isActive,
    dailyLimit: users.dailyLimit,
    createdAt: users.createdAt,
    lastLoginAt: users.lastLoginAt,
    passwordChangedAt: users.passwordChangedAt,
    passwordChangedBy: users.passwordChangedBy,
    mustChangePassword: users.mustChangePassword,
    adminResetBy: users.adminResetBy,
    betaOptinAndroid: users.betaOptinAndroid,
    betaOptinAndroidAt: users.betaOptinAndroidAt,
  }).from(users).orderBy(desc(users.createdAt)).limit(PER_PAGE).offset(offset)

  // Stats query is per-user (2 queries each) — now bounded to one page (≤20 users)
  // instead of the whole table, which is what made this page slow at scale.
  const usersWithStats = await Promise.all(pagedUsers.map(async u => {
    const [[mr], [td]] = await Promise.all([
      db.select({ cnt: count() }).from(meals).where(eq(meals.userId, u.id)),
      db.select({ cnt: sql<number>`coalesce(sum(${dailyUsage.count}), 0)` })
        .from(dailyUsage)
        .where(sql`${dailyUsage.userId} = ${u.id} AND ${dailyUsage.date} = ${today}`),
    ])
    return { ...u, totalMeals: Number(mr.cnt ?? 0), todayUsage: Number(td.cnt ?? 0) }
  }))

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
          DESKTOP VIEW — tabel lengkap (md ke atas)
          ════════════════════════════════════════ */}
      <div className="hidden md:block bg-white ring-1 ring-[#E5E7EB] rounded-xl overflow-x-auto shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB] text-[#6B7280] text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Beta Android</th>
              <th className="text-left px-4 py-3">Limit/Hari</th>
              <th className="text-left px-4 py-3">Total Meal</th>
              <th className="text-left px-4 py-3">Hari Ini</th>
              <th className="text-left px-4 py-3">Bergabung</th>
              <th className="text-left px-4 py-3">Last Login</th>
              <th className="text-left px-4 py-3">Password</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {usersWithStats.map((u, i) => (
              <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                <td className="px-4 py-3 font-medium text-[#111827]">
                  <div className="flex items-center gap-1.5">
                    {u.username}
                    {u.mustChangePassword && (
                      <span
                        title="User wajib ganti password saat login berikutnya"
                        className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium"
                      >⚠</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#6B7280]">
                  {u.email ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[#111827]">{u.email}</span>
                      <span
                        title={u.emailVerifiedAt ? `Terverifikasi ${fmtDateTime(u.emailVerifiedAt)}` : 'Belum verifikasi email'}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                          u.emailVerifiedAt ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {u.emailVerifiedAt ? '✓ Terverifikasi' : 'Belum Verifikasi'}
                      </span>
                    </div>
                  ) : (
                    <span className="italic text-xs text-[#9CA3AF]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.isActive
                      ? 'bg-[#D4F5E4] text-[#1F9D57]'
                      : 'bg-[#F3F4F6] text-[#6B7280]'
                  }`}>
                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.betaOptinAndroid
                      ? 'bg-[#D4F5E4] text-[#1F9D57]'
                      : 'bg-[#F3F4F6] text-[#9CA3AF]'
                  }`}>
                    {u.betaOptinAndroid ? 'Ikut' : 'Tidak'}
                  </span>
                  {u.betaOptinAndroid && (
                    <div className="text-[11px] text-[#9CA3AF] mt-0.5">{fmtDate(u.betaOptinAndroidAt)}</div>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-[#6B7280]">
                  {u.dailyLimit ?? <span className="italic text-xs text-[#9CA3AF]">{globalLimit} (global)</span>}
                </td>
                <td className="px-4 py-3 tabular-nums text-[#111827]">{u.totalMeals}</td>
                <td className="px-4 py-3 tabular-nums text-[#111827]">{u.todayUsage}</td>
                <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtDateTime(u.createdAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {u.lastLoginAt
                    ? <span title={fmtDateTime(u.lastLoginAt)} className="text-[#111827] tabular-nums">{fmtDateTime(u.lastLoginAt)}</span>
                    : <span className="italic text-xs text-[#9CA3AF]">Belum pernah</span>
                  }
                </td>
                <td className="px-4 py-3 whitespace-nowrap min-w-[160px]">
                  {u.passwordChangedAt ? (
                    <div className="space-y-1">
                      <p className="text-xs text-[#111827] tabular-nums">{fmtDate(u.passwordChangedAt)}</p>
                      {u.passwordChangedBy === 'admin' ? (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          Admin{u.adminResetBy ? ` (${u.adminResetBy})` : ''}
                        </span>
                      ) : u.passwordChangedBy === 'user' ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">User</span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="italic text-xs text-[#9CA3AF]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <UserActions user={u} globalLimit={globalLimit} />
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
            className="bg-white ring-1 ring-[#E5E7EB] rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.04)] overflow-hidden"
          >
            {/* Card Header — username + status */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2 min-w-0">
                {/* Avatar inisial */}
                <div className="w-9 h-9 rounded-full bg-[#D4F5E4] flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-[#1F9D57] uppercase">
                    {u.username.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[#111827] text-sm truncate max-w-[160px]">
                      {u.username}
                    </span>
                    {u.mustChangePassword && (
                      <span
                        title="User wajib ganti password"
                        className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium shrink-0"
                      >⚠</span>
                    )}
                  </div>
                  {u.email && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-[#6B7280] truncate max-w-[160px]">{u.email}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        u.emailVerifiedAt ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {u.emailVerifiedAt ? '✓ Verified' : 'Belum verifikasi'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                u.isActive
                  ? 'bg-[#D4F5E4] text-[#1F9D57]'
                  : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}>
                {u.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            {/* Card Stats — grid 2 kolom */}
            <div className="grid grid-cols-2 divide-x divide-[#F3F4F6] border-b border-[#F3F4F6]">
              <div className="px-4 py-3">
                <p className="text-xs text-[#9CA3AF] mb-0.5">Total Meal</p>
                <p className="text-base font-bold tabular-nums text-[#111827]">{u.totalMeals}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-[#9CA3AF] mb-0.5">Hari Ini</p>
                <p className="text-base font-bold tabular-nums text-[#111827]">{u.todayUsage}</p>
              </div>
            </div>

            {/* Card Detail — info sekunder */}
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF]">Beta Android</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  u.betaOptinAndroid
                    ? 'bg-[#D4F5E4] text-[#1F9D57]'
                    : 'bg-[#F3F4F6] text-[#9CA3AF]'
                }`}>
                  {u.betaOptinAndroid ? 'Ikut' : 'Tidak'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF]">Limit/Hari</span>
                <span className="text-[#111827] font-medium tabular-nums">
                  {u.dailyLimit
                    ? `${u.dailyLimit} foto`
                    : <span className="italic text-[#9CA3AF]">{globalLimit} (global)</span>
                  }
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF]">Bergabung</span>
                <span className="text-[#6B7280]">{fmtDateTime(u.createdAt)}</span>
              </div>
              {u.lastLoginAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9CA3AF]">Last Login</span>
                  <span className="text-[#6B7280]">{fmtDateTime(u.lastLoginAt)}</span>
                </div>
              )}
              {u.passwordChangedAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9CA3AF]">Pwd diubah</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#6B7280]">{fmtDate(u.passwordChangedAt)}</span>
                    {u.passwordChangedBy === 'admin' && (
                      <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Admin</span>
                    )}
                    {u.passwordChangedBy === 'user' && (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">User</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card Actions — full width buttons */}
            <div className="flex border-t border-[#F3F4F6]">
              <UserActions user={u} globalLimit={globalLimit} mobileCard />
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════
          PAGINATION
          ════════════════════════════════════════ */}
      {totalUsers > 0 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[#6B7280] tabular-nums">Hal. {page} / {totalPages} · {totalUsers} user</span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href="/admin/users?page=1"
                className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition"
              >Pertama</Link>
            )}
            {page > 1 ? (
              <Link
                href={`/admin/users?page=${page - 1}`}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition"
              >← Sebelumnya</Link>
            ) : (
              <span className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] text-[#D1D5DB] cursor-not-allowed">← Sebelumnya</span>
            )}
            {page < totalPages ? (
              <Link
                href={`/admin/users?page=${page + 1}`}
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
