import { describe, expect, it } from 'vitest'
import { parseAppClient } from './appClient'

const h = (o: Record<string, string>) => new Headers(o)

describe('parseAppClient', () => {
  it('reads platform, version and build', () => {
    expect(parseAppClient(h({ 'x-app-platform': 'android', 'x-app-version': '1.2.1', 'x-app-build': '14' })))
      .toEqual({ platform: 'android', version: '1.2.1', build: '14' })
    expect(parseAppClient(h({ 'X-App-Platform': 'iOS', 'X-App-Version': '1.3.0' })))
      .toEqual({ platform: 'ios', version: '1.3.0', build: null })
  })
  it('accepts a prerelease suffix', () => {
    expect(parseAppClient(h({ 'x-app-platform': 'android', 'x-app-version': '1.3.0-beta.1' }))?.version).toBe('1.3.0-beta.1')
  })
  it('returns null when headers are missing or invalid (old apps, web, junk)', () => {
    expect(parseAppClient(h({}))).toBeNull()
    expect(parseAppClient(h({ 'x-app-platform': 'android' }))).toBeNull()
    expect(parseAppClient(h({ 'x-app-platform': 'web', 'x-app-version': '1.2.1' }))).toBeNull()
    expect(parseAppClient(h({ 'x-app-platform': 'android', 'x-app-version': "1.2.1'; drop table" }))).toBeNull()
    expect(parseAppClient(h({ 'x-app-platform': 'android', 'x-app-version': 'latest' }))).toBeNull()
  })
  it('drops an unusable build but keeps the version', () => {
    expect(parseAppClient(h({ 'x-app-platform': 'android', 'x-app-version': '1.2.1', 'x-app-build': 'a b!' }))?.build).toBeNull()
  })
})
