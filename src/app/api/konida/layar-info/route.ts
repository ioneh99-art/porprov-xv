// src/app/api/konida/layar-info/route.ts
// Bahan Mode Layar yang jarang berubah: klasemen resmi semua kontingen dan
// jadwal pertandingan cabor kontingen ini (hari ini, atau hari terdekat).
// Angka medali kontingen sendiri ditimpa di peramban dengan rekap lapangan,
// sama seperti War Room.

import { NextRequest, NextResponse } from 'next/server'
import { tanggalWIB } from '@/lib/lapor'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'
import { hitungMundur, jadwalTampil } from '@/lib/layar'
import type { BarisJadwal } from '@/lib/matriks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()
  const hariIni = tanggalWIB()

  let daftar: { cabor_id: number }[]
  try {
    daftar = await ambilSemua((d, s) => db.from('pendaftaran_nomor').select('cabor_id').eq('kontingen_id', a.kontingen_id).order('id').range(d, s))
    // Kontingen tanpa daftar resmi: pakai cabor atletnya di sistem.
    if (!daftar.length) daftar = await ambilSemua((d, s) => db.from('atlet').select('cabor_id').eq('kontingen_id', a.kontingen_id).not('cabor_id', 'is', null).order('id').range(d, s))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
  const idCabor = Array.from(new Set(daftar.map(d => d.cabor_id)))

  const [{ data: cabor }, { data: jadwal }, { data: klasemen }, { data: kontingen }] = await Promise.all([
    idCabor.length ? db.from('cabang_olahraga').select('nama').in('id', idCabor) : Promise.resolve({ data: [] as any[] }),
    db.from('jadwal_cabor').select('cabor_disiplin,cabor_nama_raw,jenis,wilayah,tuan_rumah,mulai,selesai,venue'),
    db.from('klasemen_medali').select('emas,perak,perunggu,total,kontingen(nama)').order('emas', { ascending: false }).order('perak', { ascending: false }).order('perunggu', { ascending: false }).limit(40),
    db.from('kontingen').select('nama').eq('id', a.kontingen_id).maybeSingle(),
  ])

  return NextResponse.json({
    kontingen: kontingen?.nama ?? '',
    hari_ini: hariIni,
    hitung_mundur: hitungMundur(hariIni),
    jadwal: jadwalTampil((jadwal ?? []) as BarisJadwal[], (cabor ?? []).map((c: any) => c.nama), hariIni),
    klasemen: (klasemen ?? []).map((k: any) => ({
      nama: k.kontingen?.nama ?? '-', emas: k.emas ?? 0, perak: k.perak ?? 0, perunggu: k.perunggu ?? 0, total: k.total ?? 0,
    })),
  })
}
