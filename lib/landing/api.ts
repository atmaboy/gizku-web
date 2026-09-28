/**
 * Shared plumbing for /api/admin/landing-builder/* route handlers:
 * admin guard + consistent JSON errors (401 / 409 / 422 / 503 / 500).
 */
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAdmin } from '@/lib/admin'
import { ConflictError, PublishValidationError } from './publish'
import { LandingNotMigratedError } from './repo'

/** The admin JWT carries no name (single shared admin role). */
export const ADMIN_ACTOR = 'admin'

const NO_STORE = { 'Cache-Control': 'no-store' }

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

export function handleError(e: unknown, where: string) {
  if (e instanceof ConflictError) {
    return json({ error: 'Diubah admin lain, muat ulang', code: 'conflict' }, 409)
  }
  if (e instanceof PublishValidationError) {
    return json({ error: e.message, code: 'invalid', errors: e.issues, warnings: e.warnings }, 422)
  }
  if (e instanceof ZodError) {
    return json({ error: 'Data tidak valid', code: 'invalid', issues: e.issues.slice(0, 20) }, 400)
  }
  if (e instanceof LandingNotMigratedError) {
    return json({ error: e.message, code: 'not_migrated' }, 503)
  }
  console.error(`[landing-builder ${where}]`, e)
  return json({ error: e instanceof Error ? e.message : 'Terjadi kesalahan' }, 500)
}

/** Run a handler behind the admin guard. */
export async function withAdmin(req: NextRequest, where: string, fn: () => Promise<Response>): Promise<Response> {
  const denied = await requireAdmin(req)
  if (denied) return denied
  try {
    return await fn()
  } catch (e) {
    return handleError(e, where)
  }
}

export async function readJson<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    return {} as T
  }
}
