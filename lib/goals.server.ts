import { db } from '@/lib/db'
import { userGoals } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { macroGramsFromKcal, type GoalsConfig } from '@/lib/goalsConfig'

export type ResolvedGoal = {
  kcal: number; protein: number; carbs: number; fat: number
  source: 'user' | 'default'; macroSource: 'user' | 'default'
}

export const isPremiumNow = (premiumUntil: Date | string | null | undefined) =>
  !!premiumUntil && new Date(premiumUntil).getTime() > Date.now()

/** Target harian user; belum set → default config. Makro null → pembagian default dari kalori. */
export async function resolveGoal(userId: string, cfg: GoalsConfig): Promise<ResolvedGoal> {
  const [row] = await db.select().from(userGoals).where(eq(userGoals.userId, userId)).limit(1)
  const kcal = row?.kcal ?? cfg.target.defaultKcal
  const customMacro = row && row.proteinG !== null && row.carbsG !== null && row.fatG !== null
  const grams = customMacro
    ? { protein: row.proteinG as number, carbs: row.carbsG as number, fat: row.fatG as number }
    : macroGramsFromKcal(kcal, cfg.macroDefault)
  return { kcal, ...grams, source: row ? 'user' : 'default', macroSource: customMacro ? 'user' : 'default' }
}
