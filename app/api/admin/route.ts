import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users, meals, reports, reportMessages, reportAttachments, dailyUsage, maintenanceConfig } from '@/drizzle/schema'
import { verifyAdminPwd, setAdminPwd, getCfg, setCfg, getGlobalLimit, getMaintenance, requireAdmin } from '@/lib/admin'
import { signAdminToken } from '@/lib/auth'
import { ok, err, setCors, todayISO } from '@/lib/utils'
import { invalidateMaintenanceCache } from '@/lib/maintenance'
import { sendVerificationEmailInBackground, clampExpiryHours, getVerificationExpiryHours } from '@/lib/emailVerification'
import { sendReportReplyEmail } from '@/lib/reportReplyEmail'
import { eq, desc, count, and, gte, lte, inArray, sql } from 'drizzle-orm'

const REPORT_STATUSES = ['open', 'replied', 'waiting', 'done'] as const

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function jsonErr(msg: string, status = 500) {
  const h = new Headers()
  setCors(h)
  return Response.json({ error: msg }, { status, headers: h })
}

export async function OPTIONS() {
  const h = new Headers()
  setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function POST(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')

    if (action === 'login') {
      let body: { password?: string }
      try { body = await req.json() } catch { return jsonErr('Invalid JSON body', 400) }
      const { password } = body
      if (!password) return err('Password diperlukan')
      const valid = await verifyAdminPwd(password)
      if (!valid) return err('Password salah', 401)
      const token = await signAdminToken()
      const h = new Headers()
      setCors(h)
      h.set('Content-Type', 'application/json')
      h.set('Set-Cookie',
        `nl_admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=14400`)
      return new Response(JSON.stringify({ token, message: 'Login berhasil' }), { status: 200, headers: h })
    }

    if (action === 'logout') {
      const h = new Headers()
      setCors(h)
      h.set('Content-Type', 'application/json')
      h.set('Set-Cookie', 'nl_admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
      return new Response(JSON.stringify({ message: 'Logout berhasil' }), { status: 200, headers: h })
    }

    if (action === 'update_password') {
      const { newPassword } = await req.json()
      if (!newPassword || newPassword.length < 8) return err('Password minimal 8 karakter')
      await setAdminPwd(newPassword)
      return ok({ message: 'Password berhasil diubah' })
    }

    if (action === 'update_config') {
      const body = await req.json()
      if (body.dailyLimit !== undefined)      await setCfg('default_daily_limit', String(body.dailyLimit))
      if (body.anthropicApiKey !== undefined) await setCfg('anthropic_api_key', body.anthropicApiKey)
      if (body.anthropicModel !== undefined)  await setCfg('anthropic_model', body.anthropicModel)
      if (body.emailVerificationExpiryHours !== undefined) {
        const hours = clampExpiryHours(Number(body.emailVerificationExpiryHours))
        await setCfg('email_verification_expiry_hours', String(hours))
      }
      return ok({ message: 'Konfigurasi disimpan' })
    }

    if (action === 'update_maintenance') {
      const body = await req.json()
      const { enabled, title, description } = body
      const existing = await db.select({ id: maintenanceConfig.id })
        .from(maintenanceConfig).limit(1)
      if (existing.length > 0) {
        await db.update(maintenanceConfig)
          .set({
            enabled:     enabled     ?? false,
            title:       title       ?? 'NutriLog sedang dalam perbaikan',
            description: description ?? 'Kami sedang melakukan peningkatan sistem.',
            updatedAt:   new Date(),
          })
          .where(eq(maintenanceConfig.id, existing[0].id))
      } else {
        await db.insert(maintenanceConfig).values({
          enabled:     enabled     ?? false,
          title:       title       ?? 'NutriLog sedang dalam perbaikan',
          description: description ?? 'Kami sedang melakukan peningkatan sistem.',
          updatedAt:   new Date(),
        })
      }
      invalidateMaintenanceCache()
      return ok({ message: `Mode maintenance ${enabled ? 'diaktifkan' : 'dinonaktifkan'}` })
    }

    if (action === 'create_user') {
      const { username, password, dailyLimit, email } = await req.json()
      if (!username || !password) return err('Username dan password diperlukan')
      if (password.length < 6) return err('Password minimal 6 karakter')
      let resolvedEmail: string | null = null
      if (email && typeof email === 'string' && email.trim() !== '') {
        const trimmedEmail = email.trim().toLowerCase()
        if (!isValidEmail(trimmedEmail)) return err('Format email tidak valid')
        const [existingEmail] = await db.select({ id: users.id })
          .from(users).where(eq(users.email, trimmedEmail)).limit(1)
        if (existingEmail) return err('Email sudah digunakan', 409)
        resolvedEmail = trimmedEmail
      }
      const { hashPassword } = await import('@/lib/auth')
      const hash = await hashPassword(password)
      try {
        const [user] = await db.insert(users)
          .values({ username: username.toLowerCase().trim(), passwordHash: hash, dailyLimit: dailyLimit || null, email: resolvedEmail })
          .returning({ id: users.id, username: users.username })
        if (resolvedEmail) sendVerificationEmailInBackground({ userId: user.id, email: resolvedEmail, username: user.username })
        return ok({ user })
      } catch {
        return err('Username sudah digunakan', 409)
      }
    }

    if (action === 'update_user') {
      const { userId, isActive, dailyLimit, email } = await req.json()
      if (!userId) return err('userId diperlukan')
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (isActive !== undefined) updateData.isActive = isActive
      if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit === '' ? null : Number(dailyLimit)
      let newVerificationEmail: string | null = null
      if (email !== undefined) {
        const [current] = await db.select({ email: users.email })
          .from(users).where(eq(users.id, userId)).limit(1)

        if (email === '' || email === null) {
          updateData.email = null
          updateData.emailVerifiedAt = null
        } else {
          const trimmedEmail = String(email).trim().toLowerCase()
          if (!isValidEmail(trimmedEmail)) return err('Format email tidak valid')
          const [existingEmail] = await db.select({ id: users.id })
            .from(users).where(eq(users.email, trimmedEmail)).limit(1)
          if (existingEmail && existingEmail.id !== userId) return err('Email sudah digunakan', 409)
          updateData.email = trimmedEmail
          // Email benar-benar berubah → reset status verifikasi & kirim ulang
          // link, terlepas apakah email sebelumnya sudah terverifikasi atau belum.
          if (current?.email !== trimmedEmail) {
            updateData.emailVerifiedAt = null
            newVerificationEmail = trimmedEmail
          }
        }
      }
      const [updated] = await db.update(users).set(updateData)
        .where(eq(users.id, userId))
        .returning({ username: users.username })
      if (newVerificationEmail && updated)
        sendVerificationEmailInBackground({ userId, email: newVerificationEmail, username: updated.username })
      return ok({ message: 'User diperbarui' })
    }

    // RESET USER PASSWORD (Entry Point 3 — Backoffice admin)
    // Admin set password sembarang, user WAJIB ganti saat login berikutnya
    if (action === 'reset_user_password') {
      const { userId, newPassword } = await req.json()
      if (!userId) return err('userId diperlukan')
      if (!newPassword) return err('Password baru diperlukan')
      if (newPassword.length < 6) return err('Password minimal 6 karakter')

      // Ambil username admin dari cookie token untuk audit trail
      const adminCookieToken = req.cookies.get('nl_admin_token')?.value
      let adminUsername = 'admin'
      if (adminCookieToken) {
        try {
          const { jwtVerify } = await import('jose')
          const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || 'fallback-change-in-production-32ch'
          )
          const { payload } = await jwtVerify(adminCookieToken, secret)
          if (payload.username && typeof payload.username === 'string') {
            adminUsername = payload.username
          }
        } catch { /* fallback ke 'admin' */ }
      }

      const { hashPassword } = await import('@/lib/auth')
      const hash = await hashPassword(newPassword)

      await db.update(users).set({
        passwordHash:      hash,
        passwordChangedAt: new Date(),
        passwordChangedBy: 'admin',
        mustChangePassword: true,   // user WAJIB ganti password saat login berikutnya
        adminResetBy:      adminUsername,
        updatedAt:         new Date(),
      }).where(eq(users.id, userId))

      return ok({ message: 'Password user berhasil direset. User wajib ganti password saat login.' })
    }

    if (action === 'delete_user') {
      const { userId } = await req.json()
      if (!userId) return err('userId diperlukan')
      await db.delete(users).where(eq(users.id, userId))
      return ok({ message: 'User dihapus' })
    }

    // ── update report status ───────────────────────────────────────────────────────────────
    if (action === 'update_report') {
      const authError = await requireAdmin(req)
      if (authError) return authError

      const { id, status } = await req.json()
      if (!id) return err('id laporan diperlukan')
      if (!REPORT_STATUSES.includes(status)) return err('Status tidak valid')

      const [report] = await db.select({ source: reports.source }).from(reports).where(eq(reports.id, id)).limit(1)
      if (!report) return err('Laporan tidak ditemukan', 404)
      // 'replied'/'waiting' are helpdesk-reply states — in-app reports have
      // no reply channel yet, so only 'open'/'done' are valid for them.
      if (report.source === 'app' && (status === 'replied' || status === 'waiting'))
        return err('Status ini hanya berlaku untuk laporan dari email', 400)

      await db.update(reports)
        .set({ status, updatedAt: new Date() })
        .where(eq(reports.id, id))
      return ok({ message: 'Status laporan diperbarui' })
    }

    // ── reply to an email-sourced report (sends the actual email + logs the message) ────────
    if (action === 'reply_report') {
      const authError = await requireAdmin(req)
      if (authError) return authError

      const body = await req.json()
      const id = body.id as string | undefined
      const text = typeof body.text === 'string' ? body.text.trim() : ''
      const attachments: { url: string; kind: 'image' | 'video'; sizeBytes?: number }[] =
        Array.isArray(body.attachments) ? body.attachments : []
      if (!id) return err('id laporan diperlukan')
      if (!text && attachments.length === 0) return err('Balasan tidak boleh kosong')

      const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1)
      if (!report) return err('Laporan tidak ditemukan', 404)
      // Security boundary, not just a UI affordance — in-app reports have no
      // reply channel, so this must be rejected server-side too.
      if (report.source !== 'email' || !report.fromEmail)
        return err('Laporan ini tidak bisa dibalas lewat email', 400)

      const priorMessages = await db.select({ emailMessageId: reportMessages.emailMessageId })
        .from(reportMessages).where(eq(reportMessages.reportId, id)).orderBy(reportMessages.createdAt)
      const threadEmailIds = [report.emailMessageId, ...priorMessages.map(m => m.emailMessageId)]
        .filter((v): v is string => !!v)
      const inReplyTo = threadEmailIds[threadEmailIds.length - 1] ?? null

      const subject = report.emailSubject
        ? (/^re:/i.test(report.emailSubject) ? report.emailSubject : `Re: ${report.emailSubject}`)
        : 'Re: Laporan Anda ke Gizku'

      let sentEmailId: string | null = null
      try {
        const result = await sendReportReplyEmail({
          to: report.fromEmail,
          subject,
          bodyText: text,
          attachments: attachments.map(a => ({ url: a.url, kind: a.kind })),
          inReplyTo,
          references: threadEmailIds,
        })
        sentEmailId = result.id
      } catch (e) {
        console.error('[reply_report] gagal mengirim email balasan', e)
        return jsonErr('Gagal mengirim email balasan', 502)
      }

      const [message] = await db.insert(reportMessages).values({
        reportId: id, sender: 'admin', body: text, emailMessageId: sentEmailId,
      }).returning()

      if (attachments.length) {
        await db.insert(reportAttachments).values(attachments.map(a => ({
          messageId: message.id, kind: a.kind, url: a.url, sizeBytes: a.sizeBytes ?? null,
        })))
      }

      await db.update(reports)
        .set({ status: report.status === 'open' ? 'replied' : report.status, updatedAt: new Date() })
        .where(eq(reports.id, id))

      return ok({ message: 'Balasan terkirim ke user' })
    }

    return err('Action tidak dikenal')
  } catch (e) {
    console.error('[admin POST]', e)
    return jsonErr('Internal server error')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')
    if (action === 'delete_meal') {
      const { id } = await req.json()
      if (!id) return err('meal id diperlukan')
      await db.delete(meals).where(eq(meals.id, id))
      return ok({ message: 'Riwayat analisa dihapus' })
    }
    if (action === 'delete_report') {
      const authError = await requireAdmin(req)
      if (authError) return authError

      const { id } = await req.json()
      if (!id) return err('report id diperlukan')
      // report_messages/report_attachments cascade-delete via FK.
      await db.delete(reports).where(eq(reports.id, id))
      return ok({ message: 'Laporan dihapus' })
    }
    return err('Action tidak dikenal')
  } catch (e) {
    console.error('[admin DELETE]', e)
    return jsonErr('Internal server error')
  }
}

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')

    // USER MEALS HISTORY — with pagination + optional date filter
    if (action === 'user_meals') {
      const userId    = req.nextUrl.searchParams.get('user_id')
      if (!userId) return err('user_id diperlukan')

      const page      = parseInt(req.nextUrl.searchParams.get('page') || '1')
      const perPage   = parseInt(req.nextUrl.searchParams.get('per_page') || '15')
      const offset    = (page - 1) * perPage
      const dateParam = req.nextUrl.searchParams.get('date') // YYYY-MM-DD

      const conditions = [eq(meals.userId, userId)]
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        const dayStart = new Date(`${dateParam}T00:00:00.000Z`)
        const dayEnd   = new Date(`${dateParam}T23:59:59.999Z`)
        conditions.push(gte(meals.loggedAt, dayStart))
        conditions.push(lte(meals.loggedAt, dayEnd))
      }
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)

      const userMeals = await db.select({
        id:            meals.id,
        dishNames:     meals.dishNames,
        totalCalories: meals.totalCalories,
        totalProtein:  meals.totalProtein,
        totalCarbs:    meals.totalCarbs,
        totalFat:      meals.totalFat,
        imageUrl:      meals.imageUrl,
        rawAnalysis:   meals.rawAnalysis,
        loggedAt:      meals.loggedAt,
      })
        .from(meals)
        .where(whereClause)
        .orderBy(desc(meals.loggedAt))
        .limit(perPage)
        .offset(offset)

      const [{ c }] = await db.select({ c: count() }).from(meals).where(whereClause)

      return ok({
        meals: userMeals,
        total: c,
        page,
        perPage,
        totalPages: Math.ceil(c / perPage),
      })
    }

    if (action === 'users') {
      const allUsers = await db.select({
        id:                 users.id,
        username:           users.username,
        email:              users.email,
        isActive:           users.isActive,
        dailyLimit:         users.dailyLimit,
        createdAt:          users.createdAt,
        // Password audit trail ───────────────────────
        passwordChangedAt:  users.passwordChangedAt,
        passwordChangedBy:  users.passwordChangedBy,
        mustChangePassword: users.mustChangePassword,
        adminResetBy:       users.adminResetBy,
        emailVerifiedAt:    users.emailVerifiedAt,
      }).from(users).orderBy(desc(users.createdAt))
      return ok({ users: allUsers.map(u => ({ ...u, emailVerified: u.emailVerifiedAt !== null })) })
    }

    if (action === 'stats') {
      const [userCount]   = await db.select({ total: count() }).from(users)
      const [mealCount]   = await db.select({ total: count() }).from(meals)
      const [reportCount] = await db.select({ total: count() }).from(reports)
      return ok({ users: userCount.total, meals: mealCount.total, reports: reportCount.total })
    }

    if (action === 'config') {
      const globalLimit    = await getGlobalLimit()
      const apiKey         = await getCfg('anthropic_api_key')
      const anthropicModel = await getCfg('anthropic_model') || 'claude-sonnet-5'
      const maintenance    = await getMaintenance()
      const emailVerificationExpiryHours = await getVerificationExpiryHours()
      return ok({ globalLimit, apiKey: apiKey ? '••••••••' : '', anthropicModel, maintenance, emailVerificationExpiryHours })
    }

    // ── list all reports (for client-side fetching) ─────────────────────────────────────────────────
    if (action === 'reports') {
      const authError = await requireAdmin(req)
      if (authError) return authError

      const status = req.nextUrl.searchParams.get('status') // optional: open|replied|waiting|done
      const rows = status
        ? await db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt))
        : await db.select().from(reports).orderBy(desc(reports.createdAt))
      return ok({ reports: rows })
    }

    // ── single report: full thread + resolved account context ───────────────────────────────
    if (action === 'report_thread') {
      const authError = await requireAdmin(req)
      if (authError) return authError

      const id = req.nextUrl.searchParams.get('id')
      if (!id) return err('id laporan diperlukan')

      const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1)
      if (!report) return err('Laporan tidak ditemukan', 404)

      const userSelect = {
        id: users.id, username: users.username, email: users.email, isActive: users.isActive, dailyLimit: users.dailyLimit,
      }
      let user: { id: string; username: string; email: string | null; isActive: boolean; dailyLimit: number | null } | null = null
      if (report.userId) {
        const [u] = await db.select(userSelect).from(users).where(eq(users.id, report.userId)).limit(1)
        user = u ?? null
      } else if (report.source === 'email' && report.fromEmail) {
        // Resolved at READ time (not on inbound insert) so a sender who
        // registers an account after emailing support retroactively shows
        // as "Terdaftar" without touching historical rows.
        const [u] = await db.select(userSelect).from(users)
          .where(sql`lower(${users.email}) = lower(${report.fromEmail})`).limit(1)
        user = u ?? null
      }

      const globalLimit = await getGlobalLimit()
      let todayUsage = 0
      if (user) {
        const [row] = await db.select({ count: dailyUsage.count }).from(dailyUsage)
          .where(and(eq(dailyUsage.userId, user.id), eq(dailyUsage.date, todayISO()))).limit(1)
        todayUsage = row?.count ?? 0
      }

      const msgs = await db.select().from(reportMessages)
        .where(eq(reportMessages.reportId, id)).orderBy(reportMessages.createdAt)
      const msgIds = msgs.map(m => m.id)
      const atts = msgIds.length
        ? await db.select().from(reportAttachments).where(inArray(reportAttachments.messageId, msgIds))
        : []

      const messages = [
        { id: 'initial', sender: 'user' as const, body: report.message, createdAt: report.createdAt, attachments: [] as typeof atts },
        ...msgs.map(m => ({ ...m, attachments: atts.filter(a => a.messageId === m.id) })),
      ]

      return ok({
        report,
        user: user ? {
          id: user.id, username: user.username, email: user.email, isActive: user.isActive,
          dailyLimit: user.dailyLimit ?? globalLimit, isCustomLimit: user.dailyLimit != null,
          todayUsage,
        } : null,
        messages,
      })
    }

    return err('Action tidak dikenal')
  } catch (e) {
    console.error('[admin GET]', e)
    return jsonErr('Internal server error')
  }
}
