/**
 * Blast body mini-format, shared by the compose page (preview), the email
 * template (lib/emailTemplates/blast.ts), the Telegram sender (lib/blast.ts)
 * and the blast detail page. Pure — safe on server and client.
 *
 * A body is plain text lines. Two line shapes are special (inserted by the
 * "Sisipkan Gambar" button, can also be typed by hand):
 *   ![](https://…/image.png)                      → image
 *   [![](https://…/image.png)](https://tujuan…)   → image that links to a URL
 * Only http(s) URLs match, so a typed line can't become a javascript:/data:
 * URI in the sent email.
 */

const URL_PART = '(https?:\\/\\/[^\\s)]+)'
const IMAGE_LINE_RE = new RegExp(`^!\\[[^\\]]*\\]\\(${URL_PART}\\)$`)
const LINKED_IMAGE_LINE_RE = new RegExp(`^\\[!\\[[^\\]]*\\]\\(${URL_PART}\\)\\]\\(${URL_PART}\\)$`)

export type BlastBlock =
  | { type: 'image'; src: string; href: string | null }
  | { type: 'text'; text: string }

/** Parse one line; null when it's ordinary text. */
export function parseImageLine(line: string): { src: string; href: string | null } | null {
  const l = line.trim()
  const linked = l.match(LINKED_IMAGE_LINE_RE)
  if (linked) return { src: linked[1], href: linked[2] }
  const plain = l.match(IMAGE_LINE_RE)
  if (plain) return { src: plain[1], href: null }
  return null
}

export function parseBlastBody(body: string): BlastBlock[] {
  return body.split('\n').map(line => {
    const img = parseImageLine(line)
    return img ? { type: 'image' as const, ...img } : { type: 'text' as const, text: line }
  })
}

/** The line the compose page inserts for an uploaded image. */
export function buildImageLine(src: string, href?: string | null): string {
  const link = href?.trim()
  return link ? `[![](${src})](${link})` : `![](${src})`
}

/** True for an absolute http(s) URL without spaces (image link targets). */
export function isHttpUrl(v: string): boolean {
  return /^https?:\/\/[^\s)]+\.[^\s)]+$/i.test(v.trim())
}

/** Telegram allows up to 10 photos per album and 1024 caption characters. */
export const TELEGRAM_MAX_IMAGES = 10
export const TELEGRAM_CAPTION_MAX = 1024

/**
 * Split a Telegram blast body into its images (sent as photo / album) and the
 * remaining text (sent as the caption). Blank lines left behind by removed
 * image lines are collapsed.
 */
export function splitTelegramBody(body: string): { images: { src: string; href: string | null }[]; text: string } {
  const images: { src: string; href: string | null }[] = []
  const lines: string[] = []
  for (const line of body.split('\n')) {
    const img = parseImageLine(line)
    if (img) images.push(img)
    else lines.push(line)
  }
  const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { images, text }
}
