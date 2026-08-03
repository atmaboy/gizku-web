/**
 * User-facing — "Request Kenaikan Limit Analisa" (food-analysis daily-quota
 * increase request).
 *
 * GET  ?action=config            — feature flag, tiers (with totalPerDay for THIS user), bank info
 * GET  ?action=summary           — for the Settings card: dailyLimit/used/remaining/activeTier
 * GET  ?action=requests          — caller's own requests, newest first
 * GET  ?action=request&id=       — single request detail (must belong to caller)
 * GET  ?action=ledger            — usage/reset ledger, newest first
 * POST {action:'reserve_code', tierId}                                — purely computed, nothing persisted
 * POST {action:'submit_request', tierId, uniqueCode, proofImageUrl, note?} — creates a pending request
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { limitRequests, users, dailyUsage } from '@/drizzle/schema'
import { verifyToken, extractToken } from '@/lib/auth'
import { ok, err, setCors, todayISO } from '@/lib/utils'
import {
  isLimitFeatureEnabled, getLimitBankConfig, listTiers, getTierById,
  getUserFloor, generateUniqueCode, computeTotalTransfer,
} from '@/lib/limit'
import { getActiveTier, computeUserLedger, getApprovedPeriods } from '@/lib/limitLedger'
import { getGlobalLimit } from '@/lib/admin'
import { eq, and, desc, ne } from 'drizzle-orm'

function jsonErr(msg: string, status = 500) {
  const h = new Headers(); setCors(h)
  return Response.json({ error: msg }, { status, headers: h })
}

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

async function authUser(req: NextRequest) {
  const token = extractToken(req.headers.get('Authorization'))
  if (!token) return null
  try {
    const p = await verifyToken(token)
    if (!p.userId) return null
    return p as { userId: string; username: string; role: string }
  } catch { return null }
}

function requestDetailShape(r: typeof limitRequests.$inferSelect, expiresAt: string | null) {
  return {
    id: r.id,
    // tierId is not part of the documented contract (tier fields are
    // snapshotted, so callers shouldn't need it) — included as an extra,
    // harmless field so the web "Ajukan Ulang" flow can preselect the same
    // tier if it still exists, without breaking clients that ignore it.
    tierId: r.tierId,
    tierLabel: r.tierLabel,
    addPerDay: r.addPerDay,
    totalPerDay: r.totalPerDay,
    price: r.price,
    uniqueCode: r.uniqueCode,
    totalTransfer: r.totalTransfer,
    status: r.status,
    submittedAt: r.submittedAt,
    decidedAt: r.decidedAt,
    proofImageUrl: r.proofImageUrl,
    note: r.note,
    rejectReason: r.rejectReason,
    rejectNote: r.rejectNote,
    ...(r.status === 'approved' ? { expiresAt } : {}),
  }
}

export async function GET(req: NextRequest) {
  const user = await authUser(req)
  if (!user) return err('Token tidak valid', 401)

  try {
    return await handleGet(req, user.userId)
  } catch (e) {
    console.error('[limit GET]', e)
    return jsonErr('Gagal memuat data. Pastikan migration sql/005_create_limit_request_feature.sql sudah dijalankan.')
  }
}

async function handleGet(req: NextRequest, userId: string) {
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'config') {
    const [featureEnabled, bank, tiers, floor] = await Promise.all([
      isLimitFeatureEnabled(),
      getLimitBankConfig(),
      listTiers(),
      getUserFloor(userId),
    ])
    return ok({
      featureEnabled,
      baseDailyLimit: floor,
      tiers: tiers.map(t => ({
        id: t.id, label: t.label, addPerDay: t.addPerDay, price: t.price,
        totalPerDay: floor + t.addPerDay,
      })),
      bank,
    })
  }

  if (action === 'summary') {
    const [[u], globalLimit, featureEnabled] = await Promise.all([
      db.select({ dailyLimit: users.dailyLimit }).from(users).where(eq(users.id, userId)).limit(1),
      getGlobalLimit(),
      isLimitFeatureEnabled(),
    ])
    const floor = u?.dailyLimit ?? globalLimit
    const active = await getActiveTier(userId)
    const dailyLimit = active ? Math.max(floor, active.totalPerDay) : floor

    const today = todayISO()
    const [usage] = await db.select().from(dailyUsage)
      .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, today))).limit(1)
    const used = usage?.count ?? 0

    return ok({
      dailyLimit,
      used,
      remaining: Math.max(0, dailyLimit - used),
      activeTier: active ? { label: active.label, expiresAt: active.expiresAt } : null,
      featureEnabled,
    })
  }

  if (action === 'requests') {
    const rows = await db.select().from(limitRequests)
      .where(eq(limitRequests.userId, userId))
      .orderBy(desc(limitRequests.submittedAt))
    return ok(rows.map(r => ({
      id: r.id, tierId: r.tierId, tierLabel: r.tierLabel, addPerDay: r.addPerDay, totalPerDay: r.totalPerDay,
      price: r.price, uniqueCode: r.uniqueCode, totalTransfer: r.totalTransfer,
      status: r.status, submittedAt: r.submittedAt, decidedAt: r.decidedAt,
    })))
  }

  if (action === 'request') {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return err('id diperlukan')
    const [r] = await db.select().from(limitRequests)
      .where(and(eq(limitRequests.id, id), eq(limitRequests.userId, userId))).limit(1)
    if (!r) return err('Request tidak ditemukan', 404)

    let expiresAt: string | null = null
    if (r.status === 'approved') {
      const periods = await getApprovedPeriods(userId)
      expiresAt = periods.find(p => p.requestId === r.id)?.end ?? null
    }
    return ok(requestDetailShape(r, expiresAt))
  }

  if (action === 'ledger') {
    const { balance, rows } = await computeUserLedger(userId)
    return ok({ balance, rows })
  }

  return err('Action tidak dikenal')
}

export async function POST(req: NextRequest) {
  const user = await authUser(req)
  if (!user) return err('Token tidak valid', 401)

  try {
    return await handlePost(req, user.userId)
  } catch (e) {
    console.error('[limit POST]', e)
    return jsonErr('Gagal memproses permintaan. Pastikan migration sql/005_create_limit_request_feature.sql sudah dijalankan.')
  }
}

async function handlePost(req: NextRequest, userId: string) {
  const body = await req.json()
  const bodyAction = body?.action

  if (bodyAction === 'reserve_code') {
    const featureEnabled = await isLimitFeatureEnabled()
    if (!featureEnabled) return err('Fitur penambahan limit sedang tidak tersedia', 403)

    const tierId = body.tierId
    if (!tierId) return err('tierId diperlukan')
    const tier = await getTierById(tierId)
    if (!tier) return err('Paket tidak ditemukan', 404)

    const floor = await getUserFloor(userId)
    const uniqueCode = await generateUniqueCode()
    const totalTransfer = computeTotalTransfer(tier.price, uniqueCode)

    return ok({
      tierId: tier.id,
      tierLabel: tier.label,
      addPerDay: tier.addPerDay,
      totalPerDay: floor + tier.addPerDay,
      price: tier.price,
      uniqueCode,
      totalTransfer,
    })
  }

  if (bodyAction === 'submit_request') {
    const featureEnabled = await isLimitFeatureEnabled()
    if (!featureEnabled) return err('Fitur penambahan limit sedang tidak tersedia', 403)

    const tierId = body.tierId
    const uniqueCode = Number(body.uniqueCode)
    const proofImageUrl = String(body.proofImageUrl ?? '')
    const note = body.note ? String(body.note).trim() : null

    if (!tierId) return err('tierId diperlukan')
    if (!Number.isInteger(uniqueCode) || uniqueCode < 100 || uniqueCode > 999) return err('Kode unik tidak valid')
    if (!proofImageUrl) return err('Bukti transfer diperlukan')

    const tier = await getTierById(tierId)
    if (!tier) return err('Paket tidak ditemukan', 404)

    // Race check — the code may have been taken since it was reserved.
    const [taken] = await db.select({ id: limitRequests.id }).from(limitRequests)
      .where(and(eq(limitRequests.uniqueCode, uniqueCode), ne(limitRequests.status, 'approved')))
      .limit(1)

    const floor = await getUserFloor(userId)

    if (taken) {
      const newCode = await generateUniqueCode()
      const newTotalTransfer = computeTotalTransfer(tier.price, newCode)
      const h = new Headers(); setCors(h)
      return Response.json({
        ok: false,
        error: 'code_taken',
        data: { uniqueCode: newCode, totalTransfer: newTotalTransfer },
      }, { status: 409, headers: h })
    }

    const totalPerDay = floor + tier.addPerDay
    const totalTransfer = computeTotalTransfer(tier.price, uniqueCode)

    const [created] = await db.insert(limitRequests).values({
      userId,
      tierId: tier.id,
      tierLabel: tier.label,
      addPerDay: tier.addPerDay,
      totalPerDay,
      price: tier.price,
      uniqueCode,
      totalTransfer,
      status: 'pending',
      proofImageUrl,
      note,
    }).returning()

    return ok(requestDetailShape(created, null))
  }

  return err('Action tidak dikenal')
}
