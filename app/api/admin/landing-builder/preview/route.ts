/**
 * GET /api/admin/landing-builder/preview       → enable draftMode, redirect /
 * GET /api/admin/landing-builder/preview?exit=1 → disable, redirect /
 *
 * `/` only honours draft mode when the admin cookie is also valid
 * (app/(landing)/page.tsx), so the bypass cookie alone reveals nothing.
 */
import { NextRequest, NextResponse } from 'next/server'
import { draftMode } from 'next/headers'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const dm = await draftMode()
  if (req.nextUrl.searchParams.get('exit')) {
    dm.disable()
    return NextResponse.redirect(new URL('/', req.url))
  }
  const denied = await requireAdmin(req)
  if (denied) return denied
  dm.enable()
  return NextResponse.redirect(new URL('/', req.url))
}
