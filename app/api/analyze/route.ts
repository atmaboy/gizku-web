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

// Guard against the model occasionally dumping leftover JSON-looking content
// into a free-text field instead of using separate tool parameters — cut the
// text off before any such leak and cap its length.
function sanitizeAiText(value: unknown, maxLen = 300): string | undefined {
  if (typeof value !== 'string') return undefined
  const jsonLeakIndex = value.search(/"\s*,?\s*"[a-zA-Z]+"\s*:/)
  const cleaned = jsonLeakIndex === -1 ? value : value.slice(0, jsonLeakIndex)
  return cleaned.trim().slice(0, maxLen) || undefined
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

function isTemperatureUnsupported(e: unknown): boolean {
  const error = e as AnthropicError
  const message = (error?.error as { message?: string } | undefined)?.message ?? ''
  return error?.status === 400 && /temperature/i.test(message)
}

// Some models (e.g. extended-thinking-only models) reject a custom `temperature` —
// whichever model is configured via the admin panel, degrade gracefully instead of
// failing the whole analysis: drop `temperature` and retry once.
async function createAnalysisMessage(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  try {
    return await callWithRetry(() => client.messages.create(params))
  } catch (e) {
    if (!isTemperatureUnsupported(e) || params.temperature === undefined) throw e
    const withoutTemperature = { ...params }
    delete withoutTemperature.temperature
    return await callWithRetry(() => client.messages.create(withoutTemperature))
  }
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
  const modelId = await getCfg('anthropic_model') || 'claude-sonnet-5'

  const basePrompt = `Kamu adalah analis nutrisi makanan. Tugasmu HANYA menganalisa gambar yang berisi makanan atau minuman.

LANGKAH PERTAMA — validasi gambar:
- Jika gambar TIDAK mengandung makanan atau minuman sama sekali (misalnya: pemandangan, orang, hewan, benda, teks, selfie, dll), panggil tool "report_non_food_image".
- Jika gambar MENGANDUNG makanan atau minuman, lanjutkan ke analisa nutrisi.

LANGKAH KEDUA — estimasi porsi:
- Jika ada objek pembanding ukuran di foto (piring, mangkuk, gelas, sendok/garpu, tangan, dll), gunakan itu sebagai acuan estimasi porsi dan berat makanan.
- Jika TIDAK ada objek pembanding sama sekali, gunakan asumsi ukuran piring makan standar (±24-26cm diameter) sebagai default, dan sebutkan di field "notes" bahwa estimasi porsi bersifat asumsi karena tidak ada pembanding ukuran di foto.

LANGKAH KETIGA — panggil tool report_food_analysis untuk melaporkan hasil. Isi setiap parameter tool secara terpisah dan ringkas, JANGAN menulis jawabanmu sebagai teks/JSON biasa:
- notes dan assessment: masing-masing HANYA 1-2 kalimat natural dalam Bahasa Indonesia, tanpa format JSON atau nama parameter lain di dalamnya.
- notesEn dan assessmentEn: terjemahan natural (bukan literal) dari notes dan assessment ke Bahasa Inggris, juga HANYA 1-2 kalimat.`

  const correctionPrompt = correction.trim()
    ? `${basePrompt}\n\nKOREKSI DARI USER: "${correction.trim()}"\nGunakan informasi koreksi di atas sebagai prioritas utama untuk menentukan nama menu, bahan, dan porsi yang benar. Perbarui seluruh daftar dishes, total nutrisi, notes, notesEn, healthScore, assessment, dan assessmentEn berdasarkan koreksi tersebut.`
    : basePrompt

  type AnalysisResult = {
    dishes?: { name: string }[]
    total?: { calories: number; protein: number; carbs: number; fat: number }
    notes?: string
    notesEn?: string
    healthScore?: number
    assessment?: string
    assessmentEn?: string
  }

  const dishSchema = {
    type: 'object' as const,
    properties: {
      name:     { type: 'string' as const, description: 'Nama makanan' },
      portion:  { type: 'string' as const, description: 'Estimasi porsi, misal: 1 piring, 200g' },
      calories: { type: 'number' as const },
      protein:  { type: 'number' as const },
      carbs:    { type: 'number' as const },
      fat:      { type: 'number' as const },
    },
    required: ['name', 'portion', 'calories', 'protein', 'carbs', 'fat'],
  }

  const nutritionTotalsSchema = {
    type: 'object' as const,
    properties: {
      calories: { type: 'number' as const },
      protein:  { type: 'number' as const },
      carbs:    { type: 'number' as const },
      fat:      { type: 'number' as const },
    },
    required: ['calories', 'protein', 'carbs', 'fat'],
  }

  const tools: Anthropic.Tool[] = [
    {
      name: 'report_non_food_image',
      description: 'Laporkan bahwa gambar tidak mengandung makanan atau minuman sama sekali.',
      input_schema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Pesan singkat dalam Bahasa Indonesia yang menjelaskan bahwa gambar tidak mengandung makanan/minuman.' },
        },
        required: ['message'],
      },
    },
    {
      name: 'report_food_analysis',
      description: 'Laporkan hasil analisa nutrisi lengkap dari makanan/minuman yang terdeteksi di gambar.',
      input_schema: {
        type: 'object',
        properties: {
          dishes:       { type: 'array', items: dishSchema },
          total:        nutritionTotalsSchema,
          notes:        { type: 'string', maxLength: 300, description: '1-2 kalimat natural dalam Bahasa Indonesia tentang nilai gizi. HANYA teks biasa — jangan sertakan format JSON, tanda kutip, atau nama parameter lain di dalamnya.' },
          notesEn:      { type: 'string', maxLength: 300, description: 'Terjemahan natural (bukan literal) dari notes ke Bahasa Inggris, 1-2 kalimat, teks biasa saja.' },
          healthScore:  { type: 'number', description: 'Skor kesehatan 1-10' },
          assessment:   { type: 'string', maxLength: 300, description: '1-2 kalimat natural dalam Bahasa Indonesia berisi penilaian singkat. HANYA teks biasa — jangan sertakan format JSON, tanda kutip, atau nama parameter lain di dalamnya.' },
          assessmentEn: { type: 'string', maxLength: 300, description: 'Terjemahan natural (bukan literal) dari assessment ke Bahasa Inggris, 1-2 kalimat, teks biasa saja.' },
        },
        required: ['dishes', 'total', 'notes', 'notesEn', 'healthScore', 'assessment', 'assessmentEn'],
      },
    },
  ]

  let analysis: AnalysisResult
  try {
    const client = new Anthropic({ apiKey })
    const response = await createAnalysisMessage(client, {
      model: modelId,
      max_tokens: 1024,
      temperature: 0.2,
      tools,
      tool_choice: { type: 'any', disable_parallel_tool_use: true },
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

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) return err('Gagal memparse respons AI')

    if (toolUse.name === 'report_non_food_image') {
      const input = toolUse.input as { message?: string }
      return err(input.message || 'Gambar tidak mengandung makanan. Silakan foto makananmu.', 422)
    }

    analysis = toolUse.input as AnalysisResult
    analysis.notes        = sanitizeAiText(analysis.notes)
    analysis.notesEn      = sanitizeAiText(analysis.notesEn)
    analysis.assessment   = sanitizeAiText(analysis.assessment)
    analysis.assessmentEn = sanitizeAiText(analysis.assessmentEn)

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
