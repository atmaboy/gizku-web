/**
 * Draft vs published diff, counted per builder section — powers the
 * "Draf · N perubahan" chip, the per-section "2 perubahan" hints, the publish
 * summary modal, and landing_page_history.change_summary.
 *
 * Counting rule (what an admin would call "one change"):
 *  - a changed scalar field = 1
 *  - a list of items with `id` = 1 per added / removed / edited item, +1 if
 *    only the order changed
 *  - toggling a section's visibility counts toward that section
 *  - reordering sections counts once, under `order`
 */
import { SECTION_KEYS, type LandingContent, type SectionKey } from './schema'

export type ChangeKey = keyof Omit<LandingContent, 'visibility'>
export type Changes = Partial<Record<ChangeKey, number>>

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function hasIds(a: unknown[]): a is { id: string }[] {
  return a.length > 0 && a.every(x => isPlainObject(x) && typeof x.id === 'string')
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function countDiff(a: unknown, b: unknown): number {
  if (same(a, b)) return 0
  if (Array.isArray(a) && Array.isArray(b)) {
    if ((a.length === 0 || hasIds(a)) && (b.length === 0 || hasIds(b)) && (a.length + b.length) > 0) {
      const byId = new Map((a as { id: string }[]).map(x => [x.id, x]))
      const bIds = new Set((b as { id: string }[]).map(x => x.id))
      let n = 0
      for (const item of b as { id: string }[]) {
        const prev = byId.get(item.id)
        if (!prev) n++
        else if (!same(prev, item)) n++
      }
      for (const id of byId.keys()) if (!bIds.has(id)) n++
      if (n === 0) n = 1 // same items, different order
      return n
    }
    // Arrays of primitives / tuples: compare position by position.
    const len = Math.max(a.length, b.length)
    let n = 0
    for (let i = 0; i < len; i++) n += countDiff(a[i], b[i])
    return n
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    let n = 0
    for (const k of keys) n += countDiff(a[k], b[k])
    return n
  }
  return 1
}

export function diffContent(published: LandingContent | null, draft: LandingContent): Changes {
  const out: Changes = {}
  if (!published) return out
  const keys: ChangeKey[] = ['order', 'settings', 'header', ...SECTION_KEYS, 'footer']
  for (const k of keys) {
    let n = k === 'order' ? (same(published.order, draft.order) ? 0 : 1) : countDiff(published[k], draft[k])
    if ((SECTION_KEYS as readonly string[]).includes(k) && published.visibility[k as SectionKey] !== draft.visibility[k as SectionKey]) n++
    if (n > 0) out[k] = n
  }
  return out
}

export function totalChanges(c: Changes): number {
  return Object.values(c).reduce<number>((s, n) => s + (n ?? 0), 0)
}
