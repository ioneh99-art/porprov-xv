// middleware.ts — PORPROV XV Level-Aware Route Guard
// Pure Next.js — zero external imports
// src/middleware.ts

import { NextRequest, NextResponse } from 'next/server'

// ─── Route Rules per Level ────────────────────────────────
const ROUTE_LEVEL_MAP: { pattern: RegExp; allowed: string[] }[] = [
  { pattern: /^\/superadmin/,                            allowed: ['superadmin'] },
  { pattern: /^\/konida\/dashboard\/bekasi/,             allowed: ['superadmin', 'level1'] },
  { pattern: /^\/konida\/penyelenggara/,                 allowed: ['superadmin', 'level1'] },
  { pattern: /^\/konida\/sipa/,                          allowed: ['superadmin', 'level1'] },
  { pattern: /^\/konida\/laporan/,                       allowed: ['superadmin', 'level1', 'level2'] },
  { pattern: /^\/konida\/kualifikasi/,                   allowed: ['superadmin', 'level1', 'level2'] },
  { pattern: /^\/konida\/dashboard(?!\/(bekasi|basic))/, allowed: ['superadmin', 'level1', 'level2'] },
  { pattern: /^\/konida\/atlet/,                         allowed: ['superadmin', 'level1', 'level2', 'level3'] },
  { pattern: /^\/konida\/kejuaraan/,                     allowed: ['superadmin', 'level1', 'level2', 'level3'] },
  { pattern: /^\/konida\/dashboard\/basic/,              allowed: ['superadmin', 'level1', 'level2', 'level3'] },
  { pattern: /^\/konida\/profil/,                        allowed: ['superadmin', 'level1', 'level2', 'level3'] },
]

function getDefaultRedirect(level: string): string {
  switch (level) {
    case 'superadmin': return '/superadmin'
    case 'level1':     return '/konida/dashboard/bekasi'
    case 'level2':     return '/konida/dashboard'
    case 'level3':     return '/konida/dashboard/basic'
    default:           return '/login'
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip static, API, login, public
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/public') ||
    pathname === '/' ||
    pathname.includes('.')
  ) return NextResponse.next()

  // Cek session & level dari cookie yang di-set saat login
  const session   = req.cookies.get('porprov_session')?.value
  const userLevel = req.cookies.get('user_level')?.value ?? 'level3'

  if (!session) {
    const url = new URL('/login', req.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect /konida root ke dashboard yang tepat
  if (pathname === '/konida' || pathname === '/konida/') {
    return NextResponse.redirect(new URL(getDefaultRedirect(userLevel), req.url))
  }

  // Cek akses route berdasarkan level
  const matched = ROUTE_LEVEL_MAP.find(r => r.pattern.test(pathname))
  if (matched && !matched.allowed.includes(userLevel)) {
    const url = new URL(getDefaultRedirect(userLevel), req.url)
    url.searchParams.set('blocked', '1')
    return NextResponse.redirect(url)
  }

  // Inject level ke header untuk server components
  const headers = new Headers(req.headers)
  headers.set('x-user-level', userLevel)

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/konida/:path*', '/superadmin/:path*'],
}