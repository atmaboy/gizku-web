'use client'
/**
 * Landing Builder state: the draft document, autosave (debounced 800 ms,
 * optimistic lock on `revision`, 409 → "Diubah admin lain"), the live diff vs
 * the published version, and the publish-rule check — shared by every
 * builder page through the /admin/landing layout, so switching sections
 * keeps state and pending saves.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { diffContent, totalChanges, type Changes } from '@/lib/landing/diff'
import { validateForPublish, type PublishCheck, type PublishIssue } from '@/lib/landing/publish-rules'
import type { LegalDocLink } from '@/lib/landing/render'
import type { LandingContent, PatchPath } from '@/lib/landing/schema'
import type { MetricValues } from '@/lib/landing/stats'

const DEBOUNCE_MS = 800

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; notMigrated?: boolean }
  | { status: 'ready' }

type BuilderValue = {
  load: LoadState
  draft: LandingContent | null
  published: LandingContent | null
  revision: number
  metrics: MetricValues | null
  legalDocs: LegalDocLink[]
  changes: Changes
  total: number
  check: PublishCheck
  saveState: SaveState
  savedAt: Date | null
  conflict: boolean
  publishedAt: string | null
  /** Replace one top-level part of the draft (autosaved). */
  update: <P extends PatchPath>(path: P, value: LandingContent[P]) => void
  /** Save pending edits right now (before publish/discard/preview). */
  flush: () => Promise<boolean>
  reload: () => Promise<void>
  publish: () => Promise<{ ok: true; warnings: PublishIssue[] } | { ok: false; errors: PublishIssue[]; message: string }>
  discard: () => Promise<boolean>
}

const Ctx = createContext<BuilderValue | null>(null)

export function useBuilder(): BuilderValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useBuilder must be used inside <BuilderProvider>')
  return v
}

/** Convenience: the draft, asserted ready (forms only render when ready). */
export function useDraft(): LandingContent {
  const { draft } = useBuilder()
  if (!draft) throw new Error('Draft not loaded')
  return draft
}

const EMPTY_CHECK: PublishCheck = { errors: [], warnings: [] }

export function BuilderProvider({ children }: { children: React.ReactNode }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [draft, setDraft] = useState<LandingContent | null>(null)
  const [published, setPublished] = useState<LandingContent | null>(null)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<MetricValues | null>(null)
  const [legalDocs, setLegalDocs] = useState<LegalDocLink[]>([])
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [conflict, setConflict] = useState(false)
  const [revision, setRevision] = useState(0)

  // Refs mirror state for the async save loop (no stale closures).
  const draftRef = useRef<LandingContent | null>(null)
  const revisionRef = useRef(0)
  const dirty = useRef(new Set<PatchPath>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inflight = useRef<Promise<boolean> | null>(null)
  const conflictRef = useRef(false)

  const reload = useCallback(async () => {
    setLoad(l => (l.status === 'ready' ? l : { status: 'loading' }))
    try {
      const res = await fetch('/api/admin/landing-builder', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoad({ status: 'error', message: json.error ?? `Gagal memuat (${res.status})`, notMigrated: json.code === 'not_migrated' })
        return
      }
      dirty.current.clear()
      draftRef.current = json.draft
      revisionRef.current = json.revision
      conflictRef.current = false
      setDraft(json.draft)
      setPublished(json.published)
      setPublishedAt(json.publishedAt)
      setRevision(json.revision)
      setMetrics(json.metrics)
      setLegalDocs(json.legalDocs ?? [])
      setSavedAt(json.updatedAt ? new Date(json.updatedAt) : null)
      setSaveState('idle')
      setConflict(false)
      setLoad({ status: 'ready' })
    } catch {
      setLoad({ status: 'error', message: 'Koneksi gagal. Periksa jaringan lalu muat ulang.' })
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (inflight.current) await inflight.current
    if (conflictRef.current) return false
    if (dirty.current.size === 0) return true
    const run = (async () => {
      setSaveState('saving')
      const paths = [...dirty.current]
      dirty.current.clear()
      for (let i = 0; i < paths.length; i++) {
        const path = paths[i]
        const value = draftRef.current?.[path]
        try {
          const res = await fetch('/api/admin/landing-builder/draft', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ revision: revisionRef.current, path, value }),
          })
          const json = await res.json().catch(() => ({}))
          if (res.status === 409) {
            conflictRef.current = true
            setConflict(true)
            setSaveState('error')
            paths.slice(i).forEach(p => dirty.current.add(p))
            return false
          }
          if (!res.ok) throw new Error(json.error ?? `Gagal menyimpan (${res.status})`)
          revisionRef.current = json.revision
          setRevision(json.revision)
          setSavedAt(new Date(json.updatedAt))
        } catch (e) {
          paths.slice(i).forEach(p => dirty.current.add(p))
          setSaveState('error')
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan draf')
          return false
        }
      }
      setSaveState(dirty.current.size ? 'pending' : 'saved')
      return true
    })()
    inflight.current = run
    const ok = await run
    inflight.current = null
    // Edits made while this batch was in flight get their own debounce.
    if (ok && dirty.current.size && !timer.current) {
      timer.current = setTimeout(() => { timer.current = null; void saveNow() }, DEBOUNCE_MS)
    }
    return ok
  }, [])

  const update = useCallback(<P extends PatchPath>(path: P, value: LandingContent[P]) => {
    if (!draftRef.current || conflictRef.current) return
    const next = { ...draftRef.current, [path]: value } as LandingContent
    draftRef.current = next
    setDraft(next)
    dirty.current.add(path)
    setSaveState('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; void saveNow() }, DEBOUNCE_MS)
  }, [saveNow])

  // Don't lose the last keystrokes when leaving the page.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size || inflight.current) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const publish = useCallback<BuilderValue['publish']>(async () => {
    const ok = await saveNow()
    if (!ok) return { ok: false, errors: [], message: conflictRef.current ? 'Diubah admin lain, muat ulang' : 'Draf belum tersimpan' }
    const res = await fetch('/api/admin/landing-builder/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision: revisionRef.current }),
    })
    const json = await res.json().catch(() => ({}))
    if (res.status === 409) { conflictRef.current = true; setConflict(true); return { ok: false, errors: [], message: 'Diubah admin lain, muat ulang' } }
    if (!res.ok) return { ok: false, errors: json.errors ?? [], message: json.error ?? 'Gagal menerbitkan' }
    await reload()
    return { ok: true, warnings: json.warnings ?? [] }
  }, [saveNow, reload])

  const discard = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (inflight.current) await inflight.current
    dirty.current.clear()
    const res = await fetch('/api/admin/landing-builder/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision: revisionRef.current }),
    })
    if (res.status === 409) { conflictRef.current = true; setConflict(true); return false }
    if (!res.ok) { toast.error('Gagal membuang draf'); return false }
    await reload()
    return true
  }, [reload])

  const changes = useMemo(() => (draft ? diffContent(published, draft) : {}), [draft, published])
  const check = useMemo(() => (draft ? validateForPublish(draft) : EMPTY_CHECK), [draft])

  const value: BuilderValue = {
    load, draft, published, revision, metrics, legalDocs, changes, total: totalChanges(changes), check,
    saveState, savedAt, conflict, publishedAt, update, flush: saveNow, reload, publish, discard,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
