import { describe, expect, it } from 'vitest'
import { decodeCursor, encodeCursor, validIds } from './inbox'

const ID = '123e4567-e89b-42d3-a456-426614174000'

describe('inbox cursor', () => {
  it('round-trips created_at + id', () => {
    const c = decodeCursor(encodeCursor(new Date('2026-11-12T04:00:00.123Z'), ID))
    expect(c).toEqual({ ts: '2026-11-12T04:00:00.123Z', id: ID })
  })
  it('rejects garbage', () => {
    expect(decodeCursor(null)).toBeNull()
    expect(decodeCursor('not-base64-!!')).toBeNull()
    expect(decodeCursor(Buffer.from('2026-11-12T04:00:00Z,not-a-uuid').toString('base64url'))).toBeNull()
    expect(decodeCursor(Buffer.from(`nope,${ID}`).toString('base64url'))).toBeNull()
  })
})

describe('validIds', () => {
  it('keeps unique uuids only', () => {
    expect(validIds([ID, ID, 'x', 5, null])).toEqual([ID])
    expect(validIds('nope')).toEqual([])
  })
})
