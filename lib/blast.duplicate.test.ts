import { describe, expect, it } from 'vitest'
import { splitDuplicateAudience } from './blast'

const row = (o: Partial<{ userId: string; telegramUserId: bigint; email: string; status: string }>) => ({
  userId: null, telegramUserId: null, email: null, status: 'sent', ...o,
})

describe('splitDuplicateAudience', () => {
  it('email: splits sent vs failed, dedupes case-insensitively', () => {
    const keys = splitDuplicateAudience('email', [
      row({ email: 'A@x.com', status: 'sent' }),
      row({ email: 'a@x.com', status: 'failed' }),
      row({ email: 'b@x.com', status: 'failed' }),
      row({ email: 'test@example.com', status: 'failed' }),
      row({ email: 'c@x.com', status: 'read' }),
    ])
    expect(keys.all).toEqual(['a@x.com', 'b@x.com', 'test@example.com', 'c@x.com'])
    expect(keys.exclude_failed).toEqual(['a@x.com', 'c@x.com'])
    expect(keys.only_failed).toEqual(['b@x.com', 'test@example.com'])
  })

  it('telegram: keyed by chat id', () => {
    const keys = splitDuplicateAudience('telegram', [
      row({ telegramUserId: BigInt(111), status: 'sent' }),
      row({ telegramUserId: BigInt(222), status: 'failed' }),
    ])
    expect(keys).toEqual({ all: ['111', '222'], exclude_failed: ['111'], only_failed: ['222'] })
  })

  it('push: user counts as delivered when any device succeeded; rows without key ignored', () => {
    const keys = splitDuplicateAudience('push', [
      row({ userId: 'u1', status: 'failed' }),
      row({ userId: 'u1', status: 'sent' }),
      row({ userId: 'u2', status: 'failed' }),
      row({ status: 'failed' }),
    ])
    expect(keys).toEqual({ all: ['u1', 'u2'], exclude_failed: ['u1'], only_failed: ['u2'] })
  })
})
