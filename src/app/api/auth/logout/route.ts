// src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server'

const LOGIN_PAGES: Record<string, string> = {
  bekasi:     '/login/bekasi',
  bogor:      '/login/bogor',
  depok:      '/login/depok',
  superadmin: '/login/superadmin',
  jabar:      '/login',      // ← /login bukan /login/jabar
  konida:     '/login',
  koni_jabar: '/login',
}

export async function POST(req: NextRequest) {
  const origin    = req.cookies.get('login_origin')?.value ?? 'jabar'
  const loginPath = LOGIN_PAGES[origin] ?? '/login'

  const res = NextResponse.json({ ok: true, redirect: loginPath })

  const expired = {
    path: '/', expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }

  res.cookies.set('porprov_session', '', expired)
  res.cookies.set('user_level',      '', expired)
  // Hapus tenant_id — supaya /login tidak baca branding lama
  res.cookies.set('tenant_id', '', {
    path: '/', expires: new Date(0),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  // Pertahankan login_origin 30 hari
  res.cookies.set('login_origin', origin, {
    path: '/', maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return res
}

export async function GET(req: NextRequest) {
  const origin    = req.cookies.get('login_origin')?.value ?? 'jabar'
  const loginPath = LOGIN_PAGES[origin] ?? '/login'
  const res = NextResponse.redirect(new URL(loginPath, req.url))
  res.cookies.set('porprov_session', '', { path:'/', expires:new Date(0), httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax' })
  res.cookies.set('user_level',      '', { path:'/', expires:new Date(0), httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax' })
  res.cookies.set('tenant_id',       '', { path:'/', expires:new Date(0), sameSite:'lax', secure:process.env.NODE_ENV==='production' })
  res.cookies.set('login_origin', origin, { path:'/', maxAge:60*60*24*30, sameSite:'lax', secure:process.env.NODE_ENV==='production' })
  return res
}