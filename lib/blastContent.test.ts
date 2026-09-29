import { describe, expect, it } from 'vitest'
import { buildImageLine, isHttpUrl, parseBlastBody, parseImageLine, splitTelegramBody } from './blastContent'
import { buildBlastEmailHtml } from './emailTemplates/blast'
import { BLAST_SENDERS } from './email'

const IMG = 'https://x.supabase.co/storage/v1/object/public/hero-images/blast/a.png'

describe('blast body format', () => {
  it('parses plain and linked image lines', () => {
    expect(parseImageLine(`![](${IMG})`)).toEqual({ src: IMG, href: null })
    expect(parseImageLine(`[![](${IMG})](https://play.google.com/store/apps/details?id=com.gizku)`))
      .toEqual({ src: IMG, href: 'https://play.google.com/store/apps/details?id=com.gizku' })
    expect(parseImageLine('biasa saja')).toBeNull()
    expect(parseImageLine('![](javascript:alert(1))')).toBeNull()
    expect(parseImageLine(`[![](${IMG})](javascript:alert(1))`)).toBeNull()
  })

  it('builds lines that round-trip', () => {
    expect(parseImageLine(buildImageLine(IMG))).toEqual({ src: IMG, href: null })
    expect(parseImageLine(buildImageLine(IMG, ' https://gizku.com/promo '))).toEqual({ src: IMG, href: 'https://gizku.com/promo' })
    expect(buildImageLine(IMG, '')).toBe(`![](${IMG})`)
  })

  it('validates link urls', () => {
    expect(isHttpUrl('https://gizku.com')).toBe(true)
    expect(isHttpUrl('gizku.com')).toBe(false)
    expect(isHttpUrl('https://a b.com')).toBe(false)
  })

  it('splits blocks', () => {
    expect(parseBlastBody(`Halo\n![](${IMG})\n`).map(b => b.type)).toEqual(['text', 'image', 'text'])
  })
})

describe('email template', () => {
  it('wraps linked images in <a> and keeps plain images unlinked', () => {
    const html = buildBlastEmailHtml({
      subject: 'S',
      sender: 'marketing',
      bodyText: `[![](${IMG})](https://gizku.com/promo?a=1&b=2)\n![](${IMG})\nTeks <b>x</b>`,
    })
    expect(html).toContain(`<a href="https://gizku.com/promo?a=1&amp;b=2" target="_blank" rel="noopener"`)
    expect(html.match(/<img src="https:\/\/x\.supabase/g)).toHaveLength(2)
    expect(html).toContain('Teks &lt;b&gt;x&lt;/b&gt;')
  })

  it('marketing sender is Halo Gizku <halo@gizku.com>', () => {
    expect(BLAST_SENDERS.marketing).toBe('Halo Gizku <halo@gizku.com>')
    const html = buildBlastEmailHtml({ subject: 'S', sender: 'marketing', bodyText: 'x' })
    expect(html).toContain('Halo Gizku')
    expect(html).toContain('halo@gizku.com')
    expect(html).not.toMatch(/Gizku Marketing|marketing@gizku\.com/)
  })
})

describe('telegram split', () => {
  it('pulls images out and keeps the rest as caption', () => {
    expect(splitTelegramBody(`Promo!\n\n![](${IMG})\n\nUnduh sekarang`)).toEqual({
      images: [{ src: IMG, href: null }],
      text: 'Promo!\n\nUnduh sekarang',
    })
  })
  it('text-only body is unchanged', () => {
    expect(splitTelegramBody('Halo semua')).toEqual({ images: [], text: 'Halo semua' })
  })
})
