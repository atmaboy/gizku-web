'use client'
import Link from 'next/link'
import { forwardRef } from 'react'

type Props = React.ComponentProps<typeof Link>

/**
 * next/link that fires the `nav:start` event consumed by NavProgress.
 * Prefetch is off by default: admin routes are dynamic and each prefetch
 * would cost a serverless invocation (+ DB work) per visible link.
 * Lets server components render progress-aware links without passing
 * event handlers across the server/client boundary.
 */
const TrackedLink = forwardRef<HTMLAnchorElement, Props>(function TrackedLink({ onClick, prefetch = false, ...p }, ref) {
  return (
    <Link
      ref={ref}
      prefetch={prefetch}
      {...p}
      onClick={e => {
        onClick?.(e)
        if (!e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && p.target !== '_blank') {
          document.dispatchEvent(new Event('nav:start'))
        }
      }}
    />
  )
})

export default TrackedLink
