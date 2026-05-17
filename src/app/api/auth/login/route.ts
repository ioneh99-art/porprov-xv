// src/app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth'

// ─── Rate Limiter ─────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const RATE_LIMIT = 5
const WINDOW_MS  = 15 * 60 * 1000
const BLOCK_MS   = 30 * 60 * 1000

function getRateLimitKey(req: NextRequest, username: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ??
    req.headers.get('x-real-ip') ?? 'unknown'
  return `${ip}:${username.toLowerCase()}`
}

function checkRateLimit(key: string): { blocked: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record) return { blocked: false, remaining: RATE_LIMIT, resetIn: 0 }
  if (now - record.lastAttempt > WINDOW_MS) {
    loginAttempts.delete(key)
    return { blocked: false, remaining: RATE_LIMIT, resetIn: 0 }
  }
  if (record.count >= RATE_LIMIT) {
    const resetIn = Math.ceil((record.lastAttempt + BLOCK_MS - now) / 1000 / 60)
    return { blocked: true, remaining: 0, resetIn }
  }
  return { blocked: false, remaining: RATE_LIMIT - record.count, resetIn: 0 }
}

function recordFailedAttempt(key: string) {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record || now - record.lastAttempt > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, lastAttempt: now })
  } else {
    loginAttempts.set(key, { count: record.count + 1, lastAttempt: now })
  }
}

function clearAttempts(key: string) { loginAttempts.delete(key) }

setInterval(() => {
  const now = Date.now()
  for (const [key, record] of loginAttempts.entries()) {
    if (now - record.lastAttempt > BLOCK_MS) loginAttempts.delete(key)
  }
}, 60 * 60 * 1000)

// ─── Resolve Level dari user data ─────────────────────────
function resolveUserLevel(user: {
  role: string
  kontingen_id?: number | null
}): string {
  // Superadmin selalu terpisah
  if (user.role === 'superadmin') return 'superadmin'

  // Penyelenggara klaster = Level 1
  if (user.role === 'penyelenggara') return 'level1'

  // Kontingen Level 1 berdasarkan ID (set di env)
  const lvl1Ids = (process.env.NEXT_PUBLIC_LEVEL1_KONTINGEN_IDS ?? '1')
    .split(',').map(Number).filter(Boolean)
  if (user.kontingen_id && lvl1Ids.includes(user.kontingen_id)) return 'level1'

  // Kontingen Level 2 berdasarkan ID (set di env)
  const lvl2Ids = (process.env.NEXT_PUBLIC_LEVEL2_KONTINGEN_IDS ?? '')
    .split(',').map(Number).filter(Boolean)
  if (user.kontingen_id && lvl2Ids.includes(user.kontingen_id)) return 'level2'

  // Default Level 3
  return 'level3'
}

// ─── Redirect per level ───────────────────────────────────
function getRedirectByLevel(level: string, role: string): string {
  switch (level) {
    case 'superadmin': return '/superadmin'
    case 'level1':
      // Penyelenggara → Command Center, Kontingen → War Room
      return role === 'penyelenggara'
        ? '/konida/penyelenggara'
        : '/konida/dashboard/bekasi'
    case 'level2': return '/konida/dashboard'
    case 'level3': return '/konida/dashboard/basic'
    default:       return '/login'
  }
}

// ─── POST Handler ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username dan password wajib diisi' },
      { status: 400 }
    )
  }

  // Rate limit check
  const key = getRateLimitKey(req, username)
  const { blocked, remaining, resetIn } = checkRateLimit(key)

  if (blocked) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan login. Coba lagi dalam ${resetIn} menit.` },
      { status: 429 }
    )
  }

  const user = await loginUser(username, password)

  if (!user) {
    recordFailedAttempt(key)
    const newCheck = checkRateLimit(key)
    return NextResponse.json(
      {
        error: newCheck.remaining > 0
          ? `Username atau password salah. Sisa ${newCheck.remaining} percobaan.`
          : `Akun diblokir sementara. Coba lagi dalam 30 menit.`
      },
      { status: 401 }
    )
  }

  clearAttempts(key)

  // ─── Resolve level & redirect ──────────────────────────
  const userLevel = resolveUserLevel({
    role: user.role,
    kontingen_id: user.kontingen_id,
  })

  const redirect = getRedirectByLevel(userLevel, user.role)

  // ─── Session data ──────────────────────────────────────
  const sessionData = JSON.stringify({
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    kontingen_id: user.kontingen_id,
    cabor_id: user.cabor_id,
    level: userLevel,       // ← tambahan
  })

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 8,   // 8 jam
    path: '/',
  }

  const res = NextResponse.json({ ok: true, redirect, level: userLevel })

  // Cookie 1: session (existing, tidak berubah)
  res.cookies.set('porprov_session', sessionData, cookieOpts)

  // Cookie 2: user_level — BARU, dibaca oleh middleware
  res.cookies.set('user_level', userLevel, cookieOpts)

  return res
}