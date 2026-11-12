import { describe, expect, it } from 'vitest'
import { checkWhitelistedUrl, normalizeDomain, NOTIFICATION_SCREENS } from './notificationLinks'

const LIST = [
  { domain: 'gizku.com', includeSubdomains: true },
  { domain: 'partner.co.id', includeSubdomains: false },
]

describe('checkWhitelistedUrl', () => {
  it('accepts the domain and its subdomains when subdomains are included', () => {
    expect(checkWhitelistedUrl('https://gizku.com/tips', LIST)).toEqual({ ok: true, host: 'gizku.com' })
    expect(checkWhitelistedUrl('https://blog.gizku.com/x', LIST).ok).toBe(true)
  })
  it('rejects subdomains when not included', () => {
    expect(checkWhitelistedUrl('https://www.partner.co.id', LIST)).toEqual({ ok: false, reason: 'not_whitelisted', host: 'www.partner.co.id' })
    expect(checkWhitelistedUrl('https://partner.co.id', LIST).ok).toBe(true)
  })
  it('rejects look-alike hosts', () => {
    expect(checkWhitelistedUrl('https://evilgizku.com', LIST).ok).toBe(false)
    expect(checkWhitelistedUrl('https://gizku.com.evil.io', LIST).ok).toBe(false)
  })
  it('rejects empty, malformed and non-https urls', () => {
    expect(checkWhitelistedUrl('  ', LIST)).toEqual({ ok: false, reason: 'empty' })
    expect(checkWhitelistedUrl('gizku.com/tips', LIST)).toEqual({ ok: false, reason: 'format' })
    expect(checkWhitelistedUrl('http://gizku.com', LIST)).toEqual({ ok: false, reason: 'https' })
    expect(checkWhitelistedUrl('javascript:alert(1)', LIST)).toEqual({ ok: false, reason: 'format' })
  })
})

describe('normalizeDomain', () => {
  it('strips scheme, www, path, port and lowercases', () => {
    expect(normalizeDomain(' HTTPS://www.Partner.co.id/path?x=1 ')).toBe('partner.co.id')
    expect(normalizeDomain('partner.co.id:8080')).toBe('partner.co.id')
  })
  it('rejects invalid domains', () => {
    for (const v of ['', 'localhost', 'a b.com', '-x.com', 'foo..com', '1.2.3.4']) expect(normalizeDomain(v)).toBeNull()
  })
})

it('screen keys are unique', () => {
  const keys = NOTIFICATION_SCREENS.map(s => s.key)
  expect(new Set(keys).size).toBe(keys.length)
})
