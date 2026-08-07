/**
 * GizkuLogo — komponen logo resmi Gizku
 *
 * Rounded square hijau dengan progress ring dan pie breakdown
 * protein/karbo/lemak, sama persis dengan mark resmi Gizku.
 *
 * Props:
 *   size      — ukuran width & height dalam px (default: 48)
 *   className — tambahan class Tailwind / CSS (opsional)
 */
export default function GizkuLogo({
  size = 48,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gizku"
      role="img"
      className={className}
    >
      {/* Rounded square — brand green Gizku Design System (--green-600) */}
      <rect x="20" y="20" width="160" height="160" rx="36" fill="#3d7833" />

      {/* Progress ring */}
      <path
        d="M136.8,130.9 A48,48 0 1,1 147.3,91.6"
        stroke="white"
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
      />
      <line
        x1="132.8" y1="108.8"
        x2="146.4" y2="112.42"
        stroke="white"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* Pie breakdown — protein / karbo / lemak */}
      <path d="M100,100 L100,76 A24,24 0 0,1 120.78,112 Z" fill="#c1603f" />
      <path d="M100,100 L120.78,112 A24,24 0 0,1 79.22,112 Z" fill="#d99b3f" />
      <path d="M100,100 L79.22,112 A24,24 0 0,1 100,76 Z" fill="#6f9b7c" />
    </svg>
  )
}
