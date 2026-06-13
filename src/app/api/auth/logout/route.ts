// src/app/api/auth/logout/route.ts
// Fix: naming convention lengkap + enterprise tenants

import { NextRequest, NextResponse } from 'next/server'

// Map tenant slug → halaman login
// Enterprise → /login/[tenant]
// Standard   → /login (generic)
const LOGIN_PAGES: Record<string, string> = {
  // ── Enterprise (punya login page custom) ──
  kabbogor:         '/konida/login/kabbogor',
  kotabekasi:       '/konida/login/kotabekasi',
  kabbekasi:        '/konida/login/kabbekasi',
  kotabandung:      '/konida/login/kotabandung',
  kabbandung:       '/konida/login/kabbandung',
  kotadepok:        '/konida/login/kotadepok',
  kotabogor:        '/konida/login/kotabogor',
  kabkarawang:      '/konida/login/kabkarawang',
  kabbandungbarat:  '/konida/login/kabbandungbarat',
  kotacirebon:      '/konida/login/kotacirebon',
  // ── Admin ──
  superadmin:       '/login/superadmin',
  // ── Backward compat (slug lama) ──
  bekasi:           '/konida/login/kotabekasi',
  bogor:            '/konida/login/kotabogor',
  depok:            '/konida/login/kotadepok',
  // ── Default ──
  jabar:            '/login',
  konida:           '/login',
  koni_jabar:       '/login',
}

function getLoginPath(origin: string): string {
  // Cek exact match dulu
  if (LOGIN_PAGES[origin]) return LOGIN_PAGES[origin]
  // Kalau ada /login/[origin] tapi tidak ada di map → coba generic
  return '/login'
}

const clearCookie = (res: NextResponse, name: string, httpOnly = false) => {
  res.cookies.set(name, '', {
    path: '/', expires: new Date(0),
    httpOnly, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function POST(req: NextRequest) {
  const origin    = req.cookies.get('login_origin')?.value ?? 'jabar'
  const loginPath = getLoginPath(origin)

  const res = NextResponse.json({ ok: true, redirect: loginPath })

  // Hapus session cookies
  clearCookie(res, 'porprov_session', true)
  clearCookie(res, 'user_level')
  clearCookie(res, 'tenant_id')

  // Pertahankan login_origin 30 hari untuk branding login page
  res.cookies.set('login_origin', origin, {
    path: '/', maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return res
}

export async function GET(req: NextRequest) {
  const origin    = req.cookies.get('login_origin')?.value ?? 'jabar'
  const loginPath = getLoginPath(origin)
  const res       = NextResponse.redirect(new URL(loginPath, req.url))

  clearCookie(res, 'porprov_session', true)
  clearCookie(res, 'user_level')
  clearCookie(res, 'tenant_id')

  res.cookies.set('login_origin', origin, {
    path: '/', maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return res
}