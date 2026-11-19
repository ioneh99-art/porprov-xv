// src/lib/rate-limit.ts
// Shared in-memory rate limiter untuk semua API endpoint sensitif.
// Bersih secara otomatis setiap jam (lihat setInterval di bawah).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from './guard'

interface Entry { count: number; windowStart: number }

const store = new Map<string, Entry>()

setInterval(() => {
  const now = Date.now()
  store.forEach((e, k) => {
    if (now - e.windowStart > 60 * 60 * 1000) store.delete(k)
  })
}, 60 * 60 * 1000)

export interface RateLimitConfig {
  /** Jumlah request maksimum per window */
  limit: number
  /** Durasi window dalam milidetik (default: 60 detik) */
  windowMs?: number
  /** Kunci tambahan untuk memisahkan endpoint berbeda */
  key?: string
}

export interface RateLimitPenggunaConfig extends RateLimitConfig {
  /** Scope: 'user' | 'ip+user' (default: 'ip+user') */
  scope?: 'user' | 'ip+user'
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

// userId HANYA dari sesi terverifikasi HMAC. Dulu dibaca dari cookie mentah → id palsu
// yang diganti-ganti tiap request dapat kantong baru dan batas tak pernah tercapai.
function buildKey(ip: string, cfg: RateLimitConfig, scope: 'ip' | 'user' | 'ip+user', userId: string): string {
  const prefix = cfg.key ?? 'rl'
  switch (scope) {
    case 'user':     return `${prefix}:u:${userId || ip}`
    case 'ip+user':  return `${prefix}:${ip}:${userId}`
    default:         return `${prefix}:${ip}`
  }
}

/**
 * Periksa rate limit. Kembalikan NextResponse 429 jika terlampaui, null jika masih aman.
 *
 * @example
 * const limited = checkRateLimit(req, { limit: 20, windowMs: 60_000, key: 'sipa' })
 * if (limited) return limited
 */
export function checkRateLimit(
  req: NextRequest,
  cfg: RateLimitConfig
): NextResponse | null {
  return hitung(buildKey(getIp(req), cfg, 'ip', ''), cfg)
}

/**
 * Seperti checkRateLimit, tapi kantong dipisah per pengguna (sesi terverifikasi HMAC).
 * Kuki palsu/tanpa sesi sah → userId kosong → satu kantong bersama per IP.
 *
 * @example
 * const limited = await checkRateLimitPengguna(req, { limit: 20, key: 'sipa' })
 * if (limited) return limited
 */
export async function checkRateLimitPengguna(
  req: NextRequest,
  cfg: RateLimitPenggunaConfig
): Promise<NextResponse | null> {
  const sesi   = await getServerSession()
  const userId = sesi?.id != null ? String(sesi.id) : ''
  return hitung(buildKey(getIp(req), cfg, cfg.scope ?? 'ip+user', userId), cfg)
}

function hitung(k: string, cfg: RateLimitConfig): NextResponse | null {
  const windowMs = cfg.windowMs ?? 60_000
  const now      = Date.now()
  const entry    = store.get(k)

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(k, { count: 1, windowStart: now })
    return null
  }

  entry.count++
  if (entry.count > cfg.limit) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000)
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfter} detik.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(cfg.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  return null
}
