// src/app/api/auth/login/route.ts — FINAL
// Fix: naming convention kotabekasi/kotabogor/kotadepok
// Fix: 10 enterprise tenant hardcode premium
// Fix: getRedirect duplikat case

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loginUser } from '@/lib/auth'
import { getSubscription } from '@/lib/subscriptions'

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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
  loginAttempts.forEach((r, k) => {
    if (now - r.lastAttempt > BLOCK_MS) loginAttempts.delete(k)
  })
}, 60 * 60 * 1000)

// ─── Kontingen ID → Tenant slug (naming FINAL) ────────────
const KONTINGEN_TO_TENANT: Record<number, string> = {
  1:  'kabbogor',         2:  'kabsukabumi',      3:  'kabcianjur',
  4:  'kabbandung',       5:  'kabgarut',          6:  'kabtasikmalaya',
  7:  'kabciamis',        8:  'kabkuningan',       9:  'kabcirebon',
  10: 'kabmajalengka',    11: 'kabsumedang',       12: 'kabindramayu',
  13: 'kabsubang',        14: 'kabpurwakarta',     15: 'kabkarawang',
  16: 'kabbekasi',        17: 'kabbandungbarat',   18: 'kabpangandaran',
  19: 'kotabogor',        20: 'kotasukabumi',      21: 'kotabandung',
  22: 'kotacirebon',      23: 'kotabekasi',        24: 'kotadepok',
  25: 'kotatasikmalaya',  26: 'kotabanjar',        27: 'kotacimahi',
}

// ─── 10 Enterprise Tenant — selalu premium ────────────────
// Subscription superadmin belum jalan → hardcode dulu
const ENTERPRISE_TENANTS: Record<string, boolean> = {
  'kabbogor':         true,
  'kotabekasi':       true,
  'kabbekasi':        true,
  'kotabandung':      true,
  'kabbandung':       true,
  'kotadepok':        true,
  'kotabogor':        true,
  'kabkarawang':      true,
  'kabbandungbarat':  true,
  'kotacirebon':      true,
}

// ─── Dashboard redirect per kontingen (enterprise) ────────
const ENTERPRISE_DASHBOARD: Record<string, string> = {
  'kabbogor':         '/konida/dashboard/kabbogor',
  'kotabekasi':       '/konida/dashboard/kotabekasi',
  'kabbekasi':        '/konida/dashboard/kabbekasi',
  'kotabandung':      '/konida/dashboard/kotabandung',
  'kabbandung':       '/konida/dashboard/kabbandung',
  'kotadepok':        '/konida/dashboard/kotadepok',
  'kotabogor':        '/konida/dashboard/kotabogor',
  'kabkarawang':      '/konida/dashboard/kabkarawang',
  'kabbandungbarat':  '/konida/dashboard/kabbandungbarat',
  'kotacirebon':      '/konida/dashboard/kotacirebon',
}

// ─── Resolve Level ────────────────────────────────────────
function resolveLevel(user: {
  role: string
  level?: string | null
  kontingen_id?: number | null
}): string {
  if (user.role === 'superadmin') return 'superadmin'
  if (user.role === 'koni_jabar') return 'koni_jabar'
  if (user.role === 'operator_cabor' || user.role === 'operator') return 'level3'
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

// ─── Resolve Plan ─────────────────────────────────────────
// Prioritas: (1) DB subscription, (2) DB tenants.is_enterprise, (3) hardcode fallback
async function resolvePlan(
  kontingenId: number | null | undefined,
  tenantId: string
): Promise<string> {
  // Coba ambil dari DB subscription terlebih dahulu
  if (kontingenId) {
    try {
      const sub = await getSubscription(kontingenId)
      if (sub?.plan_id) return sub.plan_id
    } catch { /* fallback ke logika berikutnya */ }
  }

  // Fallback ke hardcode enterprise list (sementara sampai DB subscription terisi penuh)
  if (ENTERPRISE_TENANTS[tenantId]) return 'premium'

  return 'basic'
}

// ─── Redirect ─────────────────────────────────────────────
function getRedirect(
  level: string,
  role: string,
  tenantId: string,
  planId: string,
  username: string
): string {
  // Superadmin & KONI
  if (level === 'superadmin') return '/superadmin'
  if (level === 'koni_jabar') return '/dashboard'

  // Operator cabor — jangan ke konida dashboard
  if (role === 'operator_cabor') {
    if (/pentathlon/i.test(username)) return '/operator/pentathlon'
    if (/dayung/i.test(username))     return '/operator/dayung'
    return '/operator/dashboard'
  }
  if (role === 'operator') return '/operator/dashboard'

  // Penyelenggara (level1 = kotabekasi)
  if (level === 'level1') {
    return role === 'penyelenggara'
      ? '/konida/penyelenggara'
      : (ENTERPRISE_DASHBOARD[tenantId] ?? '/konida/dashboard/kotabekasi')
  }

  // Level2 (kotabogor, kotadepok sebelum jadi enterprise)
  if (level === 'level2') {
    return ENTERPRISE_DASHBOARD[tenantId] ?? '/konida/dashboard'
  }

  // Level3 — cek enterprise dulu
  if (ENTERPRISE_DASHBOARD[tenantId]) {
    return ENTERPRISE_DASHBOARD[tenantId]
  }

  // Premium generic
  if (planId === 'premium' || planId === 'enterprise') {
    return '/konida/dashboard/premium'
  }

  return '/konida/dashboard/basic'
}

// ─── Login origin ─────────────────────────────────────────
function resolveLoginOrigin(tenantId: string, level: string): string {
  if (level === 'superadmin') return 'superadmin'
  if (level === 'koni_jabar') return 'jabar'
  return tenantId || 'jabar'
}

// ─── POST ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
  }

  const key = getRateLimitKey(req, username)
  const { blocked, resetIn } = checkRateLimit(key)
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

  const userLevel = resolveLevel({
    role: user.role, level: user.level, kontingen_id: user.kontingen_id
  })

  const tenantId = (() => {
    if (user.role === 'superadmin') return 'superadmin'
    if (user.role === 'koni_jabar') return 'jabar'
    return (user.kontingen_id ? KONTINGEN_TO_TENANT[user.kontingen_id] : null) ?? 'jabar'
  })()

  // Resolve plan — enterprise hardcode premium
  const planId = await resolvePlan(user.kontingen_id, tenantId)

  const loginOrigin = resolveLoginOrigin(tenantId, userLevel)
  const redirect    = getRedirect(userLevel, user.role, tenantId, planId, user.username)

  if (process.env.NODE_ENV === 'development') {
    console.log('[login]', {
      username:       user.username,
      role:           user.role,
      kontingen_id:   user.kontingen_id,
      tenant_id:      tenantId,
      plan_id:        planId,
      level:          userLevel,
      redirect,
      login_origin:   loginOrigin,
      is_enterprise:  ENTERPRISE_TENANTS[tenantId] ?? false,
    })
  }

  // Lookup cabor_nama jika user punya cabor_id (operator_cabor)
  let cabor_nama: string | null = null
  if (user.cabor_id) {
    const { data: cabor } = await sbAdmin
      .from('cabang_olahraga')
      .select('nama')
      .eq('id', user.cabor_id)
      .single()
    cabor_nama = cabor?.nama ?? null
  }

  const sessionData = JSON.stringify({
    id:           user.id,
    username:     user.username,
    nama:         user.nama,
    role:         user.role,
    kontingen_id: user.kontingen_id,
    cabor_id:     user.cabor_id,
    cabor_nama,
    level:        userLevel,
    plan_id:      planId,
  })

  const secure   = process.env.NODE_ENV === 'production'
  const httpOnly = { httpOnly: true, secure, sameSite: 'lax' as const, maxAge: 60*60*8,      path: '/' }
  const client   = {               secure, sameSite: 'lax' as const, maxAge: 60*60*8,      path: '/' }
  const persist  = {               secure, sameSite: 'lax' as const, maxAge: 60*60*24*30,  path: '/' }

  const res = NextResponse.json({
    ok: true, redirect, level: userLevel, login_origin: loginOrigin, plan_id: planId
  })

  res.cookies.set('porprov_session', sessionData,   httpOnly)
  res.cookies.set('user_level',      userLevel,     client)
  res.cookies.set('tenant_id',       tenantId,      client)
  res.cookies.set('login_origin',    loginOrigin,   persist)

  return res
}