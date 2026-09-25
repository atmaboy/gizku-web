import AdminShell from '@/components/admin/shell/AdminShell'

// Layout for every /admin page except /admin/login. Deliberately does NO
// database work: it re-renders on every navigation and on every route
// prefetch, so badge counts are fetched client-side by AdminShell instead.
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
