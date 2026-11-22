import { db } from '@/lib/db'
import { users, dailyUsage } from '@/drizzle/schema'
import { getGlobalLimit } from '@/lib/admin'
import { fmtDateTime, fmtNum, todayISO } from '@/lib/utils'
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import { Lock, Users as UsersIcon, UserX } from 'lucide-react'
import { getLastActiveMap } from '@/lib/userDevices'
import UserListActions from '@/components/admin/UserListActions'
import PageSizeSelect from '@/components/admin/PageSizeSelect'
import AdminPage from '@/components/admin/shell/AdminPage'
import { Alert, Avatar, Badge, Card, DataTable, EmptyState, Pagination, TrackedLink } from '@/components/admin/ui'
export const dynamic = 'force-dynamic'

const PAGE_SIZES = [5, 10, 20, 50]
const DEFAULT_PAGE_SIZE = 5

function MustChangeLock() {
  return (
    <span title="User wajib ganti password saat login berikutnya" className="text-honey-500 inline-flex">
      <Lock size={13} aria-hidden />
      <span className="sr-only">Wajib ganti password</span>
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? <Badge variant="success" size="sm">Aktif</Badge> : <Badge variant="secondary" size="sm">Nonaktif</Badge>
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>
}) {
  const { page: pageParam, pageSize: pageSizeParam } = await searchParams
  const today = todayISO()
  const pageSize = PAGE_SIZES.includes(Number(pageSizeParam)) ? Number(pageSizeParam) : DEFAULT_PAGE_SIZE

  const [globalLimit, [{ c: totalUsers }]] = await Promise.all([
    getGlobalLimit(),
    db.select({ c: count() }).from(users),
  ])
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))
  const page = Math.min(Math.max(1, parseInt(pageParam ?? '1', 10) || 1), totalPages)
  const offset = (page - 1) * pageSize

  const pagedUsers = await db.select({
    id: users.id,
    username: users.username,
    isActive: users.isActive,
    lastLoginAt: users.lastLoginAt,
    mustChangePassword: users.mustChangePassword,
  }).from(users).orderBy(desc(users.createdAt)).limit(pageSize).offset(offset)

  // Satu query untuk seluruh halaman (bukan satu per user): sebelumnya sampai 50 query paralel per render
  // menghabiskan koneksi pooler dan membuat respons RSC lambat/terputus saat navigasi client-side.
  const pageIds = pagedUsers.map(u => u.id)
  const [usageRows, lastActiveById] = await Promise.all([
    pageIds.length === 0
      ? Promise.resolve([] as { userId: string; cnt: number }[])
      : db.select({ userId: dailyUsage.userId, cnt: sql<number>`coalesce(sum(${dailyUsage.count}), 0)` })
          .from(dailyUsage)
          .where(and(inArray(dailyUsage.userId, pageIds), eq(dailyUsage.date, today)))
          .groupBy(dailyUsage.userId),
    getLastActiveMap(pageIds, new Map(pagedUsers.map(u => [u.id, u.lastLoginAt]))),
  ])
  const usageByUser = new Map(usageRows.map(r => [r.userId, Number(r.cnt ?? 0)]))
  const rows = pagedUsers.map(u => ({ ...u, todayUsage: usageByUser.get(u.id) ?? 0, lastActive: lastActiveById.get(u.id) ?? null }))

  const riwayatHref = (id: string) => `/admin/riwayat/${id}?from=list&fromPage=${page}&fromPageSize=${pageSize}`
  const pageLabel = `Hal. ${page} / ${totalPages} · ${fmtNum(totalUsers)} user`
  const empty = <EmptyState icon={UserX} title="Belum ada user terdaftar" />

  const legend = (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-secondary">
      <span className="inline-flex items-center gap-1.5"><Lock size={13} className="text-honey-500" aria-hidden />Wajib ganti password saat login berikutnya</span>
      <span>Email, login terakhir, platform, bahasa, dan perangkat ada di halaman Detail.</span>
    </p>
  )

  return (
    <AdminPage title="Manajemen User" breadcrumb={[{ label: 'Manajemen User' }]}>
      <Alert variant="info" title={`Limit global: ${globalLimit} foto/hari.`}>
        User tanpa limit khusus mengikuti nilai ini. Ubah di menu{' '}
        <TrackedLink href="/admin/config" className="text-link font-semibold underline hover:text-green-800">Pengaturan</TrackedLink>.
      </Alert>

      {/* Desktop / tablet (md+) */}
      <Card
        outline="brand"
        icon={UsersIcon}
        title="Daftar User"
        subtitle={`${fmtNum(totalUsers)} user`}
        tools={<PageSizeSelect value={pageSize} />}
        className="max-md:hidden"
        noPadding
        footer={totalUsers > 0 ? <Pagination page={page} totalPages={totalPages} hrefPattern={`/admin/users?page=__PAGE__&pageSize=${pageSize}`} label={pageLabel} /> : undefined}
      >
        <DataTable
          rows={rows}
          rowKey={u => u.id}
          striped
          emptyState={empty}
          minWidth={760}
          columns={[
            { key: 'u', header: 'Username', render: u => (
              <div className="flex items-center gap-2.5">
                <Avatar name={u.username} size={30} />
                <TrackedLink href={`/admin/users/${u.id}`} className="font-semibold text-primary hover:text-link">{u.username}</TrackedLink>
                <StatusBadge active={u.isActive} />
                {u.mustChangePassword && <MustChangeLock />}
              </div>
            ) },
            { key: 'k', header: 'Aktif Terakhir', className: 'whitespace-nowrap', render: u => u.lastActive
              ? <span className="tabular-nums">{fmtDateTime(u.lastActive)}</span>
              : <span className="italic text-clay-600">—</span> },
            { key: 'm', header: 'Meal Hari Ini', align: 'center', className: 'tabular-nums', render: u => u.todayUsage },
            { key: 'a', header: 'Aksi', render: u => <UserListActions user={u} riwayatHref={riwayatHref(u.id)} /> },
          ]}
        />
      </Card>

      {/* Mobile (<md): cards */}
      <div className="md:hidden flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base text-secondary">{fmtNum(totalUsers)} user</span>
          <PageSizeSelect value={pageSize} id="page-size-m" />
        </div>

        {rows.length === 0 && <div className="bg-surface rounded-md shadow-card">{empty}</div>}

        {rows.map(u => (
          <article key={u.id} className="bg-surface rounded-md shadow-card overflow-hidden">
            <div className="flex items-start gap-3 px-3.5 py-3">
              <Avatar name={u.username} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <TrackedLink href={`/admin/users/${u.id}`} className="font-semibold text-md text-primary truncate">{u.username}</TrackedLink>
                  {u.mustChangePassword && <MustChangeLock />}
                </div>
              </div>
              <StatusBadge active={u.isActive} />
            </div>
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
              <div className="px-3.5 py-2.5">
                <p className="text-xs text-secondary">Aktif Terakhir</p>
                <p className="text-sm font-medium text-primary mt-0.5 tabular-nums">
                  {u.lastActive ? fmtDateTime(u.lastActive) : <span className="italic text-clay-600 font-normal">—</span>}
                </p>
              </div>
              <div className="px-3.5 py-2.5">
                <p className="text-xs text-secondary">Meal Hari Ini</p>
                <p className="text-lg font-bold tabular-nums text-primary">{u.todayUsage}</p>
              </div>
            </div>
            <UserListActions user={u} riwayatHref={riwayatHref(u.id)} mobileCard />
          </article>
        ))}

        {totalUsers > 0 && <Pagination page={page} totalPages={totalPages} hrefPattern={`/admin/users?page=__PAGE__&pageSize=${pageSize}`} label={pageLabel} />}
      </div>

      {legend}
    </AdminPage>
  )
}
