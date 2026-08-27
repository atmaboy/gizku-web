import { db } from '@/lib/db'
import { users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RiwayatDetail from '@/components/admin/RiwayatDetail'
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
    <div className="max-w-[760px] mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="Kembali"
          className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] transition shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#111827]">Riwayat Analisa Makanan</h1>
          <Link
            href={`/admin/users/${user.id}`}
            className="inline-block mt-0.5 text-sm font-medium bg-[#F0FDF4] text-[#166534] px-2 py-0.5 rounded-full hover:bg-[#D4F5E4] transition"
          >
            @{user.username}
          </Link>
        </div>
      </div>

      <RiwayatDetail userId={user.id} />
    </div>
  )
}
