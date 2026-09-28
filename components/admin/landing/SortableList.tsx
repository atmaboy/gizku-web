'use client'
/**
 * Vertical drag-to-reorder list (@dnd-kit). Mouse, touch (via the handle) and
 * keyboard (focus the handle, Space to pick up, ↑/↓ to move, Space to drop).
 */
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export type HandleProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export function DragHandle({ label, className, ...props }: HandleProps & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title="Seret untuk mengubah urutan"
      className={cn(
        'inline-flex items-center justify-center w-7 h-9 max-lg:w-9 max-lg:h-11 rounded-sm text-tertiary hover:text-secondary hover:bg-muted cursor-grab active:cursor-grabbing touch-none shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
        className,
      )}
      {...props}
    >
      <GripVertical size={16} aria-hidden />
    </button>
  )
}

function Row<T>({ id, item, index, render }: { id: string; item: T; index: number; render: (item: T, handle: HandleProps, index: number, dragging: boolean) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  }
  const handle = { ...attributes, ...listeners, ref: setActivatorNodeRef } as HandleProps
  return (
    <li ref={setNodeRef} style={style} className={cn('list-none', isDragging && 'opacity-90 shadow-md rounded-md')}>
      {render(item, handle, index, isDragging)}
    </li>
  )
}

export default function SortableList<T>({ items, getId, onReorder, renderItem, className, disabled }: {
  items: T[]
  getId: (item: T) => string
  onReorder: (next: T[]) => void
  renderItem: (item: T, handle: HandleProps, index: number, dragging: boolean) => React.ReactNode
  className?: string
  disabled?: boolean
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map(getId)
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(items, from, to))
  }
  if (disabled) {
    return <ul className={cn('m-0 p-0', className)}>{items.map((it, i) => <li key={getId(it)} className="list-none">{renderItem(it, {}, i, false)}</li>)}</ul>
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: 'Tekan spasi untuk mengangkat, panah atas/bawah untuk memindahkan, spasi lagi untuk meletakkan, Esc untuk batal.' },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={cn('m-0 p-0', className)}>
          {items.map((it, i) => <Row key={ids[i]} id={ids[i]} item={it} index={i} render={renderItem} />)}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
