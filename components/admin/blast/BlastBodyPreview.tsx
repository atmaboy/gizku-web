'use client'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { parseBlastBody, splitTelegramBody } from '@/lib/blastContent'
import { cn } from '@/lib/utils'

/** Image with a shimmer until it has loaded. */
function PreviewImage({ src, className }: { src: string; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <span className={cn('relative block overflow-hidden', className)}>
      {!loaded && <span aria-hidden className="absolute inset-0 gizku-skeleton rounded-none" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} className={cn('block max-w-full h-auto', !loaded && 'min-h-24')} />
    </span>
  )
}

/**
 * Email body as the recipient sees it: image lines render as images (linked
 * images show their click-through URL), everything else as paragraphs —
 * mirrors lib/emailTemplates/blast.ts.
 */
export function EmailBodyPreview({ text, placeholder = 'Isi email akan tampil di sini seperti yang dilihat penerima.' }: { text: string; placeholder?: string }) {
  if (!text) return <>{placeholder}</>
  return (
    <>
      {parseBlastBody(text).map((b, i) => {
        if (b.type === 'text') return <p key={i} className="whitespace-pre-wrap m-0 break-words">{b.text || '\u00a0'}</p>
        const img = <PreviewImage src={b.src} className="rounded-sm" />
        return b.href ? (
          <a key={i} href={b.href} target="_blank" rel="noopener noreferrer" title={`Buka ${b.href}`} className="group block my-2 no-underline">
            {img}
            <span className="mt-1 flex items-center gap-1 text-xs text-link truncate group-hover:underline">
              <ExternalLink size={12} aria-hidden className="shrink-0" />{b.href}
            </span>
          </a>
        ) : <span key={i} className="block my-2">{img}</span>
      })}
    </>
  )
}

/** Telegram bubble content: photo(s) on top, the rest as caption. */
export function TelegramBodyPreview({ text, dark = true, placeholder = 'Isi pesan chat Telegram akan tampil di sini seperti yang dilihat user.' }: { text: string; dark?: boolean; placeholder?: string }) {
  const { images, text: caption } = splitTelegramBody(text)
  return (
    <>
      {images.length > 0 && (
        <span className={cn('grid gap-0.5 -mx-3 -mt-2.5 mb-2 overflow-hidden rounded-t-lg', images.length > 1 && 'grid-cols-2')}>
          {images.map((im, i) => <PreviewImage key={i} src={im.src} />)}
        </span>
      )}
      <span className={cn('block whitespace-pre-wrap break-words', dark ? 'text-white' : 'text-bark-700')}>
        {caption || (images.length ? '' : placeholder)}
      </span>
    </>
  )
}
