import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/register']
const API_PUBLIC = ['/api/auth', '/api/register', '/api/hospitals/public']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public API routes
  if (API_PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()

  // Allow public pages
  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next()

  // Protect /dashboard and /api routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Role-based route protection
    const role = (token as any).role

    if (pathname.startsWith('/dashboard/staff') && role !== 'hospital_admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    if (pathname.startsWith('/dashboard/analytics') && !['hospital_admin', 'doctor'].includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
