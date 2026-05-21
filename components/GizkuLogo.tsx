/**
 * GizkuLogo — komponen logo resmi Gizku
 *
 * Lingkaran hijau solid dengan ikon wajah senyum (dua mata + mulut lengkung),
 * sesuai brand kit Gizku.
 *
 * Props:
 *   size  — ukuran width & height dalam px (default: 48)
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
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gizku"
      role="img"
      className={className}
    >
      {/* Lingkaran hijau solid */}
      <circle cx="24" cy="24" r="24" fill="#2DBD74" />

      {/* Mata kiri */}
      <circle cx="18" cy="20" r="2.2" fill="white" />

      {/* Mata kanan */}
      <circle cx="30" cy="20" r="2.2" fill="white" />

      {/* Mulut senyum */}
      <path
        d="M16 28 Q24 35 32 28"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
