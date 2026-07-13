'use client'

export default function Chip({
  label,
  selected = false,
  onClick,
}: {
  label: string
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[34px] px-3.5 rounded-pill text-sm cursor-pointer transition-colors ${
        selected ? 'bg-brand-tint text-link font-semibold shadow-[inset_0_0_0_1px_var(--color-border-brand)]' : 'bg-sunken text-secondary font-medium shadow-hairline'
      }`}
    >
      {label}
    </button>
  )
}
