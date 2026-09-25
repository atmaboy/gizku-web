import { db } from '@/lib/db'
import { users, meals, dailyUsage } from '@/drizzle/schema'
import { getGlobalLimit } from '@/lib/admin'
import { fmtDateTime, fmtNum, todayISO } from '@/lib/utils'
import { eq, count, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { CalendarPlus, ChevronLeft, History, LogIn, Mail, Smartphone, User } from 'lucide-react'
import UserDetailTabs from '@/components/admin/UserDetailTabs'
import AdminPage from '@/components/admin/shell/AdminPage'
import { Avatar, Badge, Button, Card, KeyValue } from '@/components/admin/ui'
export const dynamic = 'force-dynamic'

function AboutRow({ icon: Icon, title, children }: { icon: typeof Mail; title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-t border-border first:border-t-0 first:pt-0 last:pb-0">
      <p className="flex items-center gap-2 text-base font-semibold text-primary">
        <Icon size={16} className="text-secondary" aria-hidden />{title}
      </p>
      <div className="text-base text-bark-700 mt-1 pl-6 break-words">{children}</div>
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

  const statusBadge = user.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>
  const betaBadge = user.betaOptinAndroid ? <Badge variant="soft">Closed Beta Android</Badge> : null
  const limitLabel = user.dailyLimit != null ? `${user.dailyLimit} foto/hari` : `${globalLimit} (global)`
  const riwayatHref = `/admin/riwayat/${user.id}?from=detail`

  return (
    <AdminPage
      title="Detail User"
      breadcrumb={[{ label: 'Manajemen User', href: '/admin/users' }, { label: `@${user.username}` }]}
    >
      <div>
        <Button variant="outline" size="sm" icon={ChevronLeft} href="/admin/users">Kembali ke daftar user</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-4 items-start">
        <div className="xl:col-span-4 flex flex-col gap-5 max-xl:contents">
          {/* Profile — desktop (box-profile) */}
          <Card outline="brand" className="max-lg:hidden max-xl:order-1" bodyClassName="p-5">
            <div className="flex flex-col items-center text-center">
              <Avatar name={user.username} size={88} />
              <h2 className="text-xl font-semibold text-primary mt-3 break-all">@{user.username}</h2>
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">{statusBadge}{betaBadge}</div>
            </div>
            <KeyValue
              className="mt-4 border-y border-border"
              items={[
                { label: 'Total meal tercatat', value: fmtNum(totalMeals) },
                { label: 'Meal hari ini', value: fmtNum(todayUsage) },
                { label: 'Limit harian', value: user.dailyLimit != null ? limitLabel : <span className="text-secondary font-medium">{limitLabel}</span> },
              ]}
            />
            <Button icon={History} href={riwayatHref} fullWidth className="mt-4">Lihat Riwayat</Button>
          </Card>

          {/* Profile — mobile (horizontal) */}
          <Card outline="brand" className="lg:hidden max-xl:order-1">
            <div className="flex items-center gap-3">
              <Avatar name={user.username} size={64} />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-primary truncate">@{user.username}</h2>
                <div className="flex flex-wrap gap-1.5 mt-1.5">{statusBadge}{betaBadge}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              {[
                { l: 'Total meal', v: fmtNum(totalMeals) },
                { l: 'Hari ini', v: fmtNum(todayUsage) },
                { l: 'Limit/hari', v: user.dailyLimit ?? globalLimit, s: user.dailyLimit == null ? 'global' : undefined },
              ].map(s => (
                <div key={s.l} className="bg-sunken rounded-sm py-2.5 px-1">
                  <p className="text-lg font-bold text-primary tabular-nums leading-tight">{s.v}</p>
                  <p className="text-xs text-secondary mt-0.5">{s.l}{s.s ? ` (${s.s})` : ''}</p>
                </div>
              ))}
            </div>
            <Button icon={History} href={riwayatHref} fullWidth className="mt-4">Lihat Riwayat</Button>
          </Card>

          <Card title="Tentang User" icon={User} className="max-xl:order-3">
            <AboutRow icon={Mail} title="Email">
              {user.email ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="break-all">{user.email}</span>
                  {user.emailVerifiedAt ? <Badge variant="soft" size="sm">Terverifikasi</Badge> : <Badge variant="honeysoft" size="sm">Belum Verifikasi</Badge>}
                </span>
              ) : <span className="text-secondary">—</span>}
            </AboutRow>
            <AboutRow icon={CalendarPlus} title="Bergabung">{fmtDateTime(user.createdAt)}</AboutRow>
            <AboutRow icon={LogIn} title="Login terakhir">
              {user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : <span className="italic text-clay-600">Belum pernah</span>}
            </AboutRow>
            <AboutRow icon={Smartphone} title="Closed Beta Android">
              {user.betaOptinAndroid
                ? <>Ikut{user.betaOptinAndroidAt ? ` · opt-in ${fmtDateTime(user.betaOptinAndroidAt)}` : ''}</>
                : <span className="text-secondary">Tidak ikut</span>}
            </AboutRow>
          </Card>
        </div>

        <div className="xl:col-span-8 min-w-0 max-xl:order-2">
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
      </div>
    </AdminPage>
  )
}
