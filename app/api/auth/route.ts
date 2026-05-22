import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/drizzle/schema'
import { hashPassword, signUserToken, verifyToken, extractToken } from '@/lib/auth'
import { ok, err, setCors } from '@/lib/utils'
import { checkMaintenance, maintenanceResponse } from '@/lib/maintenance'
import { eq } from 'drizzle-orm'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'login' || action === 'register') {
    const m = await checkMaintenance()
    if (m.enabled) return maintenanceResponse(m.title, m.description)
  }

  // REGISTER
  if (action === 'register') {
    const { username, password, email } = await req.json()
    if (!username || !password) return err('Username dan password diperlukan')
    if (username.length < 3) return err('Username minimal 3 karakter')
    if (password.length < 6) return err('Password minimal 6 karakter')
    if (!email) return err('Email diperlukan')
    const trimmedEmail = email.trim().toLowerCase()
    if (!isValidEmail(trimmedEmail)) return err('Format email tidak valid')

    const [existingEmail] = await db.select({ id: users.id })
      .from(users).where(eq(users.email, trimmedEmail)).limit(1)
    if (existingEmail) return err('Email sudah digunakan', 409)

    const hash = await hashPassword(password)
    try {
      const [user] = await db.insert(users)
        .values({ username: username.toLowerCase().trim(), passwordHash: hash, email: trimmedEmail })
        .returning({ id: users.id, username: users.username })
      const token = await signUserToken({ userId: user.id, username: user.username })
      return ok({ token, user: { id: user.id, username: user.username } })
    } catch {
      return err('Username sudah digunakan', 409)
    }
  }

  // LOGIN — update last_login_at on every successful login
  if (action === 'login') {
    const { username, password } = await req.json()
    if (!username || !password) return err('Username dan password diperlukan')
    const [user] = await db.select().from(users)
      .where(eq(users.username, username.toLowerCase().trim())).limit(1)
    if (!user) return err('Username atau password salah', 401)
    if (!user.isActive) return err('Akun tidak aktif', 403)
    const hash = await hashPassword(password)
    if (hash !== user.passwordHash) return err('Username atau password salah', 401)

    // Record login timestamp (fire-and-forget — tidak boleh gagalkan login)
    db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id))
      .catch(e => console.error('[auth] failed to update lastLoginAt', e))

    const token = await signUserToken({ userId: user.id, username: user.username })
    return ok({
      token,
      user: {
        id: user.id,
        username: user.username,
        dailyLimit: user.dailyLimit,
        mustChangePassword: user.mustChangePassword,   // ← flag untuk intercept di client
      },
    })
  }

  // VERIFY TOKEN
  if (action === 'verify') {
    const token = extractToken(req.headers.get('Authorization'))
    if (!token) return err('Token diperlukan', 401)
    try {
      const payload = await verifyToken(token)
      const [user] = await db.select({
        id: users.id, username: users.username,
        isActive: users.isActive, dailyLimit: users.dailyLimit,
        mustChangePassword: users.mustChangePassword,
      }).from(users).where(eq(users.id, payload.userId!)).limit(1)
      if (!user || !user.isActive) return err('Akun tidak ditemukan atau tidak aktif', 401)
      return ok({ valid: true, user })
    } catch {
      return err('Token tidak valid atau kadaluarsa', 401)
    }
  }

  // CHANGE PASSWORD (user sudah login — Entry Point 1: Profile & Force-change pasca admin reset)
  // Konfirmasi identitas via username, bukan email
  if (action === 'change_password') {
    const token = extractToken(req.headers.get('Authorization'))
    if (!token) return err('Token diperlukan', 401)

    let payload: { userId?: string; username?: string; role: string }
    try {
      payload = await verifyToken(token)
    } catch {
      return err('Token tidak valid atau kadaluarsa', 401)
    }

    const { username, newPassword } = await req.json()
    if (!username || !newPassword) return err('Username dan password baru diperlukan')
    if (newPassword.length < 6) return err('Password minimal 6 karakter')

    const [user] = await db.select().from(users)
      .where(eq(users.id, payload.userId!)).limit(1)
    if (!user) return err('User tidak ditemukan', 404)
    if (!user.isActive) return err('Akun tidak aktif', 403)

    // Konfirmasi identitas: username harus cocok dengan yang login
    if (user.username !== username.toLowerCase().trim())
      return err('Konfirmasi username tidak cocok', 403)

    const hash = await hashPassword(newPassword)
    await db.update(users).set({
      passwordHash:      hash,
      passwordChangedAt: new Date(),
      passwordChangedBy: 'user',
      mustChangePassword: false,
      updatedAt:         new Date(),
    }).where(eq(users.id, user.id))

    return ok({ message: 'Password berhasil diubah. Silakan login kembali.' })
  }

  // RESET PASSWORD (user belum login — Entry Point 2: Halaman Login)
  // Konfirmasi identitas via username saja, tanpa email
  if (action === 'reset_password') {
    const { username, newPassword } = await req.json()
    if (!username || !newPassword) return err('Username dan password baru diperlukan')
    if (newPassword.length < 6) return err('Password minimal 6 karakter')

    const [user] = await db.select().from(users)
      .where(eq(users.username, username.toLowerCase().trim())).limit(1)
    if (!user) return err('Username tidak ditemukan', 404)
    if (!user.isActive) return err('Akun tidak aktif', 403)

    const hash = await hashPassword(newPassword)
    await db.update(users).set({
      passwordHash:      hash,
      passwordChangedAt: new Date(),
      passwordChangedBy: 'user',
      mustChangePassword: false,
      updatedAt:         new Date(),
    }).where(eq(users.id, user.id))

    return ok({ message: 'Password berhasil direset. Silakan login dengan password baru.' })
  }

  return err('Action tidak dikenal')
}
