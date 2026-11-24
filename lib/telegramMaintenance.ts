/** Pesan bot Telegram saat maintenance aktif. Template bisa diedit admin (admin_config.telegram_maintenance_message). */

export const DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE = '🔧 {title}\n\n{description}'

/**
 * Isi {title} dan {description} (dari pengaturan Mode Maintenance). Template kosong/spasi = pakai default.
 * Dikirim sebagai teks biasa (tanpa Markdown) supaya karakter seperti _ atau * di pesan admin tidak membuat kirim gagal.
 */
export function renderTelegramMaintenanceMessage(
  template: string | null | undefined,
  info: { title: string; description: string },
): string {
  const t = template && template.trim() ? template : DEFAULT_TELEGRAM_MAINTENANCE_MESSAGE
  return t.replaceAll('{title}', info.title).replaceAll('{description}', info.description)
}
