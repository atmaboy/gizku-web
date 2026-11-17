import { BANNER_HEIGHT, BANNER_TARGET_BYTES, BANNER_WIDTH } from '@/lib/pushImage'

/**
 * Resize ke rasio 2:1 (1024×512, crop tengah) lalu kompres ke JPEG sampai ≤ BANNER_TARGET_BYTES.
 * Dijalankan di browser sebelum upload. Melempar Error kalau file tidak bisa dibaca / tetap terlalu besar.
 */
export async function compressBanner(file: File): Promise<File> {
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file) } catch { throw new Error('File gambar tidak bisa dibaca.') }

  const canvas = document.createElement('canvas')
  canvas.width = BANNER_WIDTH
  canvas.height = BANNER_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Browser tidak mendukung kompres gambar.')
  ctx.fillStyle = '#ffffff' // PNG transparan → latar putih (JPEG tidak punya alpha)
  ctx.fillRect(0, 0, BANNER_WIDTH, BANNER_HEIGHT)
  const scale = Math.max(BANNER_WIDTH / bmp.width, BANNER_HEIGHT / bmp.height)
  const w = bmp.width * scale
  const h = bmp.height * scale
  ctx.drawImage(bmp, (BANNER_WIDTH - w) / 2, (BANNER_HEIGHT - h) / 2, w, h)
  bmp.close()

  for (const q of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', q))
    if (blob && blob.size <= BANNER_TARGET_BYTES) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
    }
  }
  throw new Error('Gambar tidak bisa dikompres di bawah 1 MB. Pakai gambar yang lebih sederhana.')
}
