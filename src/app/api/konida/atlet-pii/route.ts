// src/app/api/konida/atlet-pii/route.ts
// Satu-satunya pintu ke data pribadi atlet: NIK, rekening, nama bank, kontak
// (HP, telepon, email, kecamatan — ditutup dari kunci anon sejak migrasi 067), dan
// No KK, tempat lahir, alamat, agama, golongan darah, kontak darurat, NPWP, BPJS (sejak 084).
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
/** Kolom pribadi di tabel atlet yang hanya boleh lewat rute ini (kunci anon dicabut, migrasi 067 & 084). */
const KOLOM_ATLET = [
  'no_hp', 'telepon', 'email', 'kecamatan',
  'no_kk', 'tempat_lahir', 'alamat', 'alamat_domisili', 'kelurahan', 'kode_pos', 'agama', 'gol_darah', 'no_hp_darurat', 'nama_kontak_darurat', 'nama_pemilik_rekening', 'cabang_bank', 'npwp', 'nama_npwp', 'no_bpjs_kesehatan', 'no_bpjs_ketenagakerjaan', 'faskes',
] as const

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
    // Dibaca per 1.000 baris — PostgREST memotong jawaban di 1.000 baris, dan
    // Kab. Bandung sudah lebih dari itu (dulu atlet ke-1.001 dst. tanpa NIK/kontak).
    for (let dari = 0; ; dari += 1000) {
      let q = db.from('atlet').select('id').eq('kontingen_id', s.kontingen_id).order('id')
      if (minta.length) q = q.in('id', minta)
      const { data, error } = await q.range(dari, dari + 999)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      milik = milik.concat((data ?? []).map((r: any) => r.id))
      if ((data ?? []).length < 1000) break
    }
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
    // Kontak & data pribadi lain dibaca dari tabel atlet dengan kunci layanan
    // (kunci anon tidak boleh lagi — kontak sejak migrasi 067, sisanya sejak 084).
    const { data: kontak, error: ek } = await db.from('atlet')
      .select(['id', ...KOLOM_ATLET].join(','))
      .in('id', milik.slice(i, i + 500))
    if (ek) return NextResponse.json({ error: ek.message }, { status: 500 })
    for (const r of (kontak ?? []) as any[]) {
      const tempel: Record<string, unknown> = {}
      for (const k of KOLOM_ATLET) tempel[k] = r[k]
      pii[r.id] = { ...(pii[r.id] ?? {}), ...tempel }
    }
  }
  return NextResponse.json({ pii, jumlah: Object.keys(pii).length })
}
