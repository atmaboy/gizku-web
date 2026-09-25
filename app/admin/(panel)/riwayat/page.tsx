import { db } from '@/lib/db'
import { users, meals } from '@/drizzle/schema'
import { ilike, eq, count } from 'drizzle-orm'
import { ChevronRight, Search, SearchX } from 'lucide-react'
import AdminPage from '@/components/admin/shell/AdminPage'
import { Avatar, Button, Card, DataTable, EmptyState, Input, InputGroup, ListRow } from '@/components/admin/ui'
import { fmtNum } from '@/lib/utils'
export const dynamic = 'force-dynamic'

const HELP = 'Daftar tidak dimuat otomatis agar query tetap ringan. Cari username user untuk melihat riwayat analisa makanannya.'

export default async function RiwayatSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const searched = query.length > 0

  let results: { id: string; username: string; email: string | null; totalMeals: number }[] = []
  if (searched) {
    const rows = await db.select({ id: users.id, username: users.username, email: users.email })
      .from(users).where(ilike(users.username, `%${query}%`)).limit(20)
    results = await Promise.all(rows.map(async u => {
      const [{ c }] = await db.select({ c: count() }).from(meals).where(eq(meals.userId, u.id))
      return { ...u, totalMeals: c }
    }))
  }

  const href = (id: string) => `/admin/riwayat/${id}?from=search&q=${encodeURIComponent(query)}`

  return (
    <AdminPage title="Riwayat Analisa" breadcrumb={[{ label: 'Riwayat Analisa' }]}>
      <Card outline="brand" icon={Search} title="Cari Riwayat User">
        <form action="/admin/riwayat" method="get" role="search" className="lg:max-w-[720px]">
          <label htmlFor="riwayat-q" className="block mb-1.5 text-base font-semibold text-primary">Username</label>
          <div className="flex gap-2 max-lg:flex-col">
            <InputGroup prepend={<Search size={16} aria-hidden />}>
              <Input id="riwayat-q" type="search" name="q" defaultValue={query} required placeholder="Cari username…" aria-describedby="riwayat-q-help" />
            </InputGroup>
            <Button type="submit" icon={Search} className="shrink-0 max-lg:w-full">Cari</Button>
          </div>
          <p id="riwayat-q-help" className="mt-1.5 text-sm text-secondary">{HELP}</p>
        </form>
      </Card>

      {!searched && (
        <Card><EmptyState icon={Search} title="Cari user untuk memulai" description={HELP} /></Card>
      )}

      {searched && (
        <Card
          title={<>Hasil pencarian “{query}”</>}
          subtitle={`${results.length} user · maks. 20 hasil`}
          noPadding
        >
          {results.length === 0 ? (
            <EmptyState icon={SearchX} title={<>Tidak ada user dengan username “{query}”</>} />
          ) : (
            <>
              <div className="max-lg:hidden">
                <DataTable
                  rows={results}
                  rowKey={u => u.id}
                  columns={[
                    { key: 'u', header: 'Username', render: u => (
                      <span className="flex items-center gap-2.5 font-semibold"><Avatar name={u.username} size={30} />{u.username}</span>
                    ) },
                    { key: 'e', header: 'Email', render: u => <span className="text-secondary">{u.email ?? '—'}</span> },
                    { key: 't', header: 'Total Analisa', align: 'right', render: u => `${fmtNum(u.totalMeals)} entri` },
                    { key: 'a', header: <span className="sr-only">Aksi</span>, align: 'right', render: u => (
                      <Button variant="outline-primary" size="sm" iconRight={ChevronRight} href={href(u.id)}>Lihat Riwayat</Button>
                    ) },
                  ]}
                />
              </div>
              <div className="lg:hidden">
                {results.map(u => (
                  <ListRow
                    key={u.id}
                    href={href(u.id)}
                    leading={<Avatar name={u.username} size={38} />}
                    title={u.username}
                    meta={u.email ?? '—'}
                    trailing={<span className="text-sm text-secondary tabular-nums inline-flex items-center gap-1">{fmtNum(u.totalMeals)} entri<ChevronRight size={16} aria-hidden /></span>}
                  />
                ))}
              </div>
            </>
          )}
        </Card>
      )}
    </AdminPage>
  )
}
