import { db } from '@/lib/db'
import { users, meals, adminConfig } from '@/drizzle/schema'
import { desc, eq, inArray, sql } from 'drizzle-orm'
import {
  Camera, ChevronRight, Database, Flame, Gauge, KeyRound, LayoutTemplate, MessageSquare, Settings, UtensilsCrossed, Users,
} from 'lucide-react'
import { getMaintenance } from '@/lib/admin'
import { fmtNum, fmtDateTime, todayISO, cn } from '@/lib/utils'
import AdminPage from '@/components/admin/shell/AdminPage'
import {
  Alert, Avatar, Badge, Button, Card, Code, DataTable, KeyValue, ListRow, ResponsiveStat, SmallBox, TrackedLink,
} from '@/components/admin/ui'
export const dynamic = 'force-dynamic'

/** "21,4 jt" — compact Indonesian number for small mobile tiles. */
function fmtCompact(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  if (n >= 10_000) return `${(n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} rb`
  return fmtNum(n)
}

const QUICK_LINKS = [
  { href: '/admin/users',   icon: Users,          title: 'Kelola User',     sub: 'Aktivasi, limit, reset password' },
  { href: '/admin/reports', icon: MessageSquare,  title: 'Laporan',         sub: 'Balas laporan & helpdesk' },
  { href: '/admin/landing', icon: LayoutTemplate, title: 'Konten Landing',  sub: 'Hero, fitur, CTA, blog' },
  { href: '/admin/config',  icon: Settings,       title: 'Pengaturan',      sub: 'Limit, API key, maintenance' },
]

export default async function AdminDashboard() {
  const today = todayISO()
  // Keep the dashboard light on the connection pool: all counters in ONE
  // round trip, then config + lists sequentially in small batches (the old
  // ~12-way Promise.all could starve the Supabase pooler under load).
  const [stats] = await db.execute<{
    tot_users: number; tot_meals: number; tot_cal: number; today_meals: number
    open_reports: number; tot_landing: number; pending_limit: number
  }>(sql`
    SELECT
      (SELECT count(*) FROM users)::int                                   AS tot_users,
      (SELECT count(*) FROM meals)::int                                   AS tot_meals,
      (SELECT coalesce(sum(total_calories), 0) FROM meals)::bigint        AS tot_cal,
      (SELECT count(*) FROM meals WHERE logged_at >= ${today}::date
                                    AND logged_at <  ${today}::date + 1)::int AS today_meals,
      (SELECT count(*) FROM reports WHERE status = 'open')::int           AS open_reports,
      (SELECT count(*) FROM landing_content)::int                         AS tot_landing,
      (SELECT count(*) FROM limit_requests WHERE status = 'pending')::int AS pending_limit
  `)
  const totUsers = Number(stats.tot_users), totMealCount = Number(stats.tot_meals)
  const totalCal = Number(stats.tot_cal), todayMeals = Number(stats.today_meals)
  const openReports = Number(stats.open_reports), totLanding = Number(stats.tot_landing)
  const pendingLimit = Number(stats.pending_limit)

  const cfgRows = await db.select({ key: adminConfig.key, value: adminConfig.value }).from(adminConfig)
    .where(inArray(adminConfig.key, ['default_daily_limit', 'anthropic_api_key', 'anthropic_model']))
  const cfg = (k: string) => cfgRows.find(r => r.key === k)?.value ?? null
  const parsedLimit = parseInt(cfg('default_daily_limit') ?? '5', 10)
  const globalLimit = isNaN(parsedLimit) ? 5 : parsedLimit
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || cfg('anthropic_api_key'))
  // Same fallback as app/api/analyze/route.ts
  const aiModel = cfg('anthropic_model') || 'claude-sonnet-5'
  const maintenance = await getMaintenance()

  const recentUsers = await db.select({
    id: users.id, username: users.username, email: users.email, isActive: users.isActive, createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt)).limit(5)
  const recentMeals = await db.select({
    id: meals.id, dishNames: meals.dishNames, totalCalories: meals.totalCalories, loggedAt: meals.loggedAt,
    userId: users.id, username: users.username,
  }).from(meals).leftJoin(users, eq(meals.userId, users.id)).orderBy(desc(meals.loggedAt)).limit(5)
  const menuLabel = (names: string[] | null) => names && names.length ? names.join(', ') : 'Tidak terdeteksi'

  const statusBadge = (active: boolean) => active
    ? <Badge variant="success">Aktif</Badge>
    : <Badge variant="secondary">Nonaktif</Badge>

  return (
    <AdminPage title="Dashboard">
      {maintenance.enabled && (
        <Alert variant="warning" title="Mode Maintenance aktif." action={<Button variant="outline-warning" size="sm" icon={Settings} href="/admin/config">Buka Pengaturan</Button>}>
          Aplikasi user sedang offline dan user yang login otomatis keluar.
        </Alert>
      )}
      {!hasKey && (
        <Alert variant="danger" title="API Key belum diset." action={<Button variant="outline-danger" size="sm" icon={KeyRound} href="/admin/config">Isi API Key</Button>}>
          Analisa foto makanan tidak akan berjalan sampai Anthropic API Key diisi.
        </Alert>
      )}

      {/* Small boxes */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 max-lg:gap-3">
        <SmallBox tone="brand"   value={fmtNum(totUsers)}     label="Total User"             icon={Users}           href="/admin/users" />
        <SmallBox tone="warning" value={fmtNum(todayMeals)}   label="Meal Logs Hari Ini"     icon={UtensilsCrossed} href="/admin/riwayat" />
        <SmallBox tone="dark"    value={fmtNum(openReports)}  label="Laporan Open"           icon={MessageSquare}   href="/admin/reports" />
        <SmallBox tone="clay"    value={fmtNum(pendingLimit)} label="Request Limit Menunggu" icon={Gauge}           href="/admin/limit" />
      </div>

      {/* Info boxes (desktop) / stat tiles (mobile) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 max-lg:gap-3">
        <ResponsiveStat icon={Database}       iconTone="brand" label="Total Meal Logs" value={fmtNum(totMealCount)} />
        <ResponsiveStat icon={Flame}          iconTone="honey" label="Total Kalori"    value={`${fmtNum(totalCal)} kcal`} mobileValue={fmtCompact(totalCal)} sub="kcal" />
        <ResponsiveStat icon={LayoutTemplate} iconTone="green" label="Konten Landing"  value={`${fmtNum(totLanding)} item`} />
        <ResponsiveStat icon={Camera}         iconTone="sand"  label="Limit Global"    value={`${globalLimit} foto/hari`} mobileValue={globalLimit} sub="foto/hari" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-lg:gap-4 items-start">
        <Card
          outline="brand"
          icon={Users}
          title="User Terbaru"
          className="xl:col-span-8"
          noPadding
          tools={<Button variant="link" size="sm" iconRight={ChevronRight} href="/admin/users">Lihat semua</Button>}
        >
          <div className="max-md:hidden">
            <DataTable
              rows={recentUsers}
              rowKey={u => u.id}
              striped
              columns={[
                { key: 'u', header: 'Username', render: u => (
                  <TrackedLink href={`/admin/users/${u.id}`} className="flex items-center gap-2.5 font-semibold text-link hover:text-green-800">
                    <Avatar name={u.username} size={30} />{u.username}
                  </TrackedLink>
                ) },
                { key: 'e', header: 'Email', render: u => <span className="text-secondary">{u.email ?? '—'}</span> },
                { key: 's', header: 'Status', render: u => statusBadge(u.isActive) },
                { key: 'j', header: 'Bergabung', className: 'text-secondary whitespace-nowrap', render: u => fmtDateTime(u.createdAt) },
              ]}
            />
          </div>
          <div className="md:hidden">
            {recentUsers.map(u => (
              <ListRow
                key={u.id}
                href={`/admin/users/${u.id}`}
                leading={<Avatar name={u.username} size={36} />}
                title={u.username}
                meta={fmtDateTime(u.createdAt)}
                trailing={statusBadge(u.isActive)}
              />
            ))}
          </div>
        </Card>

        <Card
          outline="brand"
          icon={UtensilsCrossed}
          title="Meal Log Terbaru"
          className="xl:col-span-8 xl:row-start-2"
          noPadding
          tools={<Button variant="link" size="sm" iconRight={ChevronRight} href="/admin/riwayat">Riwayat Analisa</Button>}
        >
          <div className="max-md:hidden">
            <DataTable
              rows={recentMeals}
              rowKey={m => m.id}
              striped
              emptyState={<p className="p-6 text-center text-base text-secondary">Belum ada meal log.</p>}
              columns={[
                { key: 'm', header: 'Nama Menu', className: 'w-full max-w-0', render: m => (
                  <span title={menuLabel(m.dishNames)} className={cn('block truncate', m.dishNames?.length ? 'font-semibold' : 'italic text-secondary')}>{menuLabel(m.dishNames)}</span>
                ) },
                { key: 'u', header: 'Username', render: m => m.userId
                  ? <TrackedLink href={`/admin/riwayat/${m.userId}`} className="flex items-center gap-2.5 font-semibold text-link hover:text-green-800 whitespace-nowrap"><Avatar name={m.username} size={30} />{m.username}</TrackedLink>
                  : <span className="text-secondary">—</span> },
                { key: 't', header: 'Tanggal Log', className: 'text-secondary whitespace-nowrap', render: m => fmtDateTime(m.loggedAt) },
                { key: 'k', header: 'Total Kalori', align: 'right', className: 'font-semibold whitespace-nowrap', render: m => `${fmtNum(m.totalCalories)} kcal` },
              ]}
            />
          </div>
          <div className="md:hidden">
            {recentMeals.length === 0 && <p className="p-6 text-center text-base text-secondary">Belum ada meal log.</p>}
            {recentMeals.map(m => (
              <ListRow
                key={m.id}
                href={m.userId ? `/admin/riwayat/${m.userId}` : undefined}
                leading={<Avatar name={m.username} size={36} />}
                title={menuLabel(m.dishNames)}
                meta={`${m.username ?? '—'} · ${fmtDateTime(m.loggedAt)}`}
                trailing={<span className="text-sm font-semibold tabular-nums whitespace-nowrap">{fmtNum(m.totalCalories)} kcal</span>}
              />
            ))}
          </div>
        </Card>

        <div className="xl:col-span-4 xl:row-start-1 xl:row-span-2 xl:col-start-9 flex flex-col gap-5 max-lg:gap-4">
          <Card title="Akses Cepat" noPadding>
            <ul className="list-none m-0 p-0">
              {QUICK_LINKS.map(l => (
                <li key={l.href} className="border-t border-border first:border-t-0">
                  <TrackedLink href={l.href} className="flex items-center gap-3 px-4 py-3 min-h-11 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500">
                    <span aria-hidden className="w-9 h-9 rounded-sm bg-green-50 text-brand flex items-center justify-center shrink-0"><l.icon size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-primary">{l.title}</span>
                      <span className="block text-xs text-secondary truncate">{l.sub}</span>
                    </span>
                    <ChevronRight size={16} className="text-secondary shrink-0" aria-hidden />
                  </TrackedLink>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Status Sistem">
            <KeyValue
              className="-my-2.5"
              items={[
                { label: 'Mode Maintenance', value: maintenance.enabled ? <Badge variant="warning">Aktif</Badge> : <Badge variant="soft">Nonaktif</Badge> },
                { label: 'Anthropic API Key', value: hasKey ? <Badge variant="success">Terpasang</Badge> : <Badge variant="danger">Belum diset</Badge> },
                { label: 'Model AI', value: <Code>{aiModel}</Code> },
              ]}
            />
          </Card>
        </div>
      </div>
    </AdminPage>
  )
}
