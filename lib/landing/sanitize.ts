/**
 * Allowlist sanitizer for FAQ answers (Landing Builder).
 *
 * Same approach and base allowlist as the Legal Document sanitizer
 * (lib/legal.ts#sanitizeHtml — p, ul/ol/li, strong/b, em/i, br), plus the one
 * thing FAQ answers need that legal documents don't: links. <a> keeps only a
 * safe `href` (https:, http:, mailto:, tel:, or a site-relative /path);
 * every other attribute, tag, script and event handler is dropped.
 */
const BLOCK_TAGS = new Set(['p', 'ul', 'ol'])
const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'br'])

function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function decodeEntities(v: string): string {
  return v
    .replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

/** Returns a safe href or null. */
export function safeHref(raw: string | null | undefined): string | null {
  if (!raw) return null
  // Strip whitespace/control chars browsers ignore inside a scheme ("java\nscript:").
  const v = decodeEntities(raw).trim().replace(/[\u0000- ]/g, '')
  if (!v) return null
  if (v.startsWith('/') && !v.startsWith('//')) return v
  if (v.startsWith('#')) return v
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v
  return null
}

function hrefFromTag(tag: string): string | null {
  const m = tag.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
  if (!m) return null
  return safeHref(m[2] ?? m[3] ?? m[4] ?? '')
}

export function sanitizeFaqHtml(html: string): string {
  if (!html) return ''
  let raw = html.replace(/<(script|style|iframe|object|embed|link|meta|svg|math|template)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  raw = raw.replace(/<(script|style|iframe|object|embed|link|meta|svg|math|template)\b[^>]*\/?>/gi, '')
  raw = raw.replace(/<!--[\s\S]*?-->/g, '')

  const tokens = raw.split(/(<\/?[a-zA-Z0-9]+[^>]*>)/g).filter(t => t !== '')
  let out = ''
  let blockDepth = 0
  let pending = ''
  let openAnchors = 0

  const emit = (s: string) => { if (blockDepth > 0) out += s; else pending += s }
  function flushPending() {
    if (pending.trim()) out += `<p>${pending}</p>`
    pending = ''
  }

  for (const token of tokens) {
    const tagMatch = token.match(/^<\/?([a-zA-Z0-9]+)/)
    if (!tagMatch) {
      // Text: neutralize any stray angle brackets.
      emit(token.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
      continue
    }
    const tag = tagMatch[1].toLowerCase()
    const isClosing = token.startsWith('</')

    if (BLOCK_TAGS.has(tag)) {
      if (isClosing) {
        while (openAnchors > 0) { out += '</a>'; openAnchors-- }
        out += `</${tag}>`
        blockDepth = Math.max(0, blockDepth - 1)
      } else {
        flushPending()
        out += `<${tag}>`
        blockDepth += 1
      }
      continue
    }
    if (tag === 'li') { out += isClosing ? '</li>' : '<li>'; continue }
    if (INLINE_TAGS.has(tag)) {
      emit(tag === 'br' ? '<br>' : (isClosing ? `</${tag}>` : `<${tag}>`))
      continue
    }
    if (tag === 'a') {
      if (isClosing) {
        if (openAnchors > 0) { emit('</a>'); openAnchors-- }
      } else {
        const href = hrefFromTag(token)
        if (href) {
          const external = /^https?:/i.test(href)
          emit(`<a href="${escapeAttr(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>`)
          openAnchors++
        }
      }
      continue
    }
    if (tag === 'div' && blockDepth === 0) flushPending()
  }
  while (openAnchors > 0) { pending += '</a>'; openAnchors-- }
  flushPending()
  return out.trim()
}
