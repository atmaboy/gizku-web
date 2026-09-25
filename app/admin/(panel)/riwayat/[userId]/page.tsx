import { db } from '@/lib/db'
import { users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import RiwayatDetail from '@/components/admin/RiwayatDetail'
import AdminPage from '@/components/admin/shell/AdminPage'
import { Button, TrackedLink } from '@/components/admin/ui'
export const dynamic = 'force-dynamic'

export default async function RiwayatDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ from?: string; fromPage?: string; fromPageSize?: string; q?: string }>
}) {
  const { userId } = await params
  const { from, fromPage, fromPageSize, q } = await searchParams

  const [user] = await db.select({ id: users.id, username: users.username })
    .from(users).where(eq(users.id, userId)).limit(1)
  if (!user) notFound()

  let backHref = '/admin/riwayat'
  if (from === 'list') {
    backHref = `/admin/users?page=${fromPage ?? '1'}&pageSize=${fromPageSize ?? '5'}`
  } else if (from === 'detail') {
    backHref = `/admin/users/${userId}`
  } else if (from === 'search') {
    backHref = q ? `/admin/riwayat?q=${encodeURIComponent(q)}` : '/admin/riwayat'
  }

  return (
    <AdminPage
      title="Riwayat Analisa Makanan"
      breadcrumb={[{ label: 'Riwayat Analisa', href: '/admin/riwayat' }, { label: `@${user.username}` }]}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" icon={ChevronLeft} href={backHref}>Kembali</Button>
        <span className="text-base text-secondary">Riwayat analisa milik</span>
        <TrackedLink href={`/admin/users/${user.id}`} className="text-base font-semibold text-link hover:text-green-800 hover:underline">@{user.username}</TrackedLink>
      </div>

      <RiwayatDetail userId={user.id} />
    </AdminPage>
  )
}
