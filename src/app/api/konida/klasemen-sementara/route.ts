// src/app/api/konida/klasemen-sementara/route.ts
// Rekap sementara perolehan medali (potret terbaru tabel klasemen_sementara) untuk War Room.
// Khusus dalam aplikasi — halaman publik tetap memakai klasemen situs KONI Jabar.

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { dbLapor } from '@/lib/lapor-sesi'
import { susunKlasemen } from '@/lib/jadwal-publik'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()
  const { data: akhir, error } = await db.from('klasemen_sementara').select('potret,potret_at,sumber').order('potret_at', { ascending: false }).limit(1).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!akhir) return NextResponse.json({ potret: null, baris: [] })
  const { data: baris, error: e2 } = await db.from('klasemen_sementara').select('kontingen,emas,perak,perunggu').eq('potret', akhir.potret)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
  return NextResponse.json({
    potret: akhir.potret, potret_at: akhir.potret_at, sumber: akhir.sumber,
    baris: susunKlasemen((baris ?? []).map((r: any) => ({ nama: r.kontingen, emas: r.emas, perak: r.perak, perunggu: r.perunggu }))),
  })
}
