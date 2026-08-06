'use client'

import { useEffect, useRef } from 'react'

/**
 * Minimal rich-text editor for legal document bodies. Uses `contentEditable`
 * + `document.execCommand` — deprecated but dependency-free, matches the
 * constrained toolbar (bold, italic, H3, bullet/numbered list) the backend
 * sanitizer (`lib/legal.ts#sanitizeHtml`) allows through.
 *
 * Uncontrolled by design: `value` only seeds the DOM once per `resetKey`
 * change (e.g. switching document/language), so typing doesn't fight React
 * re-renders or reset the caret position.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  resetKey,
}: {
  value: string
  onChange: (html: string) => void
  placeholder: string
  resetKey: string
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

  const toolBtn: React.CSSProperties = {
    background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 6,
    padding: '6px 10px', fontSize: 12.5, cursor: 'pointer', minWidth: 30,
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, padding: 8, background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: '10px 10px 0 0', borderBottom: 'none' }}>
        <button type="button" onMouseDown={exec('bold')} style={toolBtn}><b>B</b></button>
        <button type="button" onMouseDown={exec('italic')} style={toolBtn}><i>I</i></button>
        <button type="button" onMouseDown={exec('formatBlock', '<h3>')} style={{ ...toolBtn, fontWeight: 700 }}>H</button>
        <button type="button" onMouseDown={exec('insertUnorderedList')} style={toolBtn}>&bull; List</button>
        <button type="button" onMouseDown={exec('insertOrderedList')} style={toolBtn}>1. List</button>
      </div>
      <div
        ref={ref}
        contentEditable
        data-placeholder={placeholder}
        onFocus={handleFocus}
        onInput={() => onChange(ref.current?.innerHTML ?? '')}
        onBlur={() => onChange(ref.current?.innerHTML ?? '')}
        className="gz-rte"
        style={{
          minHeight: 220, border: '1.5px solid #E5E7EB', borderRadius: '0 0 10px 10px',
          borderTop: 'none', padding: '14px 16px', fontSize: 14, background: '#fff', color: '#111827', lineHeight: 1.6,
        }}
      />
    </div>
  )
}
