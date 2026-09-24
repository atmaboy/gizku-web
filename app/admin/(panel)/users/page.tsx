import { db } from '@/lib/db'
import { users, dailyUsage } from '@/drizzle/schema'
import { getGlobalLimit } from '@/lib/admin'
import { fmtDateTime, fmtNum, todayISO } from '@/lib/utils'
import { count, desc, sql } from 'drizzle-orm'
import { Check, Lock, Users as UsersIcon, UserX } from 'lucide-react'
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

function EmailCell({ email, verified }: { email: string | null; verified: boolean }) {
  if (!email) return <span className="text-secondary">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0 flex-wrap">
      <span className="truncate">{email}</span>
      {verified
        ? <span title="Email terverifikasi" className="text-brand inline-flex"><Check size={14} aria-hidden /><span className="sr-only">Terverifikasi</span></span>
        : <Badge variant="honeysoft" size="sm">Belum verifikasi</Badge>}
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

  const riwayatHref = (id: string) => `/admin/riwayat/${id}?from=list&fromPage=${page}&fromPageSize=${pageSize}`
  const pageLabel = `Hal. ${page} / ${totalPages} · ${fmtNum(totalUsers)} user`
  const empty = <EmptyState icon={UserX} title="Belum ada user terdaftar" />

  const legend = (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-secondary">
      <span className="inline-flex items-center gap-1.5"><Lock size={13} className="text-honey-500" aria-hidden />Wajib ganti password saat login berikutnya</span>
      <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-brand" aria-hidden />Email terverifikasi</span>
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
          rows={usersWithStats}
          rowKey={u => u.id}
          striped
          emptyState={empty}
          minWidth={880}
          columns={[
            { key: 'u', header: 'Username', render: u => (
              <div className="flex items-center gap-2.5">
                <Avatar name={u.username} size={30} />
                <TrackedLink href={`/admin/users/${u.id}`} className="font-semibold text-primary hover:text-link">{u.username}</TrackedLink>
                <StatusBadge active={u.isActive} />
                {u.mustChangePassword && <MustChangeLock />}
              </div>
            ) },
            { key: 'e', header: 'Email', render: u => <EmailCell email={u.email} verified={!!u.emailVerifiedAt} /> },
            { key: 'l', header: 'Last Login', className: 'whitespace-nowrap', render: u => u.lastLoginAt
              ? <span className="tabular-nums">{fmtDateTime(u.lastLoginAt)}</span>
              : <span className="italic text-clay-600">Belum pernah</span> },
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

        {usersWithStats.length === 0 && <div className="bg-surface rounded-md shadow-card">{empty}</div>}

        {usersWithStats.map(u => (
          <article key={u.id} className="bg-surface rounded-md shadow-card overflow-hidden">
            <div className="flex items-start gap-3 px-3.5 py-3">
              <Avatar name={u.username} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <TrackedLink href={`/admin/users/${u.id}`} className="font-semibold text-md text-primary truncate">{u.username}</TrackedLink>
                  {u.mustChangePassword && <MustChangeLock />}
                </div>
                <div className="text-sm text-secondary mt-0.5 min-w-0"><EmailCell email={u.email} verified={!!u.emailVerifiedAt} /></div>
              </div>
              <StatusBadge active={u.isActive} />
            </div>
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
              <div className="px-3.5 py-2.5">
                <p className="text-xs text-secondary">Last Login</p>
                <p className="text-sm font-medium text-primary mt-0.5">
                  {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : <span className="italic text-clay-600 font-normal">Belum pernah</span>}
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
