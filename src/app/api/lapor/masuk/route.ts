// src/app/api/lapor/masuk/route.ts
// PIC lapangan menukar kode lapor dengan sesi yang terikat pada satu cabor.

import { NextRequest, NextResponse } from 'next/server'
import { bakukanKode } from '@/lib/lapor'
import { COOKIE_SESI, COOKIE_SIG, UMUR_SESI_DETIK, dbLapor, sidikKode, tandaTanganiSesi } from '@/lib/lapor-sesi'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const terbatas = checkRateLimit(req, { limit: 10, windowMs: 60_000, key: 'lapor-masuk' })
  if (terbatas) return terbatas

  const body = await req.json().catch(() => ({}))
  const kode = bakukanKode(body?.kode)
  const SALAH = NextResponse.json({ error: 'Kode tidak dikenali. Periksa lagi pesan dari KONI.' }, { status: 401 })
  if (!kode) return SALAH

  const db = dbLapor()
  const { data: akses } = await db.from('lapor_akses')
    .select('id,kontingen_id,cabor_id,nama_pic,aktif').eq('kode_hash', await sidikKode(kode)).maybeSingle()
  if (!akses || !akses.aktif) {
    await writeAudit({ action: 'LAPOR_MASUK_GAGAL', resource: 'lapor_akses', severity: 'warning', ...reqMeta(req) })
    return SALAH
  }

  await db.from('lapor_akses').update({ terakhir_dipakai: new Date().toISOString() }).eq('id', akses.id)

  const { nilai, sig } = await tandaTanganiSesi({
    akses_id: akses.id, kontingen_id: akses.kontingen_id, cabor_id: akses.cabor_id,
    exp: Date.now() + UMUR_SESI_DETIK * 1000,
  })
  const opsi = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: UMUR_SESI_DETIK, path: '/' }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESI, nilai, opsi)
  res.cookies.set(COOKIE_SIG, sig, opsi)
  return res
}
