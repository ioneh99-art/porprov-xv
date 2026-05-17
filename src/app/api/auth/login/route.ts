// src/app/api/auth/login/route.ts — FINAL FIXED

import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth'

// ─── Rate Limiter ─────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const RATE_LIMIT = 5
const WINDOW_MS  = 15 * 60 * 1000
const BLOCK_MS   = 30 * 60 * 1000

function getRateLimitKey(req: NextRequest, username: string) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  return `${ip}:${username.toLowerCase()}`
}
function checkRateLimit(key: string) {
  const now = Date.now(); const r = loginAttempts.get(key)
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
function resolveLevel(user: {
  role: string
  level?: string | null
  kontingen_id?: number | null
}): string {
  if (user.role === 'superadmin') return 'superadmin'
  if (user.role === 'koni_jabar') return 'koni_jabar'
  if (user.level && ['superadmin','koni_jabar','level1','level2','level3'].includes(user.level)) {
    return user.level
  }
  if (user.role === 'penyelenggara') return 'level1'
  if (user.kontingen_id) {
    const l1 = (process.env.NEXT_PUBLIC_LEVEL1_KONTINGEN_IDS ?? '23').split(',').map(Number).filter(Boolean)
    const l2 = (process.env.NEXT_PUBLIC_LEVEL2_KONTINGEN_IDS ?? '19,24').split(',').map(Number).filter(Boolean)
    if (l1.includes(user.kontingen_id)) return 'level1'
    if (l2.includes(user.kontingen_id)) return 'level2'
  }
  return 'level3'
}

// ─── Redirect per level ───────────────────────────────────
function getRedirect(level: string, role: string): string {
  switch (level) {
    case 'superadmin': return '/superadmin'
    case 'koni_jabar': return '/dashboard'
    case 'level1':     return role === 'penyelenggara' ? '/konida/penyelenggara' : '/konida/dashboard/bekasi'
    case 'level2':     return '/konida/dashboard'          // ← FIX: bukan /konida/dashboard/bogor
    case 'level3':     return '/konida/dashboard/basic'
    default:           return '/konida/dashboard/basic'
  }
}

// ─── Login origin → untuk redirect logout ke login yang benar ───
// Ini menentukan tampilan /login page setelah logout
function resolveLoginOrigin(level: string, kontingenId?: number | null): string {
  if (level === 'superadmin') return 'superadmin'
  if (level === 'koni_jabar') return 'jabar'

  if (kontingenId) {
    // Bekasi = 23 → login/bekasi
    if (kontingenId === 23) return 'bekasi'
    // Bogor = 19 → login/bogor (ada foldernya)
    if (kontingenId === 19) return 'bogor'
    // Depok = 24 → login/depok (ada foldernya)
    if (kontingenId === 24) return 'depok'
  }

  // Semua lainnya → /login (LoginJabar default)
  return 'jabar'
}

// ─── Tenant ID untuk sidebar branding ─────────────────────
// useTenant di sidebar baca ini untuk tampilan warna/logo
function resolveTenantId(kontingenId?: number | null, role?: string): string {
  if (role === 'superadmin' || role === 'koni_jabar') return 'jabar'
  if (kontingenId === 23) return 'bekasi'
  if (kontingenId === 19) return 'bogor'
  if (kontingenId === 24) return 'depok'
  return 'jabar'
}

// ─── POST ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
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

  const userLevel   = resolveLevel({ role: user.role, level: user.level, kontingen_id: user.kontingen_id })
  const loginOrigin = resolveLoginOrigin(userLevel, user.kontingen_id)
  const tenantId    = resolveTenantId(user.kontingen_id, user.role)
  const redirect    = getRedirect(userLevel, user.role)

  if (process.env.NODE_ENV === 'development') {
    console.log('[login]', {
      username: user.username, role: user.role,
      level_db: user.level, kontingen_id: user.kontingen_id,
      resolved_level: userLevel, redirect,
      login_origin: loginOrigin, tenant_id: tenantId,
    })
  }

  const sessionData = JSON.stringify({
    id: user.id, username: user.username, nama: user.nama,
    role: user.role, kontingen_id: user.kontingen_id,
    cabor_id: user.cabor_id, level: userLevel,
  })

  const secure   = process.env.NODE_ENV === 'production'
  const httpOnly = { httpOnly: true, secure, sameSite: 'lax' as const, maxAge: 60*60*8, path: '/' }
  const client   = { secure, sameSite: 'lax' as const, maxAge: 60*60*8, path: '/' }
  const persist  = { secure, sameSite: 'lax' as const, maxAge: 60*60*24*30, path: '/' }

  const res = NextResponse.json({ ok: true, redirect, level: userLevel })

  // httpOnly cookies (tidak bisa dibaca JS)
  res.cookies.set('porprov_session', sessionData, httpOnly)
  res.cookies.set('user_level',      userLevel,   httpOnly)

  // Client-readable cookies (dibaca useTenant & getLoginFromCookie)
  res.cookies.set('tenant_id',    tenantId,    client)   // ← sidebar branding
  res.cookies.set('login_origin', loginOrigin, persist)  // ← logout redirect

  return res
}