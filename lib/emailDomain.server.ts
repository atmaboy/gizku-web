/**
 * Server-side fake-email check: placeholder domains (lib/emailDomain.ts) plus
 * the community-maintained throwaway-provider list from the
 * `disposable-email-domains` package (~120k domains + ~400 wildcard domains
 * whose every subdomain is disposable). Update with
 * `npm update disposable-email-domains`.
 *
 * Import only from API routes — the list is 2.4 MB.
 */
import disposableDomains from 'disposable-email-domains/index.json'
import wildcardDomains from 'disposable-email-domains/wildcard.json'
import { domainSuffixes, emailDomainOf, isPlaceholderEmail } from './emailDomain'

let lists: { exact: Set<string>; wildcard: Set<string> } | null = null

// Built on first use so routes that never check an email don't pay for it.
function getLists() {
  lists ??= { exact: new Set(disposableDomains), wildcard: new Set(wildcardDomains) }
  return lists
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomainOf(email)
  if (!domain) return false
  const { exact, wildcard } = getLists()
  return exact.has(domain) || domainSuffixes(domain).some(s => wildcard.has(s))
}

/** True when the address must not be used to register or as a new account email. */
export function isFakeEmail(email: string): boolean {
  return isPlaceholderEmail(email) || isDisposableEmail(email)
}
