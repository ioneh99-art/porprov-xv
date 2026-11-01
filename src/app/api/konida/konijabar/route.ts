// src/app/api/konida/konijabar/route.ts
// Hasil laga dari situs panitia (porprov.konijabar.or.id) untuk Report Pertandingan.
// GET  → kapan terakhir dibaca + daftar laga yang sudah dibaca.
// POST → baca sekarang ({ paksa: true } = abaikan jeda 15 menit; tanpa paksa = hanya
//        bila sudah lewat jeda, dipanggil sendiri saat halaman dibuka).
//        { aksi: 'cek', ref, kunci } = tandai alarm beda data "sudah dicek".

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { sinkronKonijabar, statusSinkron, tandaiDicek } from '@/lib/konijabar-sinkron'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  try {
    return NextResponse.json(await statusSinkron(a.kontingen_id))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal memuat.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const b = await req.json().catch(() => ({}))
  if (b?.aksi === 'cek') {
    if (typeof b.ref !== 'string' || typeof b.kunci !== 'string' || b.kunci.length > 300)
      return NextResponse.json({ error: 'Data tanda cek tidak lengkap.' }, { status: 400 })
    const h = await tandaiDicek(a.kontingen_id, b.ref, b.kunci, a.nama)
    if ('error' in h) return NextResponse.json({ error: h.error }, { status: 422 })
    return NextResponse.json(await statusSinkron(a.kontingen_id))
  }
  try {
    const ringkas = await sinkronKonijabar(a.kontingen_id, { paksa: b?.paksa === true, oleh: a.nama })
    return NextResponse.json({ ...(await statusSinkron(a.kontingen_id)), ringkas })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal membaca situs KONI Jabar.' }, { status: 500 })
  }
}
