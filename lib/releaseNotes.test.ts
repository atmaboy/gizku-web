import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { FEATURES, RELEASES, latestRelease, type Platform } from './releaseNotes'

const SEMVER = /^\d+\.\d+\.\d+$/

function cmp(a: string, b: string) {
  const [pa, pb] = [a, b].map(v => v.split('.').map(Number))
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
  return 0
}

const platforms: Platform[] = ['web', 'mobile']

describe.each(platforms)('release notes (%s)', platform => {
  const releases = RELEASES[platform]

  it('has releases, each with a semver version, ISO date, and at least one change', () => {
    expect(releases.length).toBeGreaterThan(0)
    for (const r of releases) {
      expect(r.version).toMatch(SEMVER)
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r.changes.length).toBeGreaterThan(0)
    }
  })

  it('is ordered newest first with strictly decreasing versions and non-increasing dates', () => {
    for (let i = 1; i < releases.length; i++) {
      expect(cmp(releases[i - 1].version, releases[i].version)).toBeGreaterThan(0)
      expect(releases[i - 1].date >= releases[i].date).toBe(true)
    }
  })

  it('has a feature list', () => {
    expect(FEATURES[platform].length).toBeGreaterThan(0)
  })
})

describe('web version', () => {
  it('matches package.json — bump both together on every release (see CLAUDE.md)', () => {
    const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as { version: string }
    expect(pkg.version).toBe(latestRelease('web').version)
  })
})
