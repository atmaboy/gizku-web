import { describe, expect, it } from 'vitest'
import { isOwnStorageUrl } from './pushImage'

describe('isOwnStorageUrl', () => {
  const sb = 'https://abc123.supabase.co'
  it('accepts https urls on the project storage host only', () => {
    expect(isOwnStorageUrl('https://abc123.supabase.co/storage/v1/object/public/x.png', sb)).toBe(true)
    expect(isOwnStorageUrl('https://evil.example/x.png', sb)).toBe(false)
    expect(isOwnStorageUrl('http://abc123.supabase.co/x.png', sb)).toBe(false)
    expect(isOwnStorageUrl('not a url', sb)).toBe(false)
    expect(isOwnStorageUrl('https://abc123.supabase.co/x.png', undefined)).toBe(false)
  })
})
