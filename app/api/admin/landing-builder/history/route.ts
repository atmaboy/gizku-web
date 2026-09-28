/**
 * GET /api/admin/landing-builder/history → { data: last 10 publishes }
 * (id, publishedAt, publishedBy, changeSummary). UI comes in phase 2.
 */
import { NextRequest } from 'next/server'
import { listHistory } from '@/lib/landing/publish'
import { json, withAdmin } from '@/lib/landing/api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withAdmin(req, 'GET history', async () => json({ data: await listHistory(10) }))
}
