import { db } from '@/lib/db'
import { users, meals, dailyUsage } from '@/drizzle/schema'
import { liveMeal } from '@/lib/mealQuery'
import { getGlobalLimit } from '@/lib/admin'
import { fmtDateTime, fmtNum, todayISO } from '@/lib/utils'
import { eq, and, count, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { Activity, Cake, CalendarPlus, ChevronLeft, History, LogIn, Mail, Smartphone, Target, User, UserRound } from 'lucide-react'
import { getDeviceInfo, deviceLabel, lastActivity, platformSummary, latestAppClient, appClientLabel, activeToken, platformName, emptyInfo } from '@/lib/userDevices'
import UserDetailTabs from '@/components/admin/UserDetailTabs'
import MaskedId from '@/components/admin/MaskedId'
import MaskedValue from '@/components/admin/MaskedValue'
import { getGoalsConfig } from '@/lib/goalsConfig.server'
import { resolveGoal, isPremiumNow } from '@/lib/goals.server'
import { getUserPremiumInfo } from '@/lib/goalsStats.server'
import { ageOn } from '@/lib/akg'
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
    db.select({ cnt: count() }).from(meals).where(and(eq(meals.userId, userId), liveMeal)),
    db.select({ cnt: sql<number>`coalesce(sum(${dailyUsage.count}), 0)` }).from(dailyUsage)
      .where(sql`${dailyUsage.userId} = ${userId} AND ${dailyUsage.date} = ${today}`),
  ])
  const devInfo = (await getDeviceInfo([userId])).get(userId) ?? emptyInfo()
  const platform = platformSummary(devInfo)
  const lastActive = lastActivity(user.lastLoginAt, devInfo)
  const appNow = latestAppClient(devInfo)
  const totalMeals = Number(mealsRow.cnt ?? 0)
  const todayUsage = Number(usageRow.cnt ?? 0)

  const [goalCfg, goalsInfo] = await Promise.all([getGoalsConfig(), getUserPremiumInfo(userId)])
  const goal = await resolveGoal(userId, goalCfg)
  const premium = isPremiumNow(user.premiumUntil)
  const age = user.birthDate ? ageOn(user.birthDate) : null
  const birthLabel = user.birthDate
    ? `${user.birthDate.split('-').reverse().join('/')}${age !== null ? ` (${age} tahun)` : ''}`
    : null

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

          <Card title="Perangkat & Aktivitas" icon={Activity} className="max-xl:order-3">
            <AboutRow icon={Activity} title="Aktif terakhir">
              {lastActive ? fmtDateTime(lastActive) : <span className="italic text-clay-600">Belum ada aktivitas</span>}
            </AboutRow>
            <AboutRow icon={Smartphone} title="Platform">
              {platform.labels.length === 0
                ? <span className="text-secondary">Belum pernah memakai app</span>
                : <span className="inline-flex flex-wrap items-center gap-1.5">
                    {platform.labels.map(l => <Badge key={l} variant="soft" size="sm">{l}</Badge>)}
                    {platform.fromHistory && <span className="text-xs text-secondary">dari riwayat makanan</span>}
                  </span>}
            </AboutRow>
            <AboutRow icon={Smartphone} title="Versi app">
              {appNow
                ? <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Badge variant="soft" size="sm">{appClientLabel(appNow)}</Badge>
                    {appNow.appBuild && <span className="text-xs text-secondary tabular-nums">build {appNow.appBuild}</span>}
                    <span className="text-sm text-secondary tabular-nums">terakhir terlihat {fmtDateTime(appNow.lastSeenAt)}</span>
                  </span>
                : <span className="text-secondary">Belum melapor. App user belum diperbarui ke versi yang mengirim versi app.</span>}
            </AboutRow>
            {devInfo.deviceGroups.length > 0 && (
              <div className="px-0 pt-2">
                <p className="text-sm font-semibold text-primary mb-1.5">Perangkat ({devInfo.deviceGroups.length})</p>
                <ul className="flex flex-col gap-2 list-none m-0 p-0">
                  {devInfo.deviceGroups.map(g => {
                    const tok = activeToken(g)
                    return (
                      <li key={g.deviceId} className={`rounded-sm border border-border px-3 py-2 text-sm ${tok ? '' : 'opacity-70'}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-primary">{tok ? deviceLabel(tok) : platformName(g.platform)}</span>
                          <Badge variant="soft" size="sm">v{g.appVersion}{g.appBuild ? ` (${g.appBuild})` : ''}</Badge>
                          <Badge variant={tok ? 'success' : 'secondary'} size="sm">{tok ? 'Push aktif' : 'Tanpa push aktif'}</Badge>
                          {tok && <span className="text-secondary">Bahasa {tok.language === 'en' ? 'EN' : 'ID'}</span>}
                        </div>
                        <p className="text-secondary mt-0.5 tabular-nums">Pertama terlihat {fmtDateTime(g.firstSeenAt)} · Terakhir terlihat {fmtDateTime(g.lastSeenAt)}</p>
                        <p className="mt-0.5"><MaskedId value={g.deviceId} /></p>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {devInfo.appClients.length > 1 && (
              <details className="pt-2">
                <summary className="text-sm font-semibold text-primary cursor-pointer select-none">Riwayat versi app ({devInfo.appClients.length})</summary>
                <ul className="flex flex-col gap-2 list-none m-0 mt-1.5 p-0">
                  {devInfo.appClients.map(c => (
                    <li key={`${c.platform}-${c.appVersion}`} className="rounded-sm border border-border px-3 py-2 text-sm">
                      <span className="font-semibold text-primary">{appClientLabel(c)}</span>
                      {c.appBuild && <span className="text-secondary tabular-nums"> · build {c.appBuild}</span>}
                      <p className="text-secondary mt-0.5 tabular-nums">Pertama terlihat {fmtDateTime(c.firstSeenAt)} · Terakhir terlihat {fmtDateTime(c.lastSeenAt)}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
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
            <AboutRow icon={UserRound} title="Gender">
              {user.gender
                ? <MaskedValue value={user.gender === 'm' ? 'Laki-laki' : 'Perempuan'} mask="••••••••" label="gender" />
                : <span className="text-secondary">Belum diisi</span>}
            </AboutRow>
            <AboutRow icon={Cake} title="Tanggal lahir">
              {birthLabel
                ? <MaskedValue value={birthLabel} mask="••/••/••••" label="tanggal lahir" />
                : <span className="text-secondary">Belum diisi</span>}
            </AboutRow>
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

        <div className="xl:col-span-8 min-w-0 max-xl:order-2 flex flex-col gap-5 max-lg:gap-4">
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

          <Card title="Progres & Premium" icon={Target} subtitle="Target harian dan status Premium user ini">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold text-primary mb-1">Premium</p>
                <KeyValue dense items={[
                  { label: 'Status', value: premium ? <Badge variant="success">Premium aktif</Badge> : <Badge variant="light">Belum Premium</Badge> },
                  ...(premium && user.premiumUntil ? [{ label: 'Berlaku', value: `s/d ${fmtDateTime(user.premiumUntil)}` }] : []),
                  ...(goalsInfo.remindAt ? [{ label: 'Ingatkan saya', value: fmtDateTime(goalsInfo.remindAt) }] : []),
                  ...(goalsInfo.remindSource ? [{ label: 'Sumber', value: goalsInfo.remindSource }] : []),
                  ...(goalsInfo.cta7d > 0 ? [{ label: 'Klik CTA (7 hari)', value: `${goalsInfo.cta7d}×` }] : []),
                ]} />
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold text-primary mb-1">Target harian</p>
                <KeyValue dense items={[
                  { label: 'Kalori harian', value: `${fmtNum(goal.kcal)} kkal` },
                  { label: 'Sumber', value: goal.source === 'user'
                    ? <Badge variant="soft">Diset user</Badge>
                    : <Badge variant="light">{`Default (belum set)`}</Badge> },
                  { label: 'Makro (P / K / L)', value: `${goal.protein} / ${goal.carbs} / ${goal.fat} g` },
                ]} />
                <p className="text-xs text-secondary mt-2">
                  {goal.macroSource === 'user'
                    ? 'Makro diatur sendiri lewat tab Makro (Premium).'
                    : `Makro memakai pembagian default ${goalCfg.macroDefault.proteinPct} / ${goalCfg.macroDefault.carbsPct} / ${goalCfg.macroDefault.fatPct}% dari target kalori.`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminPage>
  )
}
