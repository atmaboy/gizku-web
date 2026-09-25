import { db } from '@/lib/db'
import { users, meals, reports, landingContent } from '@/drizzle/schema'
import { count, sum, desc, eq, sql } from 'drizzle-orm'
import {
  Camera, ChevronRight, Database, Flame, Gauge, KeyRound, LayoutTemplate, MessageSquare, Settings, UtensilsCrossed, Users,
} from 'lucide-react'
import { getGlobalLimit, getCfg, getMaintenance } from '@/lib/admin'
import { getAdminNavCounts } from '@/lib/adminCounts'
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
  const [[totUsers],[totMeals],[todayMeals],[openReports],[totLanding],globalLimit,hasKey,maintenance,navCounts,modelCfg] = await Promise.all([
    db.select({ c: count() }).from(users),
    db.select({ c: count(), cal: sum(meals.totalCalories) }).from(meals),
    db.select({ c: count() }).from(meals).where(sql`DATE(logged_at) = ${today}`),
    db.select({ c: count() }).from(reports).where(eq(reports.status,'open')),
    db.select({ c: count() }).from(landingContent),
    getGlobalLimit(),
    getCfg('anthropic_api_key').then(k => !!(process.env.ANTHROPIC_API_KEY || k)),
    getMaintenance(),
    getAdminNavCounts(),
    getCfg('anthropic_model'),
  ])
  // Same fallback as app/api/analyze/route.ts
  const aiModel = modelCfg || 'claude-sonnet-5'

  const [recentUsers, recentMeals] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)).limit(5),
    db.select({
      id: meals.id, dishNames: meals.dishNames, totalCalories: meals.totalCalories, loggedAt: meals.loggedAt,
      userId: users.id, username: users.username,
    }).from(meals).leftJoin(users, eq(meals.userId, users.id)).orderBy(desc(meals.loggedAt)).limit(5),
  ])
  const menuLabel = (names: string[] | null) => names && names.length ? names.join(', ') : 'Tidak terdeteksi'
  const totalCal = Number(totMeals.cal ?? 0)

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
        <SmallBox tone="brand"   value={fmtNum(Number(totUsers.c))}     label="Total User"             icon={Users}           href="/admin/users" />
        <SmallBox tone="warning" value={fmtNum(Number(todayMeals.c))}   label="Meal Logs Hari Ini"     icon={UtensilsCrossed} href="/admin/riwayat" />
        <SmallBox tone="dark"    value={fmtNum(Number(openReports.c))}  label="Laporan Open"           icon={MessageSquare}   href="/admin/reports" />
        <SmallBox tone="clay"    value={fmtNum(navCounts.pendingLimit)} label="Request Limit Menunggu" icon={Gauge}           href="/admin/limit" />
      </div>

      {/* Info boxes (desktop) / stat tiles (mobile) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 max-lg:gap-3">
        <ResponsiveStat icon={Database}       iconTone="brand" label="Total Meal Logs" value={fmtNum(Number(totMeals.c))} />
        <ResponsiveStat icon={Flame}          iconTone="honey" label="Total Kalori"    value={`${fmtNum(totalCal)} kcal`} mobileValue={fmtCompact(totalCal)} sub="kcal" />
        <ResponsiveStat icon={LayoutTemplate} iconTone="green" label="Konten Landing"  value={`${fmtNum(Number(totLanding.c))} item`} />
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
