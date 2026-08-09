// Shared between lib/emailInbound.ts (parses this back out of inbound
// subjects) and app/api/admin/route.ts's reply_report action (embeds it in
// outbound subjects). A short, deterministic tag in the email subject is a
// far more reliable way to match a reply back to its report than depending
// on mail providers to round-trip In-Reply-To/References headers intact.
export function ticketTag(ticketNumber: number): string {
  return `[GZK-${ticketNumber}]`
}

export function extractTicketNumber(subject: string | null | undefined): number | null {
  if (!subject) return null
  const match = subject.match(/\[GZK-(\d+)\]/i)
  return match ? parseInt(match[1], 10) : null
}

export function buildReplySubject(originalSubject: string | null, ticketNumber: number): string {
  const base = (originalSubject ?? '').trim() || 'Laporan Anda ke Gizku'
  const withoutTag = base.replace(/\s*\[GZK-\d+\]\s*$/i, '').trim()
  const withRe = /^re:/i.test(withoutTag) ? withoutTag : `Re: ${withoutTag}`
  return `${withRe} ${ticketTag(ticketNumber)}`
}
