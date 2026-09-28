import AuthAwareLink from '@/components/landing/AuthAwareLink'
import { resolveTarget } from '@/lib/landing/links'
import type { Link, Settings } from '@/lib/landing/schema'

/**
 * Renders a builder `Link`. Static targets are a plain <a> (server-rendered);
 * "Otomatis" targets become the AuthAwareLink client island.
 */
export default function CmsLink({ link, settings, className, children, ariaLabel }: {
  link: Link
  settings: Pick<Settings, 'ctaUrlGuest' | 'ctaUrlAuth'>
  className?: string
  children?: React.ReactNode
  ariaLabel?: string
}) {
  const r = resolveTarget(link.target, settings)
  const content = children ?? link.label
  if (r.kind === 'auto') {
    return <AuthAwareLink guestHref={r.guestHref} authHref={r.authHref} className={className} ariaLabel={ariaLabel}>{content}</AuthAwareLink>
  }
  return (
    <a
      href={r.href}
      className={className}
      aria-label={ariaLabel}
      {...(r.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {content}
    </a>
  )
}
