import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './rateLimiter'
import { sendEmailsRateLimited } from './blast'
import { EmailSendError } from './email'

function fakeClock() {
  let t = 0
  return { now: () => t, sleep: async (ms: number) => { t += ms }, advance: (ms: number) => { t += ms } }
}

describe('createRateLimiter', () => {
  it('never allows more than max acquisitions in any window', async () => {
    const c = fakeClock()
    const lim = createRateLimiter({ max: 10, windowMs: 1100, now: c.now, sleep: c.sleep })
    const starts: number[] = []
    for (let i = 0; i < 45; i++) { await lim.acquire(); starts.push(c.now()) }
    for (const s of starts) {
      expect(starts.filter(x => x >= s && x < s + 1000).length).toBeLessThanOrEqual(10)
    }
    expect(starts[9]).toBe(0)       // first 10 immediately
    expect(starts[10]).toBeGreaterThanOrEqual(1100)
  })

  it('concurrent callers are served in order without exceeding the limit', async () => {
    const c = fakeClock()
    const lim = createRateLimiter({ max: 2, windowMs: 100, now: c.now, sleep: c.sleep })
    const order: number[] = []
    await Promise.all([0, 1, 2, 3, 4].map(i => lim.acquire().then(() => order.push(i))))
    expect(order).toEqual([0, 1, 2, 3, 4])
  })
})

describe('sendEmailsRateLimited', () => {
  const targets = Array.from({ length: 25 }, (_, i) => ({ email: `u${i}@gizku.test` }))

  it('paces sends through the limiter (≤10 per second)', async () => {
    const c = fakeClock()
    const limiter = createRateLimiter({ max: 10, windowMs: 1100, now: c.now, sleep: c.sleep })
    const startedAt: number[] = []
    const r = await sendEmailsRateLimited(targets, async () => { startedAt.push(c.now()); return { id: 'x' } }, { limiter, sleep: c.sleep })
    expect([...r.values()].every(v => v.status === 'sent')).toBe(true)
    for (const s of startedAt) expect(startedAt.filter(x => x >= s && x < s + 1000).length).toBeLessThanOrEqual(10)
  })

  it('retries rate-limited sends, fails other errors immediately', async () => {
    const c = fakeClock()
    const limiter = createRateLimiter({ max: 10, windowMs: 1100, now: c.now, sleep: c.sleep })
    const calls = new Map<string, number>()
    const r = await sendEmailsRateLimited(
      [{ email: 'a@x.id' }, { email: 'b@x.id' }, { email: 'test@example.com' }],
      async t => {
        const n = (calls.get(t.email) ?? 0) + 1
        calls.set(t.email, n)
        if (t.email === 'test@example.com') throw new EmailSendError('Resend error: Invalid `to` field.', 'validation_error', 422)
        if (t.email === 'a@x.id' && n < 3) throw new EmailSendError('Resend error: Too many requests.', 'rate_limit_exceeded', 429)
        return { id: `id-${t.email}` }
      },
      { limiter, sleep: c.sleep },
    )
    expect(r.get('a@x.id')).toMatchObject({ status: 'sent', providerMessageId: 'id-a@x.id' })
    expect(calls.get('a@x.id')).toBe(3)
    expect(r.get('b@x.id')?.status).toBe('sent')
    expect(r.get('test@example.com')).toMatchObject({ status: 'failed', errorMessage: 'Resend error: Invalid `to` field.' })
    expect(calls.get('test@example.com')).toBe(1)
  })

  it('gives up after 3 retries on persistent rate limiting', async () => {
    const c = fakeClock()
    const limiter = createRateLimiter({ max: 10, windowMs: 1100, now: c.now, sleep: c.sleep })
    let n = 0
    const r = await sendEmailsRateLimited([{ email: 'a@x.id' }], async () => { n++; throw new EmailSendError('Resend error: Too many requests.', 'rate_limit_exceeded', 429) }, { limiter, sleep: c.sleep })
    expect(n).toBe(4)
    expect(r.get('a@x.id')?.status).toBe('failed')
  })
})
