// src/app/api/konida/atlet-pii/route.ts
// Satu-satunya pintu ke data pribadi atlet: NIK, rekening, nama bank.
//
// Sebelum ini, ketiganya ikut terbaca kunci anon lewat tabel atlet — kunci
// yang tertanam di halaman web dan bisa diambil siapa pun dari sumber
// halaman. Rute ini menggantikan jalur itu: bergerbang sesi, dan hanya
// mengembalikan atlet milik kontingen si pemanggil.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const adminPusat = (s: any) =>
  ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

export async function GET(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  const db = sb()
  const u = new URL(req.url)
  const minta = (u.searchParams.get('ids') ?? '')
    .split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n) && n > 0)

  // Kepemilikan diperiksa ulang di server. Nomor atlet yang dikirim peramban
  // tidak dipercaya begitu saja — tanpa langkah ini, mengganti angka di
  // alamat cukup untuk mengintip kontingen lain.
  let milik: number[] = []
  if (adminPusat(s)) {
    milik = minta
  } else {
    if (s.kontingen_id == null) {
      return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })
    }
    let q = db.from('atlet').select('id').eq('kontingen_id', s.kontingen_id)
    if (minta.length) q = q.in('id', minta)
    const { data } = await q.range(0, 4999)
    milik = (data ?? []).map((r: any) => r.id)
  }
  if (milik.length === 0) return NextResponse.json({ pii: {} })

  // Dipecah-pecah supaya panjang URL ke PostgREST tidak meledak pada
  // kontingen sebesar Kab. Bandung (1.142 atlet).
  const pii: Record<number, any> = {}
  for (let i = 0; i < milik.length; i += 500) {
    const { data, error } = await db.from('atlet_pii')
      .select('atlet_id,no_ktp,no_rekening,nama_bank')
      .in('atlet_id', milik.slice(i, i + 500))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const r of (data ?? [])) {
      pii[r.atlet_id] = { no_ktp: r.no_ktp, no_rekening: r.no_rekening, nama_bank: r.nama_bank }
    }
  }
  return NextResponse.json({ pii, jumlah: Object.keys(pii).length })
}
