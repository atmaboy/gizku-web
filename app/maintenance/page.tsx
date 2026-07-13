import { getMaintenance } from '@/lib/admin'
import MaintenanceView from './MaintenanceView'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const { title, description } = await getMaintenance()
  return <MaintenanceView title={title} description={description} />
}
