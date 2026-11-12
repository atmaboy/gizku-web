import AdminPage from '@/components/admin/shell/AdminPage'
import ReleasesView from '@/components/admin/releases/ReleasesView'
import { FEATURES, RELEASES } from '@/lib/releaseNotes'

export const dynamic = 'force-dynamic'

export default function ReleasesPage() {
  return (
    <AdminPage title="Rilis & Fitur" breadcrumb={[{ label: 'Sistem' }, { label: 'Rilis & Fitur' }]}>
      <ReleasesView
        data={{
          web: { features: FEATURES.web, releases: RELEASES.web },
          mobile: { features: FEATURES.mobile, releases: RELEASES.mobile },
        }}
        deployedSha={process.env.VERCEL_GIT_COMMIT_SHA ?? null}
      />
    </AdminPage>
  )
}
