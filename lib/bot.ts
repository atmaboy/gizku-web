/**
 * lib/bot.ts
 * Core Telegram bot logic using grammY.
 * Handles: /start, /help, /today, /link, photo messages.
 * Called from app/api/telegram/webhook/route.ts
 */

import { Bot, Context, InputFile } from 'grammy'
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
  error?: string
  message?: string
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
  healthScore?: number
  assessment?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

/** Get or create a telegram_user row, reset daily count if it's a new day */
async function getOrCreateTelegramUser(ctx: Context) {
  const tgId     = ctx.from!.id
  const username = ctx.from?.username ?? null
  const firstName= ctx.from?.first_name ?? 'Teman'
  const today    = todayISO()

  const [existing] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramId, BigInt(tgId)))
    .limit(1)

  if (!existing) {
    const [created] = await db
      .insert(telegramUsers)
      .values({
        telegramId:    BigInt(tgId),
        username,
        firstName,
        dailyCount:    0,
        lastUsedDate:  today,
      })
      .returning()
    return created
  }

  // Reset daily count if last_used_date is not today
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
      const isOverloaded =
        lastError?.status === 529 ||
        lastError?.error?.type === 'overloaded_error'
      if (!isOverloaded || attempt === maxRetries) throw e
      const delay = Math.pow(2, attempt) * 1000
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

/** Format analysis result into a readable Telegram message */
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

  const scoreEmoji = !healthScore ? '' :
    healthScore >= 8 ? '🟢' : healthScore >= 5 ? '🟡' : '🔴'

  let msg = `🍽️ *Hasil Analisa Nutrisi*\n\n`
  msg += `${dishLines}\n\n`
  msg += `📊 *Total Nutrisi:*\n`
  msg += `🔥 Kalori: *${total.calories} kkal*\n`
  msg += `💪 Protein: *${total.protein}g*\n`
  msg += `🌾 Karbo: *${total.carbs}g*\n`
  msg += `🥑 Lemak: *${total.fat}g*\n`

  if (healthScore) {
    msg += `\n${scoreEmoji} *Health Score: ${healthScore}/10*\n`
  }
  if (assessment) {
    msg += `\n💬 ${assessment}\n`
  }
  if (notes) {
    msg += `\n📝 _${notes}_\n`
  }

  msg += `\n📈 Analisa hari ini: *${usage.used}/${usage.limit}*\n`

  if (ctaMessage) {
    msg += `\n${ctaMessage}`
  }

  return msg
}

// ─── Bot Factory ─────────────────────────────────────────────────────────────

export function createBot(token: string): Bot {
  const bot = new Bot(token)

  // ── /start ──────────────────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    await getOrCreateTelegramUser(ctx)
    const welcome = await getCfg('telegram_welcome_message')
    await ctx.reply(
      welcome ?? 'Selamat datang di Gizku Bot! Kirim foto makananmu untuk dianalisa. 🥗',
      { parse_mode: 'Markdown' },
    )
  })

  // ── /help ───────────────────────────────────────────────────────────────
  bot.command('help', async (ctx) => {
    const help = await getCfg('telegram_help_message')
    await ctx.reply(
      help ?? 'Kirim foto makananmu dan aku akan analisa kandungan gizinya!',
      { parse_mode: 'Markdown' },
    )
  })

  // ── /today ──────────────────────────────────────────────────────────────
  bot.command('today', async (ctx) => {
    const tgUser = await getOrCreateTelegramUser(ctx)

    if (!tgUser.userId) {
      await ctx.reply(
        '🔗 Hubungkan akun Gizku-mu terlebih dahulu dengan /link untuk melihat ringkasan harian.',
        { parse_mode: 'Markdown' },
      )
      return
    }

    const today     = todayISO()
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

    const mealLines = todayMeals
      .map((m) => `• ${m.dishNames.join(', ')} — ${m.totalCalories} kkal`)
      .join('\n')

    const msg =
      `📊 *Ringkasan Nutrisi Hari Ini*\n\n` +
      `${mealLines}\n\n` +
      `🔥 Total Kalori: *${totalCal} kkal*\n` +
      `💪 Protein: *${totalProt.toFixed(1)}g*\n` +
      `🌾 Karbo: *${totalCarb.toFixed(1)}g*\n` +
      `🥑 Lemak: *${totalFat.toFixed(1)}g*`

    await ctx.reply(msg, { parse_mode: 'Markdown' })
  })

  // ── /link ───────────────────────────────────────────────────────────────
  bot.command('link', async (ctx) => {
    await ctx.reply(
      '🔗 Untuk menghubungkan akun Gizku-mu, kunjungi:\nhttps://gizku.com/settings\n\nLogin lalu salin kode link-mu dan kirim ke sini.',
      { parse_mode: 'Markdown' },
    )
  })

  // ── Photo handler ────────────────────────────────────────────────────────
  bot.on('message:photo', async (ctx) => {
    const tgUser = await getOrCreateTelegramUser(ctx)

    // Get free daily limit from config
    const limitRaw = await getCfg('telegram_free_daily_limit')
    const limit    = parseInt(limitRaw ?? '3', 10)

    // Check limit
    if (tgUser.dailyCount >= limit) {
      const limitMsg = await getCfg('telegram_limit_reached_message')
      const msg = (limitMsg ?? '⚠️ Batas analisa harianmu sudah tercapai ({used}/{limit}).')
        .replace('{used}', String(tgUser.dailyCount))
        .replace('{limit}', String(limit))
      await ctx.reply(msg, { parse_mode: 'Markdown' })
      return
    }

    // Send typing indicator
    await ctx.replyWithChatAction('typing')

    try {
      // Get highest resolution photo
      const photos  = ctx.message.photo
      const photo   = photos[photos.length - 1]
      const fileInfo= await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`

      // Download image
      const imgRes   = await fetch(fileUrl)
      const imgBuf   = await imgRes.arrayBuffer()
      const imgBase64= Buffer.from(imgBuf).toString('base64')
      const mimeType = 'image/jpeg'

      // Get Anthropic config
      const apiKey = await getCfg('anthropic_api_key') || process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        await ctx.reply('⚠️ Layanan AI belum dikonfigurasi. Hubungi admin.')
        return
      }
      const modelId = await getCfg('anthropic_model') || 'claude-sonnet-4-6'

      // Same prompt as analyze/route.ts
      const prompt = `Kamu adalah analis nutrisi makanan. Tugasmu HANYA menganalisa gambar yang berisi makanan atau minuman.

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

      // Call Anthropic
      const client   = new Anthropic({ apiKey })
      const response = await callWithRetry(() =>
        client.messages.create({
          model: modelId,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mimeType, data: imgBase64 },
              },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      )

      const text      = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        await ctx.reply('⚠️ Gagal membaca respons AI. Coba kirim ulang foto.')
        return
      }

      const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult

      if (analysis.error === 'non_food') {
        await ctx.reply(
          analysis.message ?? 'Gambar tidak mengandung makanan. Silakan foto makananmu. 📸',
        )
        return
      }

      // Increment daily count
      await db
        .update(telegramUsers)
        .set({
          dailyCount: sql`${telegramUsers.dailyCount} + 1`,
          lastUsedDate: todayISO(),
          updatedAt: new Date(),
        })
        .where(eq(telegramUsers.telegramId, BigInt(ctx.from!.id)))

      const newCount = tgUser.dailyCount + 1

      // Save meal to DB if user has a linked gizku account
      if (tgUser.userId && analysis.total && analysis.dishes) {
        await db.insert(meals).values({
          userId:        tgUser.userId,
          dishNames:     analysis.dishes.map((d) => d.name),
          totalCalories: analysis.total.calories,
          totalProtein:  String(analysis.total.protein),
          totalCarbs:    String(analysis.total.carbs),
          totalFat:      String(analysis.total.fat),
          rawAnalysis:   analysis,
        })
      }

      // Build CTA message
      let ctaMessage = ''
      if (!tgUser.userId) {
        ctaMessage = await getCfg('telegram_after_analysis_cta') ?? ''
      }

      const replyMsg = formatAnalysisMessage(
        analysis,
        { used: newCount, limit },
        ctaMessage,
      )

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

  // ── Fallback for non-photo messages ─────────────────────────────────────
  bot.on('message', async (ctx) => {
    if (ctx.message?.text && !ctx.message.text.startsWith('/')) {
      await ctx.reply(
        '📸 Kirim foto makananmu untuk mendapatkan analisa nutrisi!\n\nKetik /help untuk panduan lengkap.',
      )
    }
  })

  return bot
}
