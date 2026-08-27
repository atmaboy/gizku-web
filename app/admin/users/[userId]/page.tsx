import { db } from '@/lib/db'
import { users, meals, dailyUsage } from '@/drizzle/schema'
import { getGlobalLimit } from '@/lib/admin'
import { fmtDateTime, todayISO } from '@/lib/utils'
import { eq, count, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import UserDetailTabs from '@/components/admin/UserDetailTabs'
export const dynamic = 'force-dynamic'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-[#6B7280]">{label}</span>
      <span className="text-[#111827] font-medium text-right">{children}</span>
    </div>
  )
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const globalLimit = await getGlobalLimit()

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) notFound()

  const today = todayISO()
  const [[mealsRow], [usageRow]] = await Promise.all([
    db.select({ cnt: count() }).from(meals).where(eq(meals.userId, userId)),
    db.select({ cnt: sql<number>`coalesce(sum(${dailyUsage.count}), 0)` }).from(dailyUsage)
      .where(sql`${dailyUsage.userId} = ${userId} AND ${dailyUsage.date} = ${today}`),
  ])
  const totalMeals = Number(mealsRow.cnt ?? 0)
  const todayUsage = Number(usageRow.cnt ?? 0)

  return (
    <div className="max-w-[640px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          aria-label="Kembali ke daftar user"
          className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] transition shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#111827]">Detail User</h1>
          <p className="text-sm text-[#6B7280]">@{user.username}</p>
        </div>
        <Link
          href={`/admin/riwayat/${user.id}?from=detail`}
          className="text-xs font-medium px-3 py-2 rounded-lg border border-[#BFDBFE] text-[#3B82F6] hover:bg-[#EFF6FF] transition whitespace-nowrap shrink-0"
        >
          Lihat Riwayat →
        </Link>
      </div>

      {/* Overview card */}
      <div className="bg-white ring-1 ring-[#E5E7EB] rounded-[18px] px-5 py-4 divide-y divide-[#F3F4F6]">
        <Row label="Status">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            user.isActive ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-[#F3F4F6] text-[#6B7280]'
          }`}>
            {user.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </Row>
        {user.mustChangePassword && (
          <Row label="Wajib ganti password">
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⚠ Ya</span>
          </Row>
        )}
        <Row label="Email">
          {user.email ? (
            <span className="inline-flex items-center gap-1.5">
              {user.email}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
                user.emailVerifiedAt ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-amber-50 text-amber-600'
              }`}>
                {user.emailVerifiedAt ? '✓ Terverifikasi' : 'Belum Verifikasi'}
              </span>
            </span>
          ) : (
            <span className="italic text-xs text-[#9CA3AF]">—</span>
          )}
        </Row>
        <Row label="Bergabung">{fmtDateTime(user.createdAt)}</Row>
        <Row label="Login terakhir">
          {user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : <span className="italic text-xs text-[#9CA3AF]">Belum pernah</span>}
        </Row>
        <Row label="Total meal tercatat">{totalMeals}</Row>
        <Row label="Meal hari ini">{todayUsage}</Row>
        <Row label="Limit harian">
          {user.dailyLimit ?? <span className="italic text-xs text-[#9CA3AF]">{globalLimit} (global)</span>}
        </Row>
        <Row label="Closed Beta Android">
          {user.betaOptinAndroid ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs bg-[#D4F5E4] text-[#1F9D57] px-2 py-0.5 rounded-full font-medium">Ikut</span>
              {user.betaOptinAndroidAt && (
                <span className="text-xs text-[#6B7280]">{fmtDateTime(user.betaOptinAndroidAt)}</span>
              )}
            </span>
          ) : (
            <span className="text-xs bg-[#F3F4F6] text-[#9CA3AF] px-2 py-0.5 rounded-full font-medium">Tidak</span>
          )}
        </Row>
      </div>

      {/* Tabs: Konfigurasi / Reset Password */}
      <UserDetailTabs
        user={{
          id: user.id,
          username: user.username,
          dailyLimit: user.dailyLimit,
          isActive: user.isActive,
          passwordChangedAt: user.passwordChangedAt,
          passwordChangedBy: user.passwordChangedBy,
          mustChangePassword: user.mustChangePassword,
          adminResetBy: user.adminResetBy,
          betaOptinAndroid: user.betaOptinAndroid,
          betaOptinAndroidAt: user.betaOptinAndroidAt,
        }}
        globalLimit={globalLimit}
      />
    </div>
  )
}
