import { describe, expect, it } from 'vitest'
import { emailDomainOf, isPlaceholderEmail } from './emailDomain'
import { isDisposableEmail, isFakeEmail } from './emailDomain.server'

describe('emailDomainOf', () => {
  it('extracts the lower-cased domain', () => {
    expect(emailDomainOf('Budi@Gmail.COM')).toBe('gmail.com')
    expect(emailDomainOf('a@b@example.com')).toBe('example.com')
    expect(emailDomainOf('no-at-sign')).toBeNull()
  })
})

describe('isPlaceholderEmail', () => {
  it('blocks the listed placeholder domains and their subdomains', () => {
    for (const d of ['example.com', 'test.com', 'testing.com', 'email.com', 'example.org', 'mail.test.com']) {
      expect(isPlaceholderEmail(`user@${d}`)).toBe(true)
    }
    expect(isPlaceholderEmail('USER@EXAMPLE.COM')).toBe(true)
  })

  it('blocks reserved TLDs', () => {
    expect(isPlaceholderEmail('a@foo.test')).toBe(true)
    expect(isPlaceholderEmail('a@localhost')).toBe(true)
    expect(isPlaceholderEmail('a@x.invalid')).toBe(true)
  })

  it('does not block look-alikes of real providers', () => {
    expect(isPlaceholderEmail('a@gmail.com')).toBe(false)
    expect(isPlaceholderEmail('a@myemail.com')).toBe(false)
    expect(isPlaceholderEmail('a@latest.com')).toBe(false)
  })
})

describe('isFakeEmail (server)', () => {
  it('blocks throwaway providers, including wildcard subdomains', () => {
    expect(isDisposableEmail('a@mailinator.com')).toBe(true)
    expect(isDisposableEmail('a@yopmail.com')).toBe(true)
    expect(isDisposableEmail('a@10minutemail.com')).toBe(true)
    expect(isDisposableEmail('a@anything.33mail.com')).toBe(true)
  })

  it('allows common real providers', () => {
    const real = [
      'gmail.com', 'yahoo.com', 'yahoo.co.id', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me',
      'telkom.net', 'ui.ac.id', 'duck.com', 'privaterelay.appleid.com', 'gizku.com',
    ]
    for (const d of real) expect(isFakeEmail(`user@${d}`), d).toBe(false)
  })

  it('combines placeholder and disposable checks', () => {
    expect(isFakeEmail('a@example.com')).toBe(true)
    expect(isFakeEmail('a@mailinator.com')).toBe(true)
  })
})
