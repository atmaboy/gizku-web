'use client'
import Link from 'next/link'
import { forwardRef } from 'react'

type Props = React.ComponentProps<typeof Link>

/**
 * next/link that fires the `nav:start` event consumed by NavProgress.
 * Lets server components render progress-aware links without passing
 * event handlers across the server/client boundary.
 */
const TrackedLink = forwardRef<HTMLAnchorElement, Props>(function TrackedLink({ onClick, ...p }, ref) {
  return (
    <Link
      ref={ref}
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
