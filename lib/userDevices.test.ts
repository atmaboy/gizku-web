import { describe, expect, it } from 'vitest'
import { appClientLabel, latestAppClient, deviceLabel, lastActivity, platformSummary, primaryLanguage, emptyInfo, type AppClientRow, type DeviceRow } from './userDevices'

const dev = (o: Partial<DeviceRow>): DeviceRow => ({
  platform: 'android', provider: 'fcm', language: 'id', isActive: true,
  createdAt: new Date('2026-11-01'), lastSeenAt: new Date('2026-11-10'), ...o,
})

describe('deviceLabel', () => {
  it('distinguishes FCM, Expo and iOS', () => {
    expect(deviceLabel({ platform: 'android', provider: 'fcm' })).toBe('Android · FCM')
    expect(deviceLabel({ platform: 'android', provider: 'expo' })).toBe('Android · Expo')
    expect(deviceLabel({ platform: 'ios', provider: 'expo' })).toBe('iOS')
  })
})

describe('platformSummary', () => {
  it('uses active devices, ignores inactive, dedupes', () => {
    const info = { ...emptyInfo(), devices: [dev({}), dev({}), dev({ platform: 'ios', provider: 'expo' }), dev({ provider: 'expo', isActive: false })] }
    expect(platformSummary(info)).toEqual({ labels: ['Android · FCM', 'iOS'], fromHistory: false })
  })
  it('falls back to meal history when there is no active token', () => {
    const info = { ...emptyInfo(), mealPlatforms: ['android' as const] }
    expect(platformSummary(info)).toEqual({ labels: ['Android'], fromHistory: true })
    expect(platformSummary(emptyInfo())).toEqual({ labels: [], fromHistory: false })
  })
})

describe('primaryLanguage / lastActivity', () => {
  it('takes the most recent active device language', () => {
    expect(primaryLanguage({ ...emptyInfo(), devices: [dev({ language: 'en' }), dev({ language: 'id' })] })).toBe('en')
    expect(primaryLanguage(emptyInfo())).toBeNull()
  })
  it('picks the latest of login, last meal and active token', () => {
    const info = { ...emptyInfo(), lastMealAt: new Date('2026-11-12'), devices: [dev({ lastSeenAt: new Date('2026-11-14') }), dev({ isActive: false, lastSeenAt: new Date('2026-11-20') })] }
    expect(lastActivity(new Date('2026-11-13'), info)).toEqual(new Date('2026-11-14'))
    expect(lastActivity(null, emptyInfo())).toBeNull()
  })
})

const client = (o: Partial<AppClientRow>): AppClientRow => ({
  platform: 'android', appVersion: '1.2.0', appBuild: '10', firstSeenAt: new Date('2026-11-01'), lastSeenAt: new Date('2026-11-10'), ...o,
})

describe('app clients (version reporting)', () => {
  it('latestAppClient picks the most recently seen version', () => {
    const info = { ...emptyInfo(), appClients: [client({ appVersion: '1.2.0', lastSeenAt: new Date('2026-11-10') }), client({ appVersion: '1.2.1', lastSeenAt: new Date('2026-11-18') })] }
    expect(latestAppClient(info)?.appVersion).toBe('1.2.1')
    expect(latestAppClient(emptyInfo())).toBeNull()
  })
  it('labels platform + version', () => {
    expect(appClientLabel({ platform: 'android', appVersion: '1.2.1' })).toBe('Android 1.2.1')
    expect(appClientLabel({ platform: 'ios', appVersion: '1.3.0' })).toBe('iOS 1.3.0')
  })
  it('lastActivity counts the app heartbeat even without login, meal or push token', () => {
    const info = { ...emptyInfo(), appClients: [client({ lastSeenAt: new Date('2026-11-21') })] }
    expect(lastActivity(new Date('2026-11-13'), info)).toEqual(new Date('2026-11-21'))
  })
})
