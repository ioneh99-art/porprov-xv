import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth'

// Simple in-memory rate limiter
// Di production bisa pakai Redis/Upstash
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()

const RATE_LIMIT = 5        // max 5 percobaan
const WINDOW_MS = 15 * 60 * 1000  // per 15 menit
const BLOCK_MS = 30 * 60 * 1000   // block 30 menit

function getRateLimitKey(req: NextRequest, username: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ??
    req.headers.get('x-real-ip') ?? 'unknown'
  return `${ip}:${username.toLowerCase()}`
}

function checkRateLimit(key: string): { blocked: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = loginAttempts.get(key)

  if (!record) return { blocked: false, remaining: RATE_LIMIT, resetIn: 0 }

  // Reset kalau window sudah lewat
  if (now - record.lastAttempt > WINDOW_MS) {
    loginAttempts.delete(key)
    return { blocked: false, remaining: RATE_LIMIT, resetIn: 0 }
  }

  // Cek apakah diblok
  if (record.count >= RATE_LIMIT) {
    const resetIn = Math.ceil((record.lastAttempt + BLOCK_MS - now) / 1000 / 60)
    return { blocked: true, remaining: 0, resetIn }
  }

  return {
    blocked: false,
    remaining: RATE_LIMIT - record.count,
    resetIn: 0
  }
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

function clearAttempts(key: string) {
  loginAttempts.delete(key)
}

// Cleanup map setiap 1 jam biar tidak memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of loginAttempts.entries()) {
    if (now - record.lastAttempt > BLOCK_MS) {
      loginAttempts.delete(key)
    }
  }
}, 60 * 60 * 1000)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username dan password wajib diisi' },
      { status: 400 }
    )
  }

  // Cek rate limit
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
    const sisaPercobaan = newCheck.remaining

    return NextResponse.json(
      {
        error: sisaPercobaan > 0
          ? `Username atau password salah. Sisa ${sisaPercobaan} percobaan.`
          : `Akun diblokir sementara karena terlalu banyak percobaan gagal. Coba lagi dalam 30 menit.`
      },
      { status: 401 }
    )
  }

  // Login sukses — clear attempts
  clearAttempts(key)

  const redirect =
    user.role === 'admin' ? '/dashboard' :
    user.role === 'konida' ? '/konida/dashboard' :
    user.role === 'operator_cabor' ? '/operator/dashboard' :
    '/login'

  const sessionData = JSON.stringify({
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    kontingen_id: user.kontingen_id,
    cabor_id: user.cabor_id,
  })

  const res = NextResponse.json({ ok: true, redirect })
  res.cookies.set('porprov_session', sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return res
}