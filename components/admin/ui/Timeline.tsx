import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Timeline({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div aria-hidden className="absolute top-0 bottom-0 left-[29px] max-lg:left-[14px] w-[3px] bg-sand-200 rounded-pill" />
      <ol className="relative flex flex-col gap-4 list-none m-0 p-0">{children}</ol>
    </div>
  )
}

export function TimelineLabel({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative">
      <span className="inline-flex items-center px-2.5 py-1 rounded-sm bg-brand text-white text-sm font-semibold relative z-[1]">{children}</span>
    </li>
  )
}

export function TimelineItem({ icon: Icon, iconClassName, children, className }: { icon: LucideIcon; iconClassName?: string; children: React.ReactNode; className?: string }) {
  return (
    <li className={cn('relative pl-[64px] max-lg:pl-[40px]', className)}>
      <span aria-hidden className={cn(
        'absolute left-[14px] max-lg:left-0 top-2 w-8 h-8 max-lg:w-[30px] max-lg:h-[30px] rounded-full bg-surface border-2 border-border text-brand flex items-center justify-center z-[1]',
        iconClassName,
      )}>
        <Icon size={15} />
      </span>
      <div className="bg-surface rounded-md shadow-card overflow-hidden min-w-0">{children}</div>
    </li>
  )
}

export function TimelineEnd({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <li className="relative h-8" aria-hidden>
      <span className="absolute left-[14px] max-lg:left-0 top-0 w-8 h-8 max-lg:w-[30px] max-lg:h-[30px] rounded-full bg-muted border-2 border-border text-secondary flex items-center justify-center z-[1]">
        <Icon size={15} />
      </span>
    </li>
  )
}
