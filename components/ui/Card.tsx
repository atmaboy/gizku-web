export default function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-surface rounded-lg shadow-hairline ${className}`}>
      {children}
    </div>
  )
}
