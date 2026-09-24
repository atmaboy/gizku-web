import { Skeleton } from '@/components/admin/ui'

type Variant = 'dashboard' | 'table' | 'detail' | 'cards' | 'search' | 'timeline'

function Header() {
  return (
    <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 max-lg:flex-col-reverse max-lg:items-start max-lg:gap-2 max-lg:px-4 max-lg:pt-3.5">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-40" />
    </div>
  )
}

function CardSkel({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`bg-surface rounded-md shadow-card overflow-hidden ${className}`}>
      <div className="min-h-[52px] px-4 py-3 border-b border-border flex items-center"><Skeleton className="h-5 w-40" /></div>
      <div className="p-4 flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-4" />)}
      </div>
    </div>
  )
}

/** Shared loading state for admin routes (rendered inside AdminShell). */
export default function PageSkeleton({ variant = 'table' }: { variant?: Variant }) {
  return (
    <div role="status" aria-label="Memuat halaman" aria-busy="true">
      <Header />
      <div className="px-6 pt-2 pb-6 flex flex-col gap-5 max-lg:px-4 max-lg:gap-4">
        {variant === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 max-lg:gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] max-lg:h-[96px] rounded-md" />)}
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 max-lg:gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[90px] rounded-md" />)}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <CardSkel rows={6} className="xl:col-span-8" />
              <CardSkel rows={4} className="xl:col-span-4" />
            </div>
          </>
        )}
        {variant === 'table' && (
          <>
            <Skeleton className="h-12 rounded-md" />
            <CardSkel rows={8} />
          </>
        )}
        {variant === 'detail' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <CardSkel rows={6} className="xl:col-span-4" />
            <CardSkel rows={9} className="xl:col-span-8" />
          </div>
        )}
        {variant === 'cards' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 max-lg:gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkel key={i} rows={3} />)}
          </div>
        )}
        {variant === 'search' && <CardSkel rows={2} />}
        {variant === 'timeline' && (
          <>
            <CardSkel rows={2} />
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[160px] rounded-md lg:ml-16 ml-10" />)}
          </>
        )}
      </div>
    </div>
  )
}
