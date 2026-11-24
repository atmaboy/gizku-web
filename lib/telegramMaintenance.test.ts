import { describe, it, expect } from 'vitest'
import { renderTelegramMaintenanceMessage, DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE } from './telegramMaintenance'

const info = { title: 'Gizku sedang dalam perbaikan', description: 'Kembali lagi nanti.' }

describe('renderTelegramMaintenanceMessage', () => {
  it('memakai template admin dengan variabel', () => {
    expect(renderTelegramMaintenanceMessage('Halo! {title} — {description} ({title})', info))
      .toBe('Halo! Gizku sedang dalam perbaikan — Kembali lagi nanti. (Gizku sedang dalam perbaikan)')
  })
  it('template kosong atau spasi memakai default', () => {
    const expected = DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE.replace('{title}', info.title).replace('{description}', info.description)
    for (const t of [null, undefined, '', '   \n']) expect(renderTelegramMaintenanceMessage(t, info)).toBe(expected)
  })
  it('template tanpa variabel dikirim apa adanya', () => {
    expect(renderTelegramMaintenanceMessage('Bot libur dulu ya', info)).toBe('Bot libur dulu ya')
  })
})
