// src/app/api/auth/login/route.ts
// FIXED: resolveLevel sekarang prioritaskan kolom 'level' dari DB dulu
// baru fallback ke env vars

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
function checkRateLimit(key: string) {
  const now = Date.now()
  const r = loginAttempts.get(key)
  if (!r) return { blocked: false, remaining: RATE_LIMIT, resetIn: 0 }
  if (now - r.lastAttempt > WINDOW_MS) { loginAttempts.delete(key); return { blocked: false, remaining: RATE_LIMIT, resetIn: 0 } }
  if (r.count >= RATE_LIMIT) return { blocked: true, remaining: 0, resetIn: Math.ceil((r.lastAttempt + BLOCK_MS - now) / 60000) }
  return { blocked: false, remaining: RATE_LIMIT - r.count, resetIn: 0 }
}
function recordFail(key: string) {
  const now = Date.now(); const r = loginAttempts.get(key)
  if (!r || now - r.lastAttempt > WINDOW_MS) loginAttempts.set(key, { count: 1, lastAttempt: now })
  else loginAttempts.set(key, { count: r.count + 1, lastAttempt: now })
}
function clearAttempts(key: string) { loginAttempts.delete(key) }
setInterval(() => {
  const now = Date.now()
  for (const [k, r] of loginAttempts.entries()) {
    if (now - r.lastAttempt > BLOCK_MS) loginAttempts.delete(k)
  }
}, 60 * 60 * 1000)

// ─── Resolve Level ────────────────────────────────────────
// Prioritas: 1) kolom level di DB, 2) env vars, 3) default level3
function resolveLevel(user: {
  role: string
  level?: string | null
  kontingen_id?: number | null
}): string {

  // 1. Superadmin selalu superadmin
  if (user.role === 'superadmin') return 'superadmin'

  // 2. Kolom level sudah terisi di DB → pakai langsung
  if (user.level && ['superadmin','level1','level2','level3'].includes(user.level)) {
    return user.level
  }

  // 3. Role penyelenggara → level1
  if (user.role === 'penyelenggara') return 'level1'

  // 4. Cek dari env vars (NEXT_PUBLIC_LEVEL1_KONTINGEN_IDS)
  if (user.kontingen_id) {
    const lvl1Ids = (process.env.NEXT_PUBLIC_LEVEL1_KONTINGEN_IDS ?? '')
      .split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))

    const lvl2Ids = (process.env.NEXT_PUBLIC_LEVEL2_KONTINGEN_IDS ?? '')
      .split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))

    if (lvl1Ids.includes(user.kontingen_id)) return 'level1'
    if (lvl2Ids.includes(user.kontingen_id)) return 'level2'
  }

  // 5. Default
  return 'level3'
}

// ─── Redirect per level ───────────────────────────────────
function getRedirect(level: string, role: string): string {
  switch (level) {
    case 'superadmin': return '/superadmin'
    case 'level1':
      return role === 'penyelenggara'
        ? '/konida/penyelenggara'
        : '/konida/dashboard/bekasi'
    case 'level2': return '/konida/dashboard'
    case 'level3': return '/konida/dashboard/basic'
    default:        return '/konida/dashboard/basic'
  }
}

// ─── Login origin untuk logout redirect ───────────────────
function resolveLoginOrigin(level: string, kontingenId?: number | null): string {
  if (level === 'superadmin') return 'superadmin'

  // Cek apakah kontingen Bekasi (Level 1 IDs)
  if (kontingenId) {
    const bekasiIds = (process.env.NEXT_PUBLIC_LEVEL1_KONTINGEN_IDS ?? '')
      .split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    if (bekasiIds.includes(kontingenId)) return 'bekasi'

    const jabarId = parseInt(process.env.NEXT_PUBLIC_JABAR_KONTINGEN_ID ?? '0')
    if (jabarId && kontingenId === jabarId) return 'jabar'
  }

  return 'konida'
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

  const key = getRateLimitKey(req, username)
  const { blocked, remaining, resetIn } = checkRateLimit(key)
  if (blocked) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${resetIn} menit.` },
      { status: 429 }
    )
  }

  const user = await loginUser(username, password)

  if (!user) {
    recordFail(key)
    const check = checkRateLimit(key)
    return NextResponse.json({
      error: check.remaining > 0
        ? `Username atau password salah. Sisa ${check.remaining} percobaan.`
        : 'Akun diblokir sementara. Coba lagi dalam 30 menit.',
    }, { status: 401 })
  }

  clearAttempts(key)

  // ── Resolve level — prioritas kolom DB dulu ──────────────
  const userLevel = resolveLevel({
    role:          user.role,
    level:         user.level,         // kolom level dari DB
    kontingen_id:  user.kontingen_id,
  })

  const loginOrigin = resolveLoginOrigin(userLevel, user.kontingen_id)
  const redirect    = getRedirect(userLevel, user.role)

  // Dev log — hapus di production kalau mau
  if (process.env.NODE_ENV === 'development') {
    console.log('[login]', {
      username: user.username,
      role: user.role,
      level_db: user.level,
      kontingen_id: user.kontingen_id,
      resolved_level: userLevel,
      redirect,
    })
  }

  const sessionData = JSON.stringify({
    id:           user.id,
    username:     user.username,
    nama:         user.nama,
    role:         user.role,
    kontingen_id: user.kontingen_id,
    cabor_id:     user.cabor_id,
    level:        userLevel,
  })

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 8,
    path: '/',
  }

  const res = NextResponse.json({ ok: true, redirect, level: userLevel })

  res.cookies.set('porprov_session', sessionData, cookieOpts)
  res.cookies.set('user_level', userLevel, cookieOpts)
  res.cookies.set('login_origin', loginOrigin, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return res
}