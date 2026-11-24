import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isMaintenanceExempt, readMaintenanceState, resetMaintenanceGateCache, maintenanceBody } from './maintenanceGate'

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response

describe('isMaintenanceExempt', () => {
  it('menjaga API user', () => {
    for (const p of ['/api/history', '/api/user', '/api/auth', '/api/analyze', '/api/limit/new', '/api/report', '/api/notifications', '/api/push/register', '/api/beta-optin']) {
      expect(isMaintenanceExempt(p), p).toBe(false)
    }
  })
  it('melewatkan endpoint yang harus tetap hidup', () => {
    for (const p of ['/api/maintenance', '/api/admin', '/api/admin/users/1/meals', '/api/cron/prune-old-usage', '/api/webhooks/email', '/api/telegram', '/api/legal-content']) {
      expect(isMaintenanceExempt(p), p).toBe(true)
    }
  })
  it('tidak salah cocok pada prefix serupa', () => {
    expect(isMaintenanceExempt('/api/administrator')).toBe(false)
    expect(isMaintenanceExempt('/api/maintenance-x')).toBe(false)
  })
})

describe('readMaintenanceState', () => {
  beforeEach(() => resetMaintenanceGateCache())

  it('status aktif tidak di-cache', async () => {
    const f = vi.fn().mockResolvedValue(json({ enabled: true, title: 'T', description: 'D' }))
    expect((await readMaintenanceState('https://x.test', f, 1000)).enabled).toBe(true)
    await readMaintenanceState('https://x.test', f, 1001)
    expect(f).toHaveBeenCalledTimes(2)
  })
  it('status mati di-cache 5 detik', async () => {
    const f = vi.fn().mockResolvedValue(json({ enabled: false }))
    await readMaintenanceState('https://x.test', f, 1000)
    await readMaintenanceState('https://x.test', f, 3000)
    expect(f).toHaveBeenCalledTimes(1)
    await readMaintenanceState('https://x.test', f, 7000)
    expect(f).toHaveBeenCalledTimes(2)
  })
  it('fail-open bila endpoint gagal', async () => {
    expect((await readMaintenanceState('https://x.test', vi.fn().mockRejectedValue(new Error('x')))).enabled).toBe(false)
    expect((await readMaintenanceState('https://x.test', vi.fn().mockResolvedValue(json({}, false)))).enabled).toBe(false)
  })
  it('body 503 memuat field maintenance yang dibaca mobile', () => {
    expect(maintenanceBody({ enabled: true, title: 'A', description: 'B' })).toEqual({ ok: false, error: 'A', maintenance: { title: 'A', description: 'B' } })
  })
})
