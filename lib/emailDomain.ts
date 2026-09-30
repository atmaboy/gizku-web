/**
 * Fake / placeholder email domains refused at signup and change-email.
 *
 * Client-safe: only a short hand-kept list, used by the login and
 * change-email pages for instant feedback. The server additionally checks
 * ~120k throwaway providers (mailinator, yopmail, …) in
 * lib/emailDomain.server.ts — that list is 2.4 MB, so it never ships to the
 * browser.
 */

/** Placeholder domains people type to skip the email step. Subdomains are blocked too. */
export const BLOCKED_EMAIL_DOMAINS = [
  'example.com', 'example.net', 'example.org',
  'test.com', 'testing.com', 'email.com',
]

/** Reserved TLDs (RFC 2606 / 6761) — never deliverable. */
const RESERVED_TLDS = new Set(['test', 'example', 'invalid', 'localhost', 'local'])

const BLOCKED = new Set(BLOCKED_EMAIL_DOMAINS)

/** Error code the API returns for a refused domain; pages map it to a translated message. */
export const EMAIL_NOT_ALLOWED_CODE = 'email_not_allowed'
export const EMAIL_NOT_ALLOWED_MESSAGE = 'Gunakan alamat email asli yang aktif. Email sementara atau contoh (mis. @example.com) tidak bisa dipakai.'

/** Lower-cased domain part of an address, or null when there is none. */
export function emailDomainOf(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 0) return null
  const domain = email.slice(at + 1).trim().toLowerCase().replace(/\.$/, '')
  return domain || null
}

/** The domain and each parent: a.b.example.com → a.b.example.com, b.example.com, example.com, com. */
export function domainSuffixes(domain: string): string[] {
  const parts = domain.split('.')
  return parts.map((_, i) => parts.slice(i).join('.'))
}

/** True for placeholder addresses like x@example.com, x@mail.test.com or x@foo.test. */
export function isPlaceholderEmail(email: string): boolean {
  const domain = emailDomainOf(email)
  if (!domain) return false
  const suffixes = domainSuffixes(domain)
  if (RESERVED_TLDS.has(suffixes[suffixes.length - 1])) return true
  return suffixes.some(s => BLOCKED.has(s))
}
