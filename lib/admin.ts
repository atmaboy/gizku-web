import { db } from '@/lib/db'
import { adminConfig, maintenanceConfig } from '@/drizzle/schema'
import { hashPassword } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SALT = 'nutrilog_admin_2024'

export async function getCfg(key: string): Promise<string | null> {
  const r = await db.select().from(adminConfig).where(eq(adminConfig.key, key)).limit(1)
  return r[0]?.value ?? null
}

export async function setCfg(key: string, value: string) {
  await db.insert(adminConfig).values({ key, value })
    .onConflictDoUpdate({ target: adminConfig.key, set: { value, updatedAt: new Date() } })
}

export async function verifyAdminPwd(pwd: string): Promise<boolean> {
  const stored  = await getCfg('admin_password_hash')
  const hash    = await hashPassword(pwd, SALT)
  if (!stored || stored === '') {
    const defHash = await hashPassword(process.env.ADMIN_DEFAULT_PASSWORD || 'Admin1234!', SALT)
    return hash === defHash
  }
  return hash === stored
}

export async function setAdminPwd(pwd: string) {
  await setCfg('admin_password_hash', await hashPassword(pwd, SALT))
}

export async function getGlobalLimit(): Promise<number> {
  const v = await getCfg('default_daily_limit')
  const n = parseInt(v ?? '5', 10)
  return isNaN(n) ? 5 : n
}

export async function getMaintenance() {
  const r = await db.select().from(maintenanceConfig).limit(1)
  return {
    enabled:     r[0]?.enabled     ?? false,
    title:       r[0]?.title       ?? 'NutriLog sedang dalam perbaikan',
    description: r[0]?.description ?? 'Kami sedang melakukan peningkatan sistem.',
  }
}

/**
 * Middleware guard untuk API route admin.
 * Membaca cookie `admin_token` dan memverifikasi nilainya terhadap
 * hash yang tersimpan di DB (key: `admin_token_hash`).
 *
 * Kembalikan NextResponse 401 jika tidak terautentikasi,
 * atau null jika lolos.
 *
 * Contoh pemakaian di route handler:
 *   const authError = await requireAdmin(req)
 *   if (authError) return authError
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<NextResponse | null> {
  // Coba dari cookie request langsung (App Router API route)
  const tokenFromReq = req.cookies.get('admin_token')?.value

  // Fallback: cookies() dari next/headers (Server Component / Route Handler)
  let token = tokenFromReq
  if (!token) {
    try {
      const cookieStore = await cookies()
      token = cookieStore.get('admin_token')?.value
    } catch {
      // cookies() tidak tersedia di konteks ini — abaikan
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verifikasi token terhadap hash yang tersimpan di DB
  const storedHash = await getCfg('admin_token_hash')
  if (!storedHash) {
    // Belum ada token di DB — tolak akses
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { hashPassword: hp } = await import('@/lib/auth')
  const inputHash = await hp(token, SALT)
  if (inputHash !== storedHash) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
