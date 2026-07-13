import { ok, setCors } from '@/lib/utils'
import { checkMaintenance } from '@/lib/maintenance'

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

// Public GET — dipakai client (web & mobile) untuk cek status maintenance saat app dibuka.
// Tidak memerlukan autentikasi.
export async function GET() {
  const { enabled, title, description } = await checkMaintenance()
  return ok({ enabled, title, description })
}
