/**
 * GizkuLogo — komponen logo resmi Gizku
 *
 * Lingkaran hijau solid dengan ikon mangkuk dan sendok,
 * sama persis dengan logo di halaman login user.
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
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gizku"
      role="img"
      className={className}
    >
      {/* Lingkaran hijau solid */}
      <circle cx="16" cy="16" r="16" fill="#2ECC71" />

      {/* Mangkuk — setengah lingkaran bawah */}
      <path
        d="M8 16 Q8 23 16 23 Q24 23 24 16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Garis atas mangkuk */}
      <line
        x1="8" y1="16"
        x2="24" y2="16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Sendok / garpu */}
      <polyline
        points="12,11 15,14.5 20.5,9"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
