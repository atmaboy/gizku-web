import BuilderShell from '@/components/admin/landing/BuilderShell'

// Landing Builder — one client shell (draft state + autosave) shared by
// /admin/landing, /admin/landing/[section] and /admin/landing/settings so
// switching sections keeps unsaved edits.
export default function LandingBuilderLayout({ children }: { children: React.ReactNode }) {
  return <BuilderShell>{children}</BuilderShell>
}
