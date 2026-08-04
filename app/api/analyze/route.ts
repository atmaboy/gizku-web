import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { dailyUsage } from '@/drizzle/schema'
import { verifyToken, extractToken } from '@/lib/auth'
import { getCfg, getGlobalLimit } from '@/lib/admin'
import { computeEffectiveLimit } from '@/lib/limitLedger'
import { ok, err, setCors, todayISO } from '@/lib/utils'
import { checkMaintenance, maintenanceResponse } from '@/lib/maintenance'
import { eq, and, sql } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

type AnthropicError = {
  status?: number
  code?: string
  name?: string
  error?: { type?: string }
  response?: { error?: unknown }
}

// Retry with exponential backoff for 529 Overloaded errors
async function callWithRetry(
  fn: () => Promise<Anthropic.Message>,
  maxRetries = 3,
): Promise<Anthropic.Message> {
  let lastError: AnthropicError = {}
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e as AnthropicError
      const isOverloaded = lastError?.status === 529 || lastError?.error?.type === 'overloaded_error'
      if (!isOverloaded || attempt === maxRetries) throw e
      const delay = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

export async function POST(req: NextRequest) {
  const { enabled } = await checkMaintenance()
  if (enabled) return maintenanceResponse()

  const token = extractToken(req.headers.get('Authorization'))
  if (!token) return err('Token diperlukan', 401)
  let payload: { userId: string; username: string }
  try {
    const p = await verifyToken(token)
    if (!p.userId) throw new Error()
    payload = { userId: p.userId, username: p.username! }
  } catch {
    return err('Token tidak valid', 401)
  }

  const { users } = await import('@/drizzle/schema')
  const { eq: eqOp } = await import('drizzle-orm')
  const [user] = await db.select({ dailyLimit: users.dailyLimit }).from(users)
    .where(eqOp(users.id, payload.userId)).limit(1)

  const globalLimit = await getGlobalLimit()
  const floor       = user?.dailyLimit ?? globalLimit
  // Effective limit = max(existing floor, active "Request Kenaikan Limit
  // Analisa" tier total/day) — only ever adds on top, never reduces it.
  const userLimit   = await computeEffectiveLimit(payload.userId, floor)
  const today       = todayISO()

  const [usage] = await db.select().from(dailyUsage)
    .where(and(eq(dailyUsage.userId, payload.userId), eq(dailyUsage.date, today)))
    .limit(1)

  if ((usage?.count ?? 0) >= userLimit) {
    return err(`Batas analisa harian (${userLimit}x) sudah tercapai`, 429)
  }

  const contentType = req.headers.get('content-type') || ''
  let imageBase64 = '', mimeType = 'image/jpeg', correction = ''

  if (contentType.includes('application/json')) {
    const body  = await req.json()
    imageBase64 = body.image || ''
    mimeType    = body.mimeType || 'image/jpeg'
    correction  = body.correction || ''
  } else if (contentType.includes('multipart/form-data')) {
    const form  = await req.formData()
    const file  = form.get('image') as File
    if (!file) return err('Gambar diperlukan')
    const buf   = await file.arrayBuffer()
    imageBase64 = Buffer.from(buf).toString('base64')
    mimeType    = file.type || 'image/jpeg'
    correction  = (form.get('correction') as string) || ''
  } else {
    return err('Content-Type tidak didukung')
  }

  if (!imageBase64) return err('Gambar diperlukan')

  const apiKey  = await getCfg('anthropic_api_key') || process.env.ANTHROPIC_API_KEY
  if (!apiKey) return err('API key Anthropic belum dikonfigurasi', 503)
  const modelId = await getCfg('anthropic_model') || 'claude-sonnet-4-6'

  const basePrompt = `Kamu adalah analis nutrisi makanan. Tugasmu HANYA menganalisa gambar yang berisi makanan atau minuman.

LANGKAH PERTAMA — validasi gambar:
- Jika gambar TIDAK mengandung makanan atau minuman sama sekali (misalnya: pemandangan, orang, hewan, benda, teks, selfie, dll), kembalikan TEPAT JSON berikut tanpa teks lain:
  {"error": "non_food", "message": "Gambar tidak mengandung makanan atau minuman. Silakan foto makananmu."}

- Jika gambar MENGANDUNG makanan atau minuman, lanjutkan ke analisa nutrisi.

LANGKAH KEDUA — jika ada makanan, kembalikan TEPAT format JSON berikut tanpa teks lain:
{
  "dishes": [
    {
      "name": "nama makanan",
      "portion": "estimasi porsi (misal: 1 piring, 200g)",
      "calories": 300,
      "protein": 15.5,
      "carbs": 40.0,
      "fat": 8.0
    }
  ],
  "total": {
    "calories": 300,
    "protein": 15.5,
    "carbs": 40.0,
    "fat": 8.0
  },
  "notes": "catatan singkat tentang nilai gizi",
  "healthScore": 7,
  "assessment": "penilaian singkat dalam 1-2 kalimat"
}`

  const correctionPrompt = correction.trim()
    ? `${basePrompt}\n\nKOREKSI DARI USER: "${correction.trim()}"\nGunakan informasi koreksi di atas sebagai prioritas utama untuk menentukan nama menu, bahan, dan porsi yang benar. Perbarui seluruh daftar dishes, total nutrisi, notes, healthScore, dan assessment berdasarkan koreksi tersebut.`
    : basePrompt

  type AnalysisResult = {
    error?: string
    message?: string
    dishes?: { name: string }[]
    total?: { calories: number; protein: number; carbs: number; fat: number }
    notes?: string
    healthScore?: number
    assessment?: string
  }

  let analysis: AnalysisResult
  try {
    const client = new Anthropic({ apiKey })
    const response = await callWithRetry(() =>
      client.messages.create({
        model: modelId,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 },
            },
            {
              type: 'text',
              text: correctionPrompt,
            },
          ],
        }],
      })
    )

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return err('Gagal memparse respons AI')
    analysis = JSON.parse(jsonMatch[0]) as AnalysisResult

    if (analysis.error === 'non_food') {
      return err(analysis.message || 'Gambar tidak mengandung makanan. Silakan foto makananmu.', 422)
    }

  } catch (e) {
    const error = e as AnthropicError
    const body = error?.error ?? null

    if (error?.status === 529 || (body as { type?: string })?.type === 'overloaded_error') {
      return err('Server AI sedang sibuk. Tunggu beberapa detik lalu coba lagi.', 503)
    }
    if (error?.status === 429) {
      return err('Batas permintaan AI tercapai. Coba lagi dalam beberapa menit.', 429)
    }
    if (error?.status === 401) {
      return err('API key Anthropic tidak valid. Hubungi admin.', 503)
    }
    if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET' || error?.name === 'TimeoutError') {
      return err('Koneksi ke AI timeout. Coba lagi.', 503)
    }

    console.error('[analyze] Anthropic error:', e)
    return err('Analisa gagal. Coba lagi beberapa saat.', 500)
  }

  await db.insert(dailyUsage)
    .values({ userId: payload.userId, date: today, count: 1 })
    .onConflictDoUpdate({
      target: [dailyUsage.userId, dailyUsage.date],
      set: { count: sql`${dailyUsage.count} + 1` },
    })

  const usedAfter = (usage?.count ?? 0) + 1

  return ok({
    analysis,
    imageDataUrl: `data:${mimeType};base64,${imageBase64}`,
    usage: { used: usedAfter, limit: userLimit, remaining: Math.max(0, userLimit - usedAfter) },
  })
}
