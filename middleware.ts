// src/middleware.ts — FINAL
// Handle: superadmin, koni_jabar, level1, level2, level3, operator_cabor

import { NextRequest, NextResponse } from 'next/server'

const ROUTE_RULES: { pattern: RegExp; allowed: string[] }[] = [
  // Superadmin only
  { pattern: /^\/superadmin/,                            allowed: ['superadmin'] },

  // KONI Jabar + Superadmin (executive view)
  { pattern: /^\/konida\/dashboard\/jabar/,              allowed: ['superadmin', 'koni_jabar'] },
  // Tambahkan rule ini:
  { pattern: /^\/dashboard/,                             allowed: ['superadmin', 'koni_jabar'] },

  // Level 1 + Superadmin + KONI Jabar
  { pattern: /^\/konida\/dashboard\/bekasi/,             allowed: ['superadmin', 'koni_jabar', 'level1'] },
  { pattern: /^\/konida\/penyelenggara/,                 allowed: ['superadmin', 'koni_jabar', 'level1'] },
  { pattern: /^\/konida\/sipa/,                          allowed: ['superadmin', 'koni_jabar', 'level1'] },

  // Level 1 + 2 + KONI Jabar + Superadmin
  { pattern: /^\/konida\/laporan/,                       allowed: ['superadmin', 'koni_jabar', 'level1', 'level2'] },
  { pattern: /^\/konida\/kualifikasi/,                   allowed: ['superadmin', 'koni_jabar', 'level1', 'level2'] },
  { pattern: /^\/konida\/dashboard(?!\/(bekasi|jabar|basic))/, allowed: ['superadmin', 'koni_jabar', 'level1', 'level2'] },

  // Semua level
  { pattern: /^\/konida\/atlet/,                         allowed: ['superadmin', 'koni_jabar', 'level1', 'level2', 'level3'] },
  { pattern: /^\/konida\/kejuaraan/,                     allowed: ['superadmin', 'koni_jabar', 'level1', 'level2', 'level3'] },
  { pattern: /^\/konida\/dashboard\/basic/,              allowed: ['superadmin', 'koni_jabar', 'level1', 'level2', 'level3'] },
  { pattern: /^\/konida\/profil/,                        allowed: ['superadmin', 'koni_jabar', 'level1', 'level2', 'level3'] },
]

function getDefaultRedirect(level: string): string {
  switch (level) {
    case 'superadmin': return '/superadmin'
    case 'koni_jabar': return '/konida/dashboard'
    case 'level1':     return '/konida/dashboard/bekasi'
    case 'level2':     return '/konida/dashboard/bogor'
    case 'level3':     return '/konida/dashboard/basic'
    default:           return '/konida/dashboard/basic'
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/public') ||
    pathname === '/' ||
    pathname.includes('.')
  ) return NextResponse.next()

  // Cek session
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

  // Cek akses route
  const matched = ROUTE_RULES.find(r => r.pattern.test(pathname))
  if (matched && !matched.allowed.includes(userLevel)) {
    const url = new URL(getDefaultRedirect(userLevel), req.url)
    url.searchParams.set('blocked', '1')
    return NextResponse.redirect(url)
  }

  // Inject level ke header
  const headers = new Headers(req.headers)
  headers.set('x-user-level', userLevel)

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/konida/:path*', '/superadmin/:path*'],
}

