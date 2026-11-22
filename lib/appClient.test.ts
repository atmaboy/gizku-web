import { describe, expect, it } from 'vitest'
import { parseAppClient } from './appClient'

const h = (o: Record<string, string>) => new Headers(o)

describe('parseAppClient', () => {
  it('reads platform, version and build', () => {
    expect(parseAppClient(h({ 'x-app-platform': 'android', 'x-app-version': '1.2.1', 'x-app-build': '14' })))
      .toEqual({ platform: 'android', version: '1.2.1', build: '14', deviceId: null })
    expect(parseAppClient(h({ 'X-App-Platform': 'iOS', 'X-App-Version': '1.3.0' })))
      .toEqual({ platform: 'ios', version: '1.3.0', build: null, deviceId: null })
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
  it('reads a valid install id (lowercased) and drops junk', () => {
    const id = '3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b'
    const base = { 'x-app-platform': 'android', 'x-app-version': '1.2.1' }
    expect(parseAppClient(h({ ...base, 'x-device-id': id.toUpperCase() }))?.deviceId).toBe(id)
    expect(parseAppClient(h({ ...base, 'x-device-id': 'abc' }))?.deviceId).toBeNull()
    expect(parseAppClient(h({ ...base, 'x-device-id': "x'; drop table" }))?.deviceId).toBeNull()
  })
})
