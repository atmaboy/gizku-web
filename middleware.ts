import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-change-in-production-32ch'
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-App-Version,X-App-Platform,X-App-Build',
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Handle CORS preflight globally for all /api/* routes ─────────────────
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // ── Admin routes ─────────────────────────────────────────────────────────
  if (pathname === '/admin/login') return NextResponse.next()

  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get('nl_admin_token')?.value
    if (!token) return NextResponse.redirect(new URL('/admin/login', req.url))
    try {
      const { payload } = await jwtVerify(token, secret)
      if (payload.role !== 'admin') throw new Error()
    } catch {
      const res = NextResponse.redirect(new URL('/admin/login', req.url))
      res.cookies.delete('nl_admin_token')
      return res
    }
    return NextResponse.next()
  }

  // ── Halaman /maintenance jangan di-loop ───────────────────────────────────
  if (pathname === '/maintenance') return NextResponse.next()

  // ── Untuk halaman user: cek header x-maintenance yang di-set API ─────────
  const maintenanceCookie = req.cookies.get('nl_maintenance')?.value
  const isPageRoute = !pathname.startsWith('/api/')

  if (isPageRoute && maintenanceCookie === '1') {
    if (pathname !== '/maintenance') {
      return NextResponse.redirect(new URL('/maintenance', req.url))
    }
  }

  // ── Inject CORS headers on all /api/* responses ───────────────────────────
  if (pathname.startsWith('/api/')) {
    const res = NextResponse.next()
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
    '/main/:path*',
    '/maintenance',
    '/api/:path*',
  ],
}
