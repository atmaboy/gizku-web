import { cn } from '@/lib/utils'

export type Column<R> = {
  key: string
  header: React.ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
  headerClassName?: string
  render: (row: R, index: number) => React.ReactNode
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

export default function DataTable<R>({ columns, rows, rowKey, striped, compact, emptyState, loading, className, rowClassName, caption, minWidth }: {
  columns: Column<R>[]; rows: R[]; rowKey: (r: R, i: number) => string; striped?: boolean; compact?: boolean
  emptyState?: React.ReactNode; loading?: boolean; className?: string; rowClassName?: (r: R, i: number) => string | undefined
  caption?: string; minWidth?: number
}) {
  const py = compact ? 'py-2' : 'py-2.5'
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse" style={minWidth ? { minWidth } : undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} scope="col" className={cn('px-3 py-2.5 text-sm font-semibold text-primary border-b-2 border-border whitespace-nowrap', ALIGN[c.align ?? 'left'], c.headerClassName)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {columns.map(c => (
                  <td key={c.key} className={cn('px-3 border-t border-border', py)}>
                    <div className="h-4 bg-muted rounded-sm animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="border-t border-border">{emptyState}</td></tr>
          ) : rows.map((r, i) => (
            <tr key={rowKey(r, i)} className={cn('hover:bg-muted/60 transition-colors', striped && i % 2 === 0 && 'bg-sunken', rowClassName?.(r, i))}>
              {columns.map(c => (
                <td key={c.key} className={cn('px-3 text-base text-primary border-t border-border align-middle', py, ALIGN[c.align ?? 'left'], c.align === 'right' && 'tabular-nums', c.className)}>
                  {c.render(r, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
