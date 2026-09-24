import { cn } from '@/lib/utils'
import TrackedLink from '@/components/admin/ui/TrackedLink'

export type Crumb = { label: string; href?: string }

/**
 * Content header (H1 + breadcrumb) + content area. Every /admin page wraps
 * its body in this. "Beranda" is prepended to the breadcrumb automatically.
 */
export default function AdminPage({ title, breadcrumb = [], actions, children, className }: {
  title: string; breadcrumb?: Crumb[]; actions?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  const crumbs: Crumb[] = [{ label: 'Beranda', href: '/admin' }, ...breadcrumb]
  const last = crumbs.length - 1
  const bc = (
    <nav aria-label="breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-base max-lg:text-sm list-none m-0 p-0">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span aria-hidden className="text-tertiary">/</span>}
            {i === last || !c.href
              ? <span className={cn('truncate', i === last ? 'text-secondary' : 'text-secondary')} aria-current={i === last ? 'page' : undefined}>{c.label}</span>
              : <TrackedLink href={c.href} className="text-link hover:text-green-800 hover:underline">{c.label}</TrackedLink>}
          </li>
        ))}
      </ol>
    </nav>
  )
  return (
    <>
      <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 max-lg:flex-col-reverse max-lg:items-start max-lg:gap-1 max-lg:px-4 max-lg:pt-3.5 max-lg:pb-1.5">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl max-lg:text-[22px] max-lg:leading-tight font-semibold tracking-[-0.01em] text-primary">{title}</h1>
          {actions}
        </div>
        {bc}
      </div>
      <div className={cn('px-6 pt-2 pb-6 flex flex-col gap-5 max-lg:px-4 max-lg:pt-2 max-lg:pb-5 max-lg:gap-4 min-w-0', className)}>
        {children}
      </div>
    </>
  )
}
