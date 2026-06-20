import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { meals } from '@/drizzle/schema'
import { verifyToken } from '@/lib/auth'
import { ok, err, setCors } from '@/lib/utils'
import { eq, desc } from 'drizzle-orm'

export async function OPTIONS() {
  const h = new Headers(); setCors(h)
  return new Response(null, { status: 204, headers: h })
}

async function requireAdmin(req: NextRequest) {
  // Baca token dari cookie (browser session) atau Authorization header (fallback)
  const cookieToken =
    req.cookies.get('nl_admin_token')?.value ??
    req.cookies.get('admin_token')?.value ??
    ''

  const authHeader = req.headers.get('Authorization') ?? ''
  const raw = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

  if (!raw) return null
  try {
    const p = await verifyToken(raw)
    if (p?.role !== 'admin') return null
    return p as { userId?: string; username?: string; role: string }
  } catch { return null }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdmin(req)
  if (!admin) return err('Unauthorized', 401)

  const { userId } = await params
  if (!userId) return err('userId diperlukan', 400)

  const list = await db
    .select({
      id:            meals.id,
      dishNames:     meals.dishNames,
      totalCalories: meals.totalCalories,
      totalProtein:  meals.totalProtein,
      totalCarbs:    meals.totalCarbs,
      totalFat:      meals.totalFat,
      imageUrl:      meals.imageUrl,
      loggedAt:      meals.loggedAt,
      source:        meals.source,
      rawAnalysis:   meals.rawAnalysis,
    })
    .from(meals)
    .where(eq(meals.userId, userId))
    .orderBy(desc(meals.loggedAt))
    .limit(100)

  return ok({ meals: list, total: list.length })
}
