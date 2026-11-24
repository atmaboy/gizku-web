/** CSV waitlist Premium (username, email, waktu remind, source). Sel yang diawali = + - @ dinetralkan dari formula injection. */
export function csvCell(v: string | null | undefined): string {
  let s = v ?? ''
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function waitlistCsv(rows: { username: string; email: string | null; at: string; source: string | null }[]): string {
  const head = ['username', 'email', 'waktu_remind', 'source']
  const lines = rows.map(r => [r.username, r.email, r.at, r.source].map(csvCell).join(','))
  return [head.join(','), ...lines].join('\n') + '\n'
}
