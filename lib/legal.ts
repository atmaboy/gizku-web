/**
 * Shared helpers for the Legal Document Configuration feature
 * (app/api/admin/legal, app/api/legal-content).
 */

export function slugify(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dokumen'
}

// Allowlist sanitizer for the RTE output (bold, italic, h3, bullet/numbered
// lists — see the editor toolbar). Strips everything else (script tags,
// event handlers, arbitrary attributes, iframes, etc.) so stored bodyHtml is
// safe to render with dangerouslySetInnerHTML on the web and to parse on
// mobile.
const ALLOWED_TAGS = new Set(['p', 'h3', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'br'])

export function sanitizeHtml(html: string): string {
  if (!html) return ''

  // Drop dangerous elements (and their content) outright.
  let out = html.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  out = out.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, '')

  // Strip HTML comments.
  out = out.replace(/<!--[\s\S]*?-->/g, '')

  // Rewrite every remaining tag: keep it (without attributes) if allowed,
  // otherwise drop the tag but keep its inner text.
  out = out.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, rawTag: string) => {
    const tag = rawTag.toLowerCase()
    const isClosing = match.startsWith('</')
    if (!ALLOWED_TAGS.has(tag)) return ''
    if (tag === 'br') return '<br>'
    return isClosing ? `</${tag}>` : `<${tag}>`
  })

  return out.trim()
}
