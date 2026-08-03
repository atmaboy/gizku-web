/**
 * Admin backoffice — "Request Kenaikan Limit Analisa".
 *
 * GET  ?action=stats                                    — pending/approved-this-month/nominal-this-month tiles
 * GET  ?action=requests&status=&page=&pageSize=          — paginated request queue
 * GET  ?action=request&id=                               — full request detail
 * GET  ?action=search_users&field=name|email|id&query=   — user lookup for Riwayat Limit User tab
 * GET  ?action=user_ledger&userId=                       — one user's usage/reset ledger
 * GET  ?action=config                                    — bank info, feature flag, tiers
 * POST {action:'approve', id}                            — approves a pending request
 * POST {action:'reject', id, reason, note?}               — rejects a pending request
 * POST {action:'update_config', bankName, accountNumber, accountHolder, featureEnabled, tiers}
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { limitRequests, limitTiers, users } from '@/drizzle/schema'
import { requireAdmin, getGlobalLimit } from '@/lib/admin'
import { ok, err, setCors } from '@/lib/utils'
import { REJECT_REASONS, getLimitBankConfig, setLimitConfig, isLimitFeatureEnabled, listTiers } from '@/lib/limit'
import { getApprovedPeriods, computeUserLedger } from '@/lib/limitLedger'
import { eq, and, desc, count, sum, gte, lt, ilike, sql, notInArray } from 'drizzle-orm'

function jsonErr(msg: string, status = 500) {
  const h = new Headers(); setCors(h)
  return Response.json({ error: msg }, { status, headers: h })
}

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  try {
    return await handleGet(req)
  } catch (e) {
    console.error('[admin/limit GET]', e)
    return jsonErr('Gagal memuat data. Pastikan migration sql/005_create_limit_request_feature.sql sudah dijalankan.')
  }
}

async function handleGet(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'stats') {
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

    const [[pending], [approvedThisMonth]] = await Promise.all([
      db.select({ c: count() }).from(limitRequests).where(eq(limitRequests.status, 'pending')),
      db.select({ c: count(), nominal: sum(limitRequests.totalTransfer) }).from(limitRequests)
        .where(and(
          eq(limitRequests.status, 'approved'),
          gte(limitRequests.decidedAt, monthStart),
          lt(limitRequests.decidedAt, monthEnd),
        )),
    ])

    return ok({
      pendingCount: pending.c,
      approvedThisMonthCount: approvedThisMonth.c,
      nominalMasukThisMonth: Number(approvedThisMonth.nominal ?? 0),
    })
  }

  if (action === 'requests') {
    const status = req.nextUrl.searchParams.get('status') || 'all'
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('pageSize') || '10', 10)))
    const offset = (page - 1) * pageSize

    const whereClause = ['pending', 'approved', 'rejected'].includes(status)
      ? eq(limitRequests.status, status)
      : undefined

    const [rows, [{ c: total }]] = await Promise.all([
      db.select({
        id: limitRequests.id,
        userId: limitRequests.userId,
        userName: users.username,
        tierLabel: limitRequests.tierLabel,
        totalPerDay: limitRequests.totalPerDay,
        totalTransfer: limitRequests.totalTransfer,
        submittedAt: limitRequests.submittedAt,
        status: limitRequests.status,
      })
        .from(limitRequests)
        .innerJoin(users, eq(users.id, limitRequests.userId))
        .where(whereClause)
        .orderBy(desc(limitRequests.submittedAt))
        .limit(pageSize).offset(offset),
      db.select({ c: count() }).from(limitRequests).where(whereClause),
    ])

    return ok({ items: rows, page, pageCount: Math.max(1, Math.ceil(total / pageSize)), total })
  }

  if (action === 'request') {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return err('id diperlukan')

    const [row] = await db.select({
      r: limitRequests, userName: users.username,
    }).from(limitRequests)
      .innerJoin(users, eq(users.id, limitRequests.userId))
      .where(eq(limitRequests.id, id)).limit(1)
    if (!row) return err('Request tidak ditemukan', 404)

    let expiresAt: string | null = null
    if (row.r.status === 'approved') {
      const periods = await getApprovedPeriods(row.r.userId)
      expiresAt = periods.find(p => p.requestId === row.r.id)?.end ?? null
    }

    return ok({
      id: row.r.id, userId: row.r.userId, userName: row.userName,
      tierLabel: row.r.tierLabel, addPerDay: row.r.addPerDay, totalPerDay: row.r.totalPerDay,
      price: row.r.price, uniqueCode: row.r.uniqueCode, totalTransfer: row.r.totalTransfer,
      status: row.r.status, submittedAt: row.r.submittedAt, decidedAt: row.r.decidedAt,
      proofImageUrl: row.r.proofImageUrl, note: row.r.note,
      rejectReason: row.r.rejectReason, rejectNote: row.r.rejectNote,
      ...(row.r.status === 'approved' ? { expiresAt } : {}),
    })
  }

  if (action === 'search_users') {
    const field = req.nextUrl.searchParams.get('field') || 'name'
    const query = (req.nextUrl.searchParams.get('query') || '').trim()
    if (!query) return err('Kata kunci pencarian diperlukan')

    const pattern = `%${query}%`
    const whereClause =
      field === 'email' ? ilike(users.email, pattern) :
      field === 'id'    ? sql`${users.id}::text ILIKE ${pattern}` :
      ilike(users.username, pattern)

    const rows = await db.select({
      userId: users.id, name: users.username, email: users.email, dailyLimit: users.dailyLimit,
    }).from(users).where(whereClause).limit(20)

    const globalLimit = await getGlobalLimit()

    return ok(rows.map(r => ({
      userId: r.userId, name: r.name, email: r.email, dailyLimit: r.dailyLimit ?? globalLimit,
    })))
  }

  if (action === 'user_ledger') {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return err('userId diperlukan')

    const [u] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1)
    if (!u) return err('User tidak ditemukan', 404)

    const { balance, rows } = await computeUserLedger(userId)
    return ok({ userName: u.username, balance, rows })
  }

  if (action === 'config') {
    const [bank, featureEnabled, tiers] = await Promise.all([
      getLimitBankConfig(), isLimitFeatureEnabled(), listTiers(),
    ])
    return ok({
      ...bank,
      featureEnabled,
      tiers: tiers.map(t => ({ id: t.id, label: t.label, addPerDay: t.addPerDay, price: t.price })),
    })
  }

  return err('Action tidak dikenal')
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req)
  if (authError) return authError

  try {
    return await handlePost(req)
  } catch (e) {
    console.error('[admin/limit POST]', e)
    return jsonErr('Gagal memproses permintaan. Pastikan migration sql/005_create_limit_request_feature.sql sudah dijalankan.')
  }
}

async function handlePost(req: NextRequest) {
  const body = await req.json()
  const action = body?.action

  if (action === 'approve') {
    const id = body.id
    if (!id) return err('id diperlukan')

    const updated = await db.update(limitRequests)
      .set({ status: 'approved', decidedAt: new Date() })
      .where(and(eq(limitRequests.id, id), eq(limitRequests.status, 'pending')))
      .returning({ id: limitRequests.id })

    if (updated.length === 0) return err('Request sudah diproses atau tidak ditemukan', 409)
    return ok({ message: 'Request disetujui' })
  }

  if (action === 'reject') {
    const id = body.id
    const reason = body.reason
    const note = body.note ? String(body.note).trim() : null
    if (!id) return err('id diperlukan')
    if (!REJECT_REASONS.includes(reason)) return err('Alasan penolakan tidak valid')

    const updated = await db.update(limitRequests)
      .set({ status: 'rejected', decidedAt: new Date(), rejectReason: reason, rejectNote: note })
      .where(and(eq(limitRequests.id, id), eq(limitRequests.status, 'pending')))
      .returning({ id: limitRequests.id })

    if (updated.length === 0) return err('Request sudah diproses atau tidak ditemukan', 409)
    return ok({ message: 'Request ditolak' })
  }

  if (action === 'update_config') {
    const bankName = String(body.bankName ?? '').trim()
    const accountNumber = String(body.accountNumber ?? '').trim()
    const accountHolder = String(body.accountHolder ?? '').trim()
    const featureEnabled = !!body.featureEnabled
    const tiersInput: unknown[] = Array.isArray(body.tiers) ? body.tiers : []

    if (tiersInput.length < 1 || tiersInput.length > 10) return err('Jumlah tier harus antara 1 dan 10')

    type TierInput = { id?: string; label?: string; addPerDay?: number; price?: number }
    const parsed = tiersInput.map((t): TierInput => t as TierInput)
    for (const t of parsed) {
      if (!t.label || !String(t.label).trim()) return err('Nama tier tidak boleh kosong')
      if (!Number.isFinite(t.addPerDay) || Number(t.addPerDay) <= 0) return err(`Tambahan per hari tidak valid untuk tier "${t.label}"`)
      if (!Number.isFinite(t.price) || Number(t.price) < 0) return err(`Harga tidak valid untuk tier "${t.label}"`)
    }

    await db.transaction(async tx => {
      const keepIds = parsed.filter(t => t.id).map(t => t.id!) as string[]

      // Delete tiers omitted from the submitted array — safe because requests
      // snapshot their own tier fields (tierLabel/addPerDay/totalPerDay/price).
      if (keepIds.length > 0) {
        await tx.delete(limitTiers).where(notInArray(limitTiers.id, keepIds))
      } else {
        await tx.delete(limitTiers)
      }

      for (let i = 0; i < parsed.length; i++) {
        const t = parsed[i]
        const values = {
          label: String(t.label).trim(),
          addPerDay: Number(t.addPerDay),
          price: Number(t.price),
          sortOrder: i,
          updatedAt: new Date(),
        }
        if (t.id) {
          await tx.update(limitTiers).set(values).where(eq(limitTiers.id, t.id))
        } else {
          await tx.insert(limitTiers).values(values)
        }
      }
    })

    // Bank/feature-flag config lives in the generic admin_config key/value
    // store (lib/admin.ts), a separate connection from the tier transaction
    // above — kept as a distinct step right after it commits.
    await setLimitConfig({ bankName, accountNumber, accountHolder, featureEnabled })

    return ok({ message: 'Konfigurasi disimpan' })
  }

  return err('Action tidak dikenal')
}
