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
// mobile (SimpleHtmlRenderer there only recognizes content wrapped in a
// block tag — see the BLOCK_TAGS comment below for why that matters).
const BLOCK_TAGS = new Set(['p', 'h3', 'ul', 'ol'])
const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'br'])

export function sanitizeHtml(html: string): string {
  if (!html) return ''

  // Drop dangerous elements (and their content) outright.
  let raw = html.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  raw = raw.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, '')

  // Strip HTML comments.
  raw = raw.replace(/<!--[\s\S]*?-->/g, '')

  // Tokenize into tags vs. text so we can track whether we're inside a
  // block-level element (p/h3/ul/ol) — a naive per-tag regex replace (the
  // previous implementation) drops any tag it doesn't recognize but keeps
  // the inner text, so e.g. `<div>Hello</div>` (Chrome's default wrapper
  // for a typed line) becomes bare "Hello" with *no* block tag at all. That
  // renders fine with dangerouslySetInnerHTML on web, but mobile's
  // SimpleHtmlRenderer only recognizes content wrapped in p/h3/ul/ol and
  // silently renders nothing for anything else — hence "empty" documents
  // that were actually saved with real (but unwrapped) text.
  const tokens = raw.split(/(<\/?[a-zA-Z0-9]+[^>]*>)/g).filter(t => t !== '')

  let out = ''
  let blockDepth = 0
  let pending = ''

  function flushPending() {
    if (pending.trim()) out += `<p>${pending}</p>`
    pending = ''
  }

  for (const token of tokens) {
    const tagMatch = token.match(/^<\/?([a-zA-Z0-9]+)/)
    if (!tagMatch) {
      if (blockDepth > 0) out += token
      else pending += token
      continue
    }

    const tag = tagMatch[1].toLowerCase()
    const isClosing = token.startsWith('</')

    if (BLOCK_TAGS.has(tag)) {
      if (isClosing) {
        out += `</${tag}>`
        blockDepth = Math.max(0, blockDepth - 1)
      } else {
        flushPending()
        out += `<${tag}>`
        blockDepth += 1
      }
      continue
    }

    if (tag === 'li') {
      out += isClosing ? '</li>' : '<li>'
      continue
    }

    if (INLINE_TAGS.has(tag)) {
      const rendered = tag === 'br' ? '<br>' : (isClosing ? `</${tag}>` : `<${tag}>`)
      if (blockDepth > 0) out += rendered
      else pending += rendered
      continue
    }

    // Unrecognized tag (div, span, ...) — drop the tag itself. Treat div
    // boundaries as implicit paragraph breaks, since that's the most common
    // shape contentEditable produces for separate typed lines.
    if (tag === 'div' && blockDepth === 0) flushPending()
  }

  flushPending()
  return out.trim()
}
