import Link from 'next/link'
import { db } from '@/lib/db'
import { users, meals, reports, landingContent } from '@/drizzle/schema'
import { count, sum, desc, eq, sql } from 'drizzle-orm'
import { getGlobalLimit, getCfg, getMaintenance } from '@/lib/admin'
import { fmtNum, fmtDateTime, todayISO } from '@/lib/utils'
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const today = todayISO()
  const [[totUsers],[totMeals],[todayMeals],[openReports],[totLanding],globalLimit,hasKey,maintenance] = await Promise.all([
    db.select({ c: count() }).from(users),
    db.select({ c: count(), cal: sum(meals.totalCalories) }).from(meals),
    db.select({ c: count() }).from(meals).where(sql`DATE(logged_at) = ${today}`),
    db.select({ c: count() }).from(reports).where(eq(reports.status,'open')),
    db.select({ c: count() }).from(landingContent),
    getGlobalLimit(),
    getCfg('anthropic_api_key').then(k => !!(process.env.ANTHROPIC_API_KEY || k)),
    getMaintenance(),
  ])

  const kpis = [
    { label: 'Total User',         val: fmtNum(Number(totUsers.c)),                icon: '\ud83d\udc65' },
    { label: 'Total Meal Logs',    val: fmtNum(Number(totMeals.c)),                icon: '\ud83c\udf7d\ufe0f' },
    { label: 'Meal Logs Hari Ini', val: fmtNum(Number(todayMeals.c)),              icon: '\ud83d\udcc5' },
    { label: 'Total Kalori',       val: fmtNum(Number(totMeals.cal ?? 0))+' kcal', icon: '\ud83d\udd25' },
    { label: 'Laporan Open',       val: fmtNum(Number(openReports.c)),             icon: '\ud83d\udce3' },
    { label: 'Konten Landing',     val: fmtNum(Number(totLanding.c))+' item',      icon: '\ud83d\udcc4' },
  ]

  const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(5)

  const hasAlert = maintenance.enabled || !hasKey

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl">

      {/* ════════════════════════════════════
          Page header
          - Desktop: judul + badge alert satu baris
          - Mobile: judul dulu, badge alert di baris berikutnya (flex-wrap)
          ════════════════════════════════════ */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Dashboard</h1>
            <p className="text-sm text-[#6B7280] mt-1">{fmtDateTime(new Date())}</p>
          </div>
          {/* Badge alert — di desktop muncul di kanan judul */}
          {hasAlert && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {maintenance.enabled && (
                <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-medium border border-orange-200 whitespace-nowrap">
                  \u26a0\ufe0f Maintenance Aktif
                </span>
              )}
              {!hasKey && (
                <span className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-medium border border-red-200 whitespace-nowrap">
                  \u26a0\ufe0f API Key belum diset
                </span>
              )}
            </div>
          )}
        </div>

        {/* Badge alert mobile — di bawah judul, penuh lebar */}
        {hasAlert && (
          <div className="flex sm:hidden flex-wrap gap-2">
            {maintenance.enabled && (
              <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-medium border border-orange-200">
                \u26a0\ufe0f Maintenance Aktif
              </span>
            )}
            {!hasKey && (
              <span className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-medium border border-red-200">
                \u26a0\ufe0f API Key belum diset
              </span>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════
          KPI Grid — sudah responsive (tidak diubah)
          ════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white ring-1 ring-[#E5E7EB] rounded-xl p-4 shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
            <div className="text-2xl mb-2">{k.icon}</div>
            <div className="text-2xl font-bold tabular-nums text-[#111827] leading-tight">{k.val}</div>
            <div className="text-xs text-[#6B7280] mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════
          Quick Links — sudah responsive (tidak diubah)
          ════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/users',   icon: '\ud83d\udc65', label: 'Kelola User' },
          { href: '/admin/reports', icon: '\ud83d\udce3', label: 'Laporan' },
          { href: '/admin/landing', icon: '\ud83d\udcc4', label: 'Konten Landing' },
          { href: '/admin/config',  icon: '\u2699\ufe0f', label: 'Konfigurasi' },
        ].map(l => (
          <Link
            key={l.href} href={l.href}
            className="flex items-center gap-3 bg-white ring-1 ring-[#E5E7EB] rounded-xl p-4 hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors shadow-[0_1px_4px_rgba(16,24,40,0.04)] min-h-[56px]"
          >
            <span className="text-xl shrink-0">{l.icon}</span>
            <span className="text-sm font-semibold text-[#374151]">{l.label}</span>
          </Link>
        ))}
      </div>

      {/* ════════════════════════════════════
          Recent Users
          - Desktop: tabel 3 kolom (tidak berubah)
          - Mobile: card list ringkas
          ════════════════════════════════════ */}
      <div className="bg-white ring-1 ring-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#111827]">User Terbaru</h2>
          <Link
            href="/admin/users"
            className="text-xs text-[#2ECC71] hover:text-[#1F9D57] font-medium transition-colors"
          >
            Lihat semua &rarr;
          </Link>
        </div>

        {/* Desktop: tabel */}
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] text-[#6B7280] text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Username</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Bergabung</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                  <td className="px-5 py-3 font-medium text-[#111827]">{u.username}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.isActive ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}>
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#6B7280]">{fmtDateTime(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: daftar ringkas dengan divider */}
        <ul className="sm:hidden divide-y divide-[#F3F4F6]">
          {recentUsers.map(u => (
            <li key={u.id} className="flex items-center justify-between px-4 py-3 gap-3">
              {/* Avatar + info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#D4F5E4] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#1F9D57] uppercase">
                    {u.username.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">{u.username}</p>
                  <p className="text-xs text-[#9CA3AF]">{fmtDateTime(u.createdAt)}</p>
                </div>
              </div>
              {/* Status badge */}
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                u.isActive ? 'bg-[#D4F5E4] text-[#1F9D57]' : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}>
                {u.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
