// src/app/api/konida/lapor-langsung/route.ts
// Jalur kedua mengisi hasil cabor: admin KONIDA yang login di dashboard membuka
// formulir lapor (/lapor) untuk satu cabor TANPA kode PIC. Dipakai bila PIC cabor
// belum ada atau belum aktif. Formulir, pemeriksaan, dan Antrean pengesahannya
// sama persis dengan jalur PIC — hanya pintunya yang berbeda.
//
// Pintunya satu baris lapor_akses berjalur 'konida' per cabor (sidik acak, tidak
// bisa dipakai lewat kode). Sesi yang diberikan di sini hanya berlaku selama sesi
// dashboard admin masih berlaku — diperiksa ulang di setiap kiriman (ambilSesiLapor).

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { COOKIE_SESI, COOKIE_SIG, dbLapor, sidikKode, tandaTanganiSesi } from '@/lib/lapor-sesi'
import { akhirSesiKonida } from '@/lib/jalur-lapor'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Baris pintu KONIDA untuk satu cabor; dibuat bila belum ada. */
async function pintuKonida(kontingen_id: number, cabor_id: number, olehNama: string) {
  const db = dbLapor()
  const cari = () => db.from('lapor_akses').select('id,aktif')
    .eq('kontingen_id', kontingen_id).eq('cabor_id', cabor_id).eq('jalur', 'konida').maybeSingle()
  const { data: ada } = await cari()
  if (ada) {
    if (!ada.aktif) await db.from('lapor_akses').update({ aktif: true }).eq('id', ada.id)
    return ada.id as number
  }
  const { data: baru, error } = await db.from('lapor_akses').insert({
    kontingen_id, cabor_id, jalur: 'konida',
    // Sidik dari nilai acak yang langsung dibuang: tidak ada kode yang bisa membuka baris ini.
    kode_hash: await sidikKode(`KONIDA-${randomUUID()}`), kode_ujung: '----',
    nama_pic: 'Tim KONIDA (tanpa kode)', dibuat_oleh: olehNama,
  }).select('id').single()
  if (baru) return baru.id as number
  // Dua admin membuka cabor yang sama bersamaan: indeks unik menolak yang kedua — pakai yang sudah ada.
  const { data: lagi } = await cari()
  if (lagi) return lagi.id as number
  throw new Error(error?.message ?? 'Gagal menyiapkan pintu KONIDA.')
}

export async function POST(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const terbatas = checkRateLimit(req, { limit: 30, windowMs: 60_000, key: 'lapor-langsung' })
  if (terbatas) return terbatas

  const b = await req.json().catch(() => ({}))
  const cabor_id = Number(b?.cabor_id)
  if (!Number.isInteger(cabor_id) || cabor_id <= 0) return NextResponse.json({ error: 'Pilih cabornya.' }, { status: 422 })

  // Sama dengan pembuatan kode PIC: hanya cabor yang punya atlet di kontingen ini.
  const db = dbLapor()
  const { count } = await db.from('atlet').select('id', { count: 'exact', head: true })
    .eq('kontingen_id', a.kontingen_id).eq('cabor_id', cabor_id)
  if (!count) return NextResponse.json({ error: 'Kontingen ini tidak punya atlet di cabor tersebut.' }, { status: 422 })

  let akses_id: number
  try { akses_id = await pintuKonida(a.kontingen_id, cabor_id, a.nama) }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
  await db.from('lapor_akses').update({ terakhir_dipakai: new Date().toISOString() }).eq('id', akses_id)

  const kini = Date.now()
  const exp = akhirSesiKonida(kini, a.sesi.exp)
  const { nilai, sig } = await tandaTanganiSesi({ akses_id, kontingen_id: a.kontingen_id, cabor_id, exp })
  const opsi = {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const,
    maxAge: Math.max(60, Math.floor((exp - kini) / 1000)), path: '/',
  }

  await writeAudit({
    action: 'LAPOR_LANGSUNG_BUKA', resource: 'lapor_akses', resource_id: akses_id,
    actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? null,
    actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: a.kontingen_id,
    payload: { cabor_id }, ...reqMeta(req),
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESI, nilai, opsi)
  res.cookies.set(COOKIE_SIG, sig, opsi)
  return res
}
