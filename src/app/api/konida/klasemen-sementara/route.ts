// src/app/api/konida/klasemen-sementara/route.ts
// Rekap sementara perolehan medali untuk War Room. Kontingen lain: langsung dari situs
// KONI Kota Bandung (koni-kotabandung.or.id/klasemen, dibaca ulang tiap 5 menit); bila situs
// itu tidak terbaca, potret terbaru tabel klasemen_sementara. Angka Kab. Bandung diganti
// data kita yang disahkan di War Room. Khusus dalam aplikasi — halaman publik tetap situs KONI Jabar.

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { dbLapor } from '@/lib/lapor-sesi'
import { kontingenKita, susunKlasemen } from '@/lib/jadwal-publik'
import { ambilKlasemenKotaBdg } from '@/lib/klasemen-kotabdg'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const situs = await ambilKlasemenKotaBdg()
  if (situs) {
    const kb = situs.find(b => kontingenKita(b.nama))
    return NextResponse.json({
      potret: 'situs KONI Kota Bandung', potret_at: new Date().toISOString(), sumber: 'situs KONI Kota Bandung (koni-kotabandung.or.id/klasemen)', langsung: true,
      kab_bandung_sumber: kb ? { emas: kb.emas, perak: kb.perak, perunggu: kb.perunggu } : null,
      baris: susunKlasemen(situs.map(b => ({ nama: b.nama, emas: b.emas, perak: b.perak, perunggu: b.perunggu }))),
    })
  }

  // Cadangan: potret terakhir yang dicatat manual.
  const db = dbLapor()
  const { data: akhir, error } = await db.from('klasemen_sementara').select('potret,potret_at,sumber').order('potret_at', { ascending: false }).limit(1).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!akhir) return NextResponse.json({ potret: null, baris: [] })
  const { data: baris, error: e2 } = await db.from('klasemen_sementara').select('kontingen,emas,perak,perunggu').eq('potret', akhir.potret)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  return NextResponse.json({
    potret: akhir.potret, potret_at: akhir.potret_at, sumber: `${akhir.sumber} (situs KONI Kota Bandung sedang tidak terbaca)`, langsung: false,
    baris: susunKlasemen((baris ?? []).map((r: any) => ({ nama: r.kontingen, emas: r.emas, perak: r.perak, perunggu: r.perunggu }))),
  })
}
