// src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server'

const LOGIN_PAGES: Record<string, string> = {
  bekasi:     '/login/bekasi',
  bogor:      '/login/bogor',
  depok:      '/login/depok',
  superadmin: '/login/superadmin',
  jabar:      '/login/jabar',
  konida:     '/login/jabar',
}

export async function POST(req: NextRequest) {
  // Baca login_origin dari cookie — di-set saat login
  const origin    = req.cookies.get('login_origin')?.value ?? 'konida'
  const loginPath = LOGIN_PAGES[origin] ?? '/login/jabar'

  const res = NextResponse.json({ ok: true, redirect: loginPath })

  const expired = {
    path:     '/',
    expires:  new Date(0),
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }

  // Hapus session cookies
  res.cookies.set('porprov_session', '', expired)
  res.cookies.set('user_level', '', expired)

  // Pertahankan login_origin 30 hari (tidak httpOnly agar bisa dibaca client)
  res.cookies.set('login_origin', origin, {
    path:    '/',
    maxAge:  60 * 60 * 24 * 30,
    sameSite:'lax',
    secure:  process.env.NODE_ENV === 'production',
  })

  return res
}

// Support GET juga (kalau ada Link href ke /api/auth/logout)
export async function GET(req: NextRequest) {
  const origin    = req.cookies.get('login_origin')?.value ?? 'konida'
  const loginPath = LOGIN_PAGES[origin] ?? '/login/jabar'

  const res = NextResponse.redirect(new URL(loginPath, req.url))

  res.cookies.set('porprov_session', '', {
    path: '/', expires: new Date(0), httpOnly: true,
    secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
  })
  res.cookies.set('user_level', '', {
    path: '/', expires: new Date(0), httpOnly: true,
    secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
  })
  res.cookies.set('login_origin', origin, {
    path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return res
}