// Pure constant, safe to import from both server code (lib/limit.ts) and
// client components (admin review form) — no server-only dependencies here.
export const REJECT_REASONS = [
  'Bukti transfer tidak jelas / buram',
  'Nominal transfer tidak sesuai paket',
  'Bukti transfer sudah pernah digunakan',
  'Rekening tujuan tidak sesuai',
  'Lainnya',
] as const

export type RejectReason = typeof REJECT_REASONS[number]
