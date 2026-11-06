// src/app/api/konida/klasemen-sementara/route.ts
// Rekap sementara perolehan medali untuk War Room. Kontingen lain: langsung dari situs
// KONI Kota Bandung (koni-kotabandung.or.id/klasemen, dibaca ulang tiap 5 menit); bila situs
// itu tidak terbaca, potret terbaru tabel klasemen_sementara. Angka Kab. Bandung diganti
// data kita yang disahkan di War Room. Halaman publik memakai bahan yang sama (ambilRekapSumber).

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { dbLapor } from '@/lib/lapor-sesi'
import { kontingenKita, susunKlasemen } from '@/lib/jadwal-publik'
import { ambilRekapSumber } from '@/lib/klasemen-kotabdg'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  try {
    const r = await ambilRekapSumber(dbLapor(), kontingenKita)
    if (!r) return NextResponse.json({ potret: null, baris: [] })
    return NextResponse.json({
      potret: r.langsung ? 'situs KONI Kota Bandung' : r.sumber, potret_at: r.waktu, sumber: r.sumber, langsung: r.langsung,
      kab_bandung_sumber: r.kab_bandung_sumber, baris: susunKlasemen(r.baris),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
