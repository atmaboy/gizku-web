/**
 * Kompatibilitas app mobile lama (1.2.0 dan sebelumnya) dengan backend baru.
 * Request di sini meniru persis yang dikirim app lama: hanya Authorization + Content-Type, tanpa X-App-* /
 * X-Device-Id, body PATCH hanya { analysis }, register push tanpa device id. Handler route asli dijalankan
 * dengan database palsu yang mencatat setiap operasi.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Call = { op: string; args: unknown[] }
const state = vi.hoisted(() => ({ calls: [] as { op: string; args: unknown[] }[], results: [] as unknown[] }))

vi.mock('@/lib/db', () => {
  // Rantai query palsu: setiap method dicatat dan mengembalikan rantai yang sama; await menghasilkan hasil berikutnya.
  const chain: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') {
        const r = state.results.length ? state.results.shift() : []
        return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(r).then(res, rej)
      }
      return (...args: unknown[]) => { state.calls.push({ op: String(prop), args }); return chain }
    },
  })
  return { db: chain }
})
vi.mock('@/lib/auth', () => ({
  extractToken: (h: string | null) => (h?.startsWith('Bearer ') ? h.slice(7) : null),
  verifyToken: async () => ({ userId: 'user-1', username: 'u', role: 'user' }),
  signUserToken: async () => 'jwt',
  hashPassword: async () => 'hash',
}))
vi.mock('@/lib/admin', () => ({ getGlobalLimit: async () => 5 }))
vi.mock('@/lib/limitLedger', () => ({ computeEffectiveLimit: async () => 5 }))
vi.mock('@/lib/blast', () => ({ ackBlastRecipient: async () => undefined }))
vi.mock('@/lib/maintenance', () => ({ checkMaintenance: async () => ({ enabled: false }), maintenanceResponse: () => new Response() }))
vi.mock('@/lib/emailDomain.server', () => ({ isFakeEmail: () => false }))
vi.mock('@/lib/emailVerification', () => ({ sendVerificationEmailInBackground: () => undefined }))
vi.mock('@/lib/betaOptinConfig', () => ({ getBetaOptinConfig: async () => ({ enabled: false }) }))

import { PATCH, POST as historyPost } from '@/app/api/history/route'
import { POST as pushPost } from '@/app/api/push/route'
import { POST as authPost } from '@/app/api/auth/route'

/** Header persis seperti app lama (lihat src/api/client.ts sebelum versi 1.2.1). */
const oldHeaders = { Authorization: 'Bearer old-app-token', 'Content-Type': 'application/json' }

const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: oldHeaders, body: body === undefined ? undefined : JSON.stringify(body) })

const ops = (name: string) => state.calls.filter((c: Call) => c.op === name)
const analysis = {
  dishes: [{ name: 'Nasi goreng', portion: '1 piring', calories: 520, protein: 14, carbs: 68, fat: 21 }],
  total: { calories: 520, protein: 14, carbs: 68, fat: 21 },
  notes: 'ok',
}
const oldMeal = { id: 'm1', userId: 'user-1', scannedAt: new Date(Date.now() - 10 * 24 * 3600_000), loggedAt: new Date(Date.now() - 10 * 24 * 3600_000) }

beforeEach(() => { state.calls.length = 0; state.results.length = 0 })

describe('PATCH /api/history (old app sends only { analysis })', () => {
  it('still updates a meal that is far past the 24h date window: the lock only concerns loggedAt', async () => {
    state.results.push([oldMeal], [{ ...oldMeal, totalCalories: 520 }])
    const res = await PATCH(req('/api/history?id=m1', 'PATCH', { analysis }))
    expect(res.status).toBe(200)
    expect((await res.json()).meal.id).toBe('m1')
    const set = ops('set')[0].args[0] as Record<string, unknown>
    expect(set.totalCalories).toBe(520)
    expect(set.dishNames).toEqual(['Nasi goreng'])
    expect(set.rawAnalysis).toEqual(analysis)
    expect('loggedAt' in set).toBe(false) // never touches the date
  })
  it('keeps analysis fields the old app does not know about (aiOriginal) inside rawAnalysis', async () => {
    state.results.push([oldMeal], [oldMeal])
    const withOriginal = { ...analysis, aiOriginal: { dishes: [], total: analysis.total } }
    await PATCH(req('/api/history?id=m1', 'PATCH', { analysis: withOriginal }))
    expect((ops('set')[0].args[0] as { rawAnalysis: unknown }).rawAnalysis).toEqual(withOriginal)
  })
  it('rejects an empty body with 400, like before', async () => {
    const res = await PATCH(req('/api/history?id=m1', 'PATCH', {}))
    expect(res.status).toBe(400)
  })
  it('404 for a meal that is not theirs, like before', async () => {
    state.results.push([])
    expect((await PATCH(req('/api/history?id=nope', 'PATCH', { analysis }))).status).toBe(404)
  })
})

describe('POST /api/history (old app save, incl. backdated draft)', () => {
  it('saves without any new field and succeeds', async () => {
    state.results.push([{ id: 'new' }])
    const res = await historyPost(req('/api/history', 'POST', { analysis, imageDataUrl: null, source: 'app-android' }))
    expect(res.status).toBe(200)
    const values = ops('values')[0].args[0] as Record<string, unknown>
    expect(values.source).toBe('app-android')
    expect('loggedAt' in values).toBe(false) // scanned_at falls back to the DB default now()
  })
  it('a backdated draft save anchors scanned_at on the capture time', async () => {
    const captured = new Date(Date.now() - 3 * 3600_000).toISOString()
    state.results.push([{ id: 'new' }])
    await historyPost(req('/api/history', 'POST', { analysis, imageDataUrl: null, source: 'app-android', loggedAt: captured }))
    const values = ops('values')[0].args[0] as { loggedAt: Date; scannedAt: Date }
    expect(values.loggedAt.toISOString()).toBe(captured)
    expect(values.scannedAt.toISOString()).toBe(captured)
  })
})

describe('POST /api/push?action=register (old app, no X-Device-Id)', () => {
  const body = { token: 'ExponentPushToken[abc]', platform: 'android', language: 'id', provider: 'expo' }
  it('registers the token and writes nothing about devices or app versions', async () => {
    const res = await pushPost(req('/api/push?action=register', 'POST', body))
    expect(res.status).toBe(200)
    expect(ops('insert')).toHaveLength(1) // only the push_tokens upsert
    expect(ops('update')).toHaveLength(0) // no device linking, no deactivation of other tokens
  })
  it('keeps the old FCM migration: `replaces` deactivates only the previous Expo token', async () => {
    const res = await pushPost(req('/api/push?action=register', 'POST', { ...body, token: 'fcm-token', provider: 'fcm', replaces: 'ExponentPushToken[abc]' }))
    expect(res.status).toBe(200)
    expect(ops('update')).toHaveLength(1)
    expect((ops('set').at(-1)!.args[0] as { isActive: boolean }).isActive).toBe(false)
  })
  it('still validates input exactly as before', async () => {
    expect((await pushPost(req('/api/push?action=register', 'POST', { ...body, platform: 'web' }))).status).toBe(400)
    expect((await pushPost(req('/api/push?action=register', 'POST', { ...body, token: '' }))).status).toBe(400)
  })
})

describe('POST /api/auth (old app, no X-App-* headers)', () => {
  it('login works and records nothing about app versions', async () => {
    state.results.push([{ id: 'user-1', username: 'u', isActive: true, passwordHash: 'hash', dailyLimit: null, mustChangePassword: false }])
    const res = await authPost(req('/api/auth?action=login', 'POST', { username: 'u', password: 'secret1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBe('jwt')
    expect(json.user).toMatchObject({ id: 'user-1', username: 'u', mustChangePassword: false })
    expect(ops('insert')).toHaveLength(0) // no user_app_clients / user_devices writes
  })
  it('verify works and records nothing', async () => {
    state.results.push([{ id: 'user-1', username: 'u', isActive: true, dailyLimit: null, mustChangePassword: false }])
    const res = await authPost(req('/api/auth?action=verify', 'POST'))
    expect(res.status).toBe(200)
    expect((await res.json()).valid).toBe(true)
    expect(ops('insert')).toHaveLength(0)
  })
})
