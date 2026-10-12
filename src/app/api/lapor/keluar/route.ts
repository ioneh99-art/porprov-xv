// src/app/api/lapor/keluar/route.ts
import { NextResponse } from 'next/server'
import { COOKIE_SESI, COOKIE_SIG } from '@/lib/lapor-sesi'

export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESI, '', { path: '/', maxAge: 0 })
  res.cookies.set(COOKIE_SIG, '', { path: '/', maxAge: 0 })
  return res
}
