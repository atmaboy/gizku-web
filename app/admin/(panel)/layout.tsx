import AdminShell from '@/components/admin/shell/AdminShell'
import { getAdminNavCounts } from '@/lib/adminCounts'

export const dynamic = 'force-dynamic'

// Server layout for every /admin page except /admin/login (which lives outside
// this route group, so it never runs the badge-count queries).
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const counts = await getAdminNavCounts().catch(() => ({ openReports: 0, pendingLimit: 0 }))
  return <AdminShell counts={counts}>{children}</AdminShell>
}
