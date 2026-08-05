/**
 * lib/bot.ts
 * Core Telegram bot logic using grammY.
 * Handles: /start, /help, /today, /link <token>, photo messages.
 *
 * Account Linking Flow:
 *   1. User visits gizku.com/settings → clicks "Hubungkan Telegram"
 *   2. Web calls POST /api/telegram/link → returns 6-char token (e.g. AB3X9Z)
 *   3. User sends "/link AB3X9Z" to bot (or uses deep-link t.me/bot?start=link_AB3X9Z)
 *   4. Bot calls GET /api/telegram/verify?token=AB3X9Z&tgId=...&firstName=...&username=...
 *   5. Verify endpoint links telegramUsers.userId = users.id and deletes token
 *   6. Bot confirms success; future photo analyses are saved to user's meal log
 *
 * Whitelist (dev/staging only):
 *   Set TELEGRAM_WHITELIST_ENABLED=true and TELEGRAM_WHITELIST_IDS=id1,id2
 *   in Vercel Preview environment to restrict bot access to specific Telegram
 *   user IDs. Has zero effect in production (when flag is not set).
 */

import { Bot, Context } from 'grammy'
import { db } from '@/lib/db'
import { getCfg } from '@/lib/admin'
import { telegramUsers, meals } from '@/drizzle/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

// ─── Types ───────────────────────────────────────────────────────────────────

type AnthropicError = {
  status?: number
  error?: { type?: string }
  code?: string
  name?: string
}

type AnalysisResult = {
  dishes?: Array<{
    name: string
    portion?: string
    calories: number
    protein: number
    carbs: number
    fat: number
  }>
  total?: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  notes?: string
  notesEn?: string
  healthScore?: number
  assessment?: string
  assessmentEn?: string
}

// ─── Whitelist helper ─────────────────────────────────────────────────────────

/**
 * Returns true when whitelist mode is active AND the given Telegram user ID
 * is NOT in the allowed list.
 *
 * Whitelist is activated only when TELEGRAM_WHITELIST_ENABLED=true.
 * TELEGRAM_WHITELIST_IDS is a comma-separated list of numeric Telegram user IDs.
 *
 * Example Vercel env (Preview only):
 *   TELEGRAM_WHITELIST_ENABLED=true
 *   TELEGRAM_WHITELIST_IDS=123456789,987654321
 */
function isBlockedByWhitelist(telegramUserId: number): boolean {
  const enabled = process.env.TELEGRAM_WHITELIST_ENABLED === 'true'
  if (!enabled) return false

  const raw = process.env.TELEGRAM_WHITELIST_IDS ?? ''
  const allowed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)

  // If whitelist is enabled but empty, block everyone (safer default)
  if (allowed.length === 0) return true

  return !allowed.includes(telegramUserId)
}

/** Send a single friendly block message, then return. */
async function replyBlocked(ctx: Context): Promise<void> {
  await ctx.reply(
    '🚧 *Bot Gizku sedang dalam pengembangan.*\n\n' +
    'Saat ini hanya tester terpilih yang bisa menggunakan bot ini.\n' +
    'Pantau terus — fitur lengkap segera hadir! 🚀',
    { parse_mode: 'Markdown' },
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Get or create a telegram_user row, reset daily count if it's a new day. */
async function getOrCreateTelegramUser(ctx: Context) {
  const tgId      = ctx.from!.id
  const username  = ctx.from?.username ?? null
  const firstName = ctx.from?.first_name ?? 'Teman'
  const today     = todayISO()

  const [existing] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, BigInt(tgId)))
    .limit(1)

  if (!existing) {
    const [created] = await db
      .insert(telegramUsers)
      .values({ telegramId: BigInt(tgId), username, firstName, dailyCount: 0, lastUsedDate: today })
      .returning()
    return created
  }

  if (existing.lastUsedDate !== today) {
    const [reset] = await db
      .update(telegramUsers)
      .set({ dailyCount: 0, lastUsedDate: today, updatedAt: new Date() })
      .where(eq(telegramUsers.telegramId, BigInt(tgId)))
      .returning()
    return reset
  }

  return existing
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

/** Retry Anthropic call with exponential backoff on 529 overloaded */
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
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
    }
  }
  throw lastError
}

function formatAnalysisMessage(
  analysis: AnalysisResult,
  usage: { used: number; limit: number },
  ctaMessage: string,
): string {
  const { total, dishes, notes, healthScore, assessment } = analysis
  if (!total || !dishes) return '⚠️ Gagal membaca hasil analisa.'

  const dishLines = dishes
    .map((d) => `• *${d.name}*${d.portion ? ` (${d.portion})` : ''} — ${d.calories} kkal`)
    .join('\n')

  const scoreEmoji = !healthScore ? '' : healthScore >= 8 ? '🟢' : healthScore >= 5 ? '🟡' : '🔴'

  let msg = `🍽️ *Hasil Analisa Nutrisi*\n\n`
  msg += `${dishLines}\n\n`
  msg += `📊 *Total Nutrisi:*\n`
  msg += `🔥 Kalori: *${total.calories} kkal*\n`
  msg += `💪 Protein: *${total.protein}g*\n`
  msg += `🌾 Karbo: *${total.carbs}g*\n`
  msg += `🥑 Lemak: *${total.fat}g*\n`
  if (healthScore)  msg += `\n${scoreEmoji} *Health Score: ${healthScore}/10*\n`
  if (assessment)   msg += `\n💬 ${assessment}\n`
  if (notes)        msg += `\n📝 _${notes}_\n`
  msg += `\n📈 Analisa hari ini: *${usage.used}/${usage.limit}*\n`
  if (ctaMessage)   msg += `\n${ctaMessage}`

  return msg
}

// ─── Internal API helper ─────────────────────────────────────────────────────

async function callVerifyEndpoint(token: string, ctx: Context): Promise<
  { ok: boolean; alreadyLinked?: boolean } | { error: string; message?: string }
> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'
  const secret  = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
  const params  = new URLSearchParams({
    token,
    tgId:      String(ctx.from!.id),
    firstName: ctx.from?.first_name ?? '',
    username:  ctx.from?.username  ?? '',
  })

  const res = await fetch(`${baseUrl}/api/telegram/verify?${params}`, {
    headers: { 'x-gizku-internal-secret': secret },
  })

  return res.json()
}

// ─── Bot Factory ─────────────────────────────────────────────────────────────

export function createBot(token: string): Bot {
  const bot = new Bot(token)

  // ── Whitelist middleware ─────────────────────────────────────────────────
  // Runs before every handler. When whitelist is active (staging/dev), only
  // allowed Telegram IDs can interact. Production is unaffected.
  bot.use(async (ctx, next) => {
    if (!ctx.from) return next()
    if (isBlockedByWhitelist(ctx.from.id)) {
      // Only reply to the very first interaction to avoid spamming the user
      // on every message. We reply on 'message' updates only (not callbacks etc).
      if (ctx.message) {
        try { await replyBlocked(ctx) } catch { /* silent */ }
      }
      // Do NOT call next() — block the rest of the handler chain
      return
    }
    return next()
  })

  // ── /start ──────────────────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    try {
      // Support deep-link: /start link_AB3X9Z (from t.me/bot?start=link_AB3X9Z)
      const param = ctx.match as string | undefined
      if (param?.startsWith('link_')) {
        const linkToken = param.slice(5).toUpperCase()
        await handleLinkToken(ctx, linkToken)
        return
      }

      let welcome: string | null = null
      try { welcome = await getCfg('telegram_welcome_message') } catch {}

      await ctx.reply(
        welcome ??
          'Halo! 👋 Selamat datang di *Gizku Bot*.\n\nKirim foto makananmu dan aku akan langsung analisa kandungan gizinya! 🥗\n\n' +
          '🔗 Ingin data tersimpan otomatis? Ketik */link* untuk menghubungkan akun Gizku-mu.\n\nKetik /help untuk panduan lengkap.',
        { parse_mode: 'Markdown' },
      )

      try { await getOrCreateTelegramUser(ctx) } catch {}
    } catch (e) {
      console.error('[bot] /start handler error:', e)
      try { await ctx.reply('Selamat datang di Gizku Bot! Kirim foto makananmu. 🥗') } catch {}
    }
  })

  // ── /help ───────────────────────────────────────────────────────────────
  bot.command('help', async (ctx) => {
    try {
      let help: string | null = null
      try { help = await getCfg('telegram_help_message') } catch {}

      await ctx.reply(
        help ??
          '📖 *Panduan Gizku Bot*\n\n' +
          '📸 *Analisa Makanan* — Kirim foto makananmu\n' +
          '📊 */today* — Ringkasan nutrisi hari ini\n' +
          '🔗 */link \<token\>* — Hubungkan akun Gizku-mu\n' +
          '🔓 */unlink* — Putuskan akun Gizku\n' +
          '❓ */help* — Tampilkan panduan ini\n\n' +
          '_Gizku menggunakan AI untuk menganalisa kandungan gizi makananmu secara otomatis._',
        { parse_mode: 'Markdown' },
      )
    } catch (e) {
      console.error('[bot] /help handler error:', e)
      try { await ctx.reply('Kirim foto makananmu untuk mendapatkan analisa nutrisi!') } catch {}
    }
  })

  // ── /today ──────────────────────────────────────────────────────────────
  bot.command('today', async (ctx) => {
    try {
      let tgUser
      try { tgUser = await getOrCreateTelegramUser(ctx) } catch (dbErr) {
        console.error('[bot] /today DB error:', dbErr)
        await ctx.reply('⚠️ Gagal mengambil data. Coba lagi nanti.')
        return
      }

      if (!tgUser.userId) {
        const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? ''
        const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'
        await ctx.reply(
          '🔗 Akun Gizku-mu belum terhubung.\n\n' +
          `1. Login ke *${appUrl}/settings*\n` +
          '2. Klik *Hubungkan Telegram* untuk mendapatkan kode\n' +
          '3. Kirim */link \<kode\>* ke sini\n\n' +
          `Atau langsung klik: ${botUsername ? `t.me/${botUsername}` : 'lihat instruksi di website'}`,
          { parse_mode: 'Markdown' },
        )
        return
      }

      const today      = todayISO()
      const startOfDay = `${today}T00:00:00.000Z`
      const endOfDay   = `${today}T23:59:59.999Z`

      const todayMeals = await db
        .select()
        .from(meals)
        .where(
          and(
            eq(meals.userId, tgUser.userId),
            gte(meals.loggedAt, new Date(startOfDay)),
            lte(meals.loggedAt, new Date(endOfDay)),
          ),
        )

      if (todayMeals.length === 0) {
        await ctx.reply('📭 Belum ada makanan yang tercatat hari ini. Kirim foto makananmu! 📸')
        return
      }

      const totalCal  = todayMeals.reduce((s, m) => s + m.totalCalories, 0)
      const totalProt = todayMeals.reduce((s, m) => s + parseFloat(m.totalProtein), 0)
      const totalCarb = todayMeals.reduce((s, m) => s + parseFloat(m.totalCarbs), 0)
      const totalFat  = todayMeals.reduce((s, m) => s + parseFloat(m.totalFat), 0)

      const mealLines = todayMeals.map((m) => `• ${m.dishNames.join(', ')} — ${m.totalCalories} kkal`).join('\n')
      const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'

      const msg =
        `📊 *Ringkasan Nutrisi Hari Ini*\n\n` +
        `${mealLines}\n\n` +
        `🔥 Total Kalori: *${totalCal} kkal*\n` +
        `💪 Protein: *${totalProt.toFixed(1)}g*\n` +
        `🌾 Karbo: *${totalCarb.toFixed(1)}g*\n` +
        `🥑 Lemak: *${totalFat.toFixed(1)}g*\n\n` +
        `📱 Detail lengkap: ${appUrl}`

      await ctx.reply(msg, { parse_mode: 'Markdown' })
    } catch (e) {
      console.error('[bot] /today handler error:', e)
      try { await ctx.reply('⚠️ Gagal mengambil data. Coba lagi nanti.') } catch {}
    }
  })

  // ── /link <token> ────────────────────────────────────────────────────────
  bot.command('link', async (ctx) => {
    const param = (ctx.match as string | undefined)?.trim().toUpperCase()

    if (!param) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'
      await ctx.reply(
        '🔗 *Cara Menghubungkan Akun Gizku*\n\n' +
        `1. Login ke *${appUrl}/settings*\n` +
        '2. Klik *"Hubungkan Telegram"*\n' +
        '3. Salin kode 6 karakter yang muncul\n' +
        '4. Kirim: */link \<kode\>* ke sini\n\n' +
        '_Kode berlaku 15 menit._',
        { parse_mode: 'Markdown' },
      )
      return
    }

    await handleLinkToken(ctx, param)
  })

  // ── /unlink ──────────────────────────────────────────────────────────────
  bot.command('unlink', async (ctx) => {
    try {
      const [tgUser] = await db
        .select()
        .from(telegramUsers)
        .where(eq(telegramUsers.telegramId, BigInt(ctx.from!.id)))
        .limit(1)

      if (!tgUser || !tgUser.userId) {
        await ctx.reply('ℹ️ Akun Gizku-mu belum terhubung.')
        return
      }

      await db
        .update(telegramUsers)
        .set({ userId: null, updatedAt: new Date() })
        .where(eq(telegramUsers.telegramId, BigInt(ctx.from!.id)))

      await ctx.reply(
        '✅ Akun Gizku berhasil diputus dari Telegram.\n\n' +
        'Data analisa Telegram tidak lagi tersimpan ke akun Gizku-mu.\n' +
        'Ketik /link untuk menghubungkan kembali.',
      )
    } catch (e) {
      console.error('[bot] /unlink error:', e)
      await ctx.reply('⚠️ Gagal memutus akun. Coba lagi nanti.')
    }
  })

  // ── Photo handler ────────────────────────────────────────────────────────
  bot.on('message:photo', async (ctx) => {
    ctx.replyWithChatAction('upload_photo').catch(() => {})

    let tgUser
    try {
      tgUser = await getOrCreateTelegramUser(ctx)
    } catch (dbErr) {
      console.error('[bot] photo handler DB error:', dbErr)
      await ctx.reply('⚠️ Gagal memverifikasi pengguna. Coba lagi nanti.')
      return
    }

    // Daily limit — linked users get higher limit
    let limit = 3
    try {
      const key = tgUser.userId ? 'telegram_linked_daily_limit' : 'telegram_free_daily_limit'
      const limitRaw = await getCfg(key)
      limit = parseInt(limitRaw ?? (tgUser.userId ? '10' : '3'), 10)
    } catch {}

    if (tgUser.dailyCount >= limit) {
      let limitMsg: string | null = null
      try { limitMsg = await getCfg('telegram_limit_reached_message') } catch {}
      const msg = (limitMsg ?? '⚠️ Batas analisa harianmu sudah tercapai ({used}/{limit}).\n\n🔗 Hubungkan akun Gizku untuk kuota lebih besar!')
        .replace('{used}', String(tgUser.dailyCount))
        .replace('{limit}', String(limit))
      await ctx.reply(msg, { parse_mode: 'Markdown' })
      return
    }

    try {
      const photos   = ctx.message.photo
      const photo    = photos[photos.length - 1]
      const fileInfo = await ctx.api.getFile(photo.file_id)
      const fileUrl  = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`

      const imgRes    = await fetch(fileUrl)
      const imgBuf    = await imgRes.arrayBuffer()
      const imgBase64 = Buffer.from(imgBuf).toString('base64')
      const mimeType  = 'image/jpeg'

      let apiKey: string | null = process.env.ANTHROPIC_API_KEY ?? null
      let modelId = 'claude-sonnet-5'
      try {
        const cfgKey = await getCfg('anthropic_api_key')
        if (cfgKey) apiKey = cfgKey
        const cfgModel = await getCfg('anthropic_model')
        if (cfgModel) modelId = cfgModel
      } catch {}

      if (!apiKey) {
        console.error('[bot] ANTHROPIC_API_KEY not set')
        await ctx.reply('⚠️ Layanan AI belum dikonfigurasi. Hubungi admin.')
        return
      }

      const prompt = `Kamu adalah analis nutrisi makanan. Tugasmu HANYA menganalisa gambar yang berisi makanan atau minuman.\n\nLANGKAH PERTAMA — validasi gambar:\n- Jika gambar TIDAK mengandung makanan atau minuman sama sekali (misalnya: pemandangan, orang, hewan, benda, teks, selfie, dll), panggil tool "report_non_food_image".\n- Jika gambar MENGANDUNG makanan atau minuman, lanjutkan ke analisa nutrisi.\n\nLANGKAH KEDUA — estimasi porsi:\n- Jika ada objek pembanding ukuran di foto (piring, mangkuk, gelas, sendok/garpu, tangan, dll), gunakan itu sebagai acuan estimasi porsi dan berat makanan.\n- Jika TIDAK ada objek pembanding sama sekali, gunakan asumsi ukuran piring makan standar (±24-26cm diameter) sebagai default, dan sebutkan di field "notes" bahwa estimasi porsi bersifat asumsi karena tidak ada pembanding ukuran di foto.\n\nLANGKAH KETIGA — panggil tool report_food_analysis untuk melaporkan hasil. Isi setiap parameter tool secara terpisah dan ringkas, JANGAN menulis jawabanmu sebagai teks/JSON biasa:\n- notes dan assessment: masing-masing HANYA 1-2 kalimat natural dalam Bahasa Indonesia, tanpa format JSON atau nama parameter lain di dalamnya.\n- notesEn dan assessmentEn: terjemahan natural (bukan literal) dari notes dan assessment ke Bahasa Inggris, juga HANYA 1-2 kalimat.`

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

      const client   = new Anthropic({ apiKey })
      const response = await callWithRetry(() =>
        client.messages.create({
          model: modelId,
          max_tokens: 1024,
          temperature: 0.2,
          tools,
          tool_choice: { type: 'any', disable_parallel_tool_use: true },
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imgBase64 } },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      )

      const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      if (!toolUse) {
        await ctx.reply('⚠️ Gagal membaca respons AI. Coba kirim ulang foto.')
        return
      }

      if (toolUse.name === 'report_non_food_image') {
        const input = toolUse.input as { message?: string }
        await ctx.reply(input.message ?? 'Gambar tidak mengandung makanan. Silakan foto makananmu. 📸')
        return
      }

      const analysis = toolUse.input as AnalysisResult
      analysis.notes        = sanitizeAiText(analysis.notes)
      analysis.notesEn      = sanitizeAiText(analysis.notesEn)
      analysis.assessment   = sanitizeAiText(analysis.assessment)
      analysis.assessmentEn = sanitizeAiText(analysis.assessmentEn)

      // Increment daily count
      try {
        await db
          .update(telegramUsers)
          .set({ dailyCount: sql`${telegramUsers.dailyCount} + 1`, lastUsedDate: todayISO(), updatedAt: new Date() })
          .where(eq(telegramUsers.telegramId, BigInt(ctx.from!.id)))
      } catch (dbErr) {
        console.error('[bot] dailyCount update error:', dbErr)
      }

      const newCount = tgUser.dailyCount + 1

      // Save meal to DB with source='telegram'
      if (tgUser.userId && analysis.total && analysis.dishes) {
        try {
          await db.insert(meals).values({
            userId:        tgUser.userId,
            dishNames:     analysis.dishes.map((d) => d.name),
            totalCalories: analysis.total.calories,
            totalProtein:  String(analysis.total.protein),
            totalCarbs:    String(analysis.total.carbs),
            totalFat:      String(analysis.total.fat),
            imageUrl:      `data:${mimeType};base64,${imgBase64}`,
            rawAnalysis:   analysis,
            source:        'telegram',
          })
        } catch (dbErr) {
          console.error('[bot] meal insert error:', dbErr)
        }
      }

      let ctaMessage = ''
      if (!tgUser.userId) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'
        try {
          ctaMessage = await getCfg('telegram_after_analysis_cta') ??
            `🔗 *Simpan data & lihat riwayat lengkap di ${appUrl}*\nKetik /link untuk hubungkan akun.`
        } catch {}
      }

      const replyMsg = formatAnalysisMessage(analysis, { used: newCount, limit }, ctaMessage)
      await ctx.reply(replyMsg, { parse_mode: 'Markdown' })

    } catch (e) {
      const error = e as AnthropicError
      console.error('[bot] photo handler error:', e)
      if (error?.status === 529 || error?.error?.type === 'overloaded_error') {
        await ctx.reply('⚠️ Server AI sedang sibuk. Tunggu beberapa detik lalu kirim ulang foto.')
        return
      }
      if (error?.status === 429) {
        await ctx.reply('⚠️ Batas permintaan AI tercapai. Coba lagi dalam beberapa menit.')
        return
      }
      await ctx.reply('⚠️ Terjadi kesalahan. Coba kirim ulang foto.')
    }
  })

  // ── Fallback for non-photo, non-command messages ─────────────────────────
  bot.on('message', async (ctx) => {
    if (ctx.message?.text && !ctx.message.text.startsWith('/')) {
      await ctx.reply(
        '📸 Kirim foto makananmu untuk mendapatkan analisa nutrisi!\n\nKetik /help untuk panduan lengkap.',
      )
    }
  })

  return bot
}

// ── Link token handler (shared by /start deep-link and /link command) ──────
async function handleLinkToken(ctx: Context, token: string) {
  try {
    const tgUser = await getOrCreateTelegramUser(ctx)

    if (tgUser.userId) {
      await ctx.reply(
        '✅ Akun Gizku-mu sudah terhubung ke Telegram ini.\n\nKetik /unlink jika ingin memutus koneksi.',
      )
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'
    const secret  = process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
    const params  = new URLSearchParams({
      token,
      tgId:      String(ctx.from!.id),
      firstName: ctx.from?.first_name ?? '',
      username:  ctx.from?.username  ?? '',
    })

    const res  = await fetch(`${baseUrl}/api/telegram/verify?${params}`, {
      headers: { 'x-gizku-internal-secret': secret },
    })
    const data = await res.json() as { ok?: boolean; alreadyLinked?: boolean; error?: string; message?: string }

    if (data.ok) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'
      await ctx.reply(
        '🎉 *Akun Gizku berhasil terhubung!*\n\n' +
        '✅ Mulai sekarang, setiap foto makanan yang kamu kirim akan otomatis tersimpan ke akun Gizku-mu.\n\n' +
        `📊 Lihat riwayat nutrisi lengkap di: ${appUrl}\n\n` +
        'Ketik /today untuk melihat ringkasan hari ini.',
        { parse_mode: 'Markdown' },
      )
    } else if (data.error === 'token_invalid') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'
      await ctx.reply(
        '❌ *Kode tidak valid atau sudah kedaluwarsa.*\n\n' +
        `Minta kode baru di: *${appUrl}/settings*\n_(kode berlaku 15 menit)_`,
        { parse_mode: 'Markdown' },
      )
    } else {
      await ctx.reply('⚠️ Gagal menghubungkan akun. Coba lagi nanti.')
    }
  } catch (e) {
    console.error('[bot] handleLinkToken error:', e)
    await ctx.reply('⚠️ Gagal menghubungkan akun. Coba lagi nanti.')
  }
}
