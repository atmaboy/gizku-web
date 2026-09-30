/**
 * Sliding-window rate limiter: at most `max` acquisitions in any `windowMs`
 * window. Callers `await limiter.acquire()` right before each request; calls
 * are served in order (FIFO) and wait only as long as needed.
 *
 * Used to keep email blasts under Resend's API limit (10 requests / second
 * per team — see lib/blast.ts). Clock and sleep are injectable for tests.
 */
export type RateLimiter = { acquire: () => Promise<void> }

export function createRateLimiter(opts: {
  max: number
  windowMs: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}): RateLimiter {
  const { max, windowMs } = opts
  const now = opts.now ?? Date.now
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  const stamps: number[] = []
  let queue: Promise<void> = Promise.resolve()

  async function take() {
    for (;;) {
      const t = now()
      while (stamps.length && stamps[0] <= t - windowMs) stamps.shift()
      if (stamps.length < max) { stamps.push(t); return }
      await sleep(stamps[0] + windowMs - t + 1)
    }
  }

  return {
    acquire() {
      // Chain so concurrent callers don't race for the same free slot.
      const next = queue.then(take)
      queue = next.catch(() => undefined)
      return next
    },
  }
}
