'use client'

import { useEffect, useRef } from 'react'
import { Bold, Heading3, Italic, Link2, List, ListOrdered, type LucideIcon } from 'lucide-react'

/**
 * Minimal rich-text editor for legal document bodies. Uses `contentEditable`
 * + `document.execCommand` — deprecated but dependency-free, matches the
 * constrained toolbar (bold, italic, H3, bullet/numbered list) the backend
 * sanitizer (`lib/legal.ts#sanitizeHtml`) allows through.
 *
 * Uncontrolled by design: `value` only seeds the DOM once per `resetKey`
 * change (e.g. switching document/language), so typing doesn't fight React
 * re-renders or reset the caret position.
 *
 * `compact` (Landing Builder FAQ answers): bold, italic, link, bullet list —
 * matching lib/landing/sanitize.ts#sanitizeFaqHtml — smaller height, and an
 * optional `aside` (e.g. a character counter) in the toolbar.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  resetKey,
  ariaLabel,
  compact,
  aside,
}: {
  value: string
  onChange: (html: string) => void
  placeholder: string
  resetKey: string
  ariaLabel?: string
  compact?: boolean
  aside?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastResetKey = useRef<string | null>(null)

  useEffect(() => {
    if (ref.current && lastResetKey.current !== resetKey) {
      ref.current.innerHTML = value || ''
      lastResetKey.current = resetKey
    }
  }, [resetKey, value])

  // Without this, Chrome/Safari wrap each line typed on Enter in a bare
  // <div> instead of <p> — the server sanitizer normalizes that away, but
  // asking for <p> up front means what the admin sees while typing already
  // matches the block structure the app actually renders.
  function handleFocus() {
    document.execCommand('defaultParagraphSeparator', false, 'p')
  }

  function exec(cmd: string, arg?: string) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      ref.current?.focus()
      document.execCommand(cmd, false, arg)
      onChange(ref.current?.innerHTML ?? '')
    }
  }

  function insertLink(e: React.MouseEvent) {
    e.preventDefault()
    // prompt() steals focus and the selection — remember it and put it back.
    const sel = window.getSelection()
    const range = sel && sel.rangeCount && ref.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null
    const url = window.prompt('Alamat tautan (https://…, mailto:… atau /halaman)')?.trim()
    if (!url) return
    ref.current?.focus()
    if (range && sel) { sel.removeAllRanges(); sel.addRange(range) }
    if (!range || range.collapsed) {
      const a = document.createElement('a')
      a.href = url
      a.textContent = url.replace(/^mailto:/, '')
      document.execCommand('insertHTML', false, a.outerHTML)
    } else {
      document.execCommand('createLink', false, url)
    }
    onChange(ref.current?.innerHTML ?? '')
  }

  const tools: { icon: LucideIcon; label: string; cmd: string; arg?: string }[] = compact
    ? [
        { icon: Bold, label: 'Tebal', cmd: 'bold' },
        { icon: Italic, label: 'Miring', cmd: 'italic' },
        { icon: Link2, label: 'Tautan', cmd: 'link' },
        { icon: List, label: 'Daftar berpoin', cmd: 'insertUnorderedList' },
      ]
    : [
        { icon: Bold, label: 'Tebal', cmd: 'bold' },
        { icon: Italic, label: 'Miring', cmd: 'italic' },
        { icon: Heading3, label: 'Judul (H3)', cmd: 'formatBlock', arg: '<h3>' },
        { icon: List, label: 'Daftar berpoin', cmd: 'insertUnorderedList' },
        { icon: ListOrdered, label: 'Daftar bernomor', cmd: 'insertOrderedList' },
      ]

  return (
    <div className="rounded-sm border border-border-strong focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
      <div role="toolbar" aria-label="Format teks" className="flex gap-1 p-1.5 bg-sunken border-b border-border-strong rounded-t-sm">
        {tools.map(t => (
          <button
            key={t.label}
            type="button"
            onMouseDown={t.cmd === 'link' ? insertLink : exec(t.cmd, t.arg)}
            aria-label={t.label}
            title={t.label}
            className="inline-flex items-center justify-center w-8 h-8 max-lg:w-10 max-lg:h-10 rounded-sm border border-border-strong bg-surface text-bark-800 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <t.icon size={16} aria-hidden />
          </button>
        ))}
        {aside && <div className="ml-auto self-center pr-1.5">{aside}</div>}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel ?? placeholder}
        data-placeholder={placeholder}
        onFocus={handleFocus}
        onInput={() => onChange(ref.current?.innerHTML ?? '')}
        onBlur={() => onChange(ref.current?.innerHTML ?? '')}
        className={`gz-rte ${compact ? 'min-h-[110px]' : 'min-h-[260px]'} px-4 py-3.5 text-base max-lg:text-md bg-surface text-primary leading-relaxed rounded-b-sm`}
      />
    </div>
  )
}
