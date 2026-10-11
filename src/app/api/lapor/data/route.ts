// src/app/api/lapor/data/route.ts
// Bahan form PIC: atlet dan nomor pertandingan cabornya, plus laporan yang sudah ia kirim.
// Hanya nama dan jenis kelamin atlet yang keluar dari sini — tidak ada data pribadi.

import { NextResponse } from 'next/server'
import { ambilSesiLapor, dbLapor, keluargaCabor } from '@/lib/lapor-sesi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await ambilSesiLapor()
  if (!s) return NextResponse.json({ error: 'Masukkan kode lapor dulu.' }, { status: 401 })

  const db = dbLapor()
  const keluarga = await keluargaCabor(s.cabor_id)
  const namaCabor = keluarga[0]?.nama ?? 'Cabor'
  const idKeluarga = keluarga.map(k => k.id)

  const [{ data: kontingen }, { data: atlet }, { data: nomor }, { data: laporan }] = await Promise.all([
    db.from('kontingen').select('nama').eq('id', s.kontingen_id).maybeSingle(),
    db.from('atlet').select('id,nama_lengkap,gender')
      .eq('kontingen_id', s.kontingen_id).eq('cabor_id', s.cabor_id).order('nama_lengkap').range(0, 999),
    db.from('nomor_pertandingan').select('id,nama,gender,cabor_id')
      .in('cabor_id', idKeluarga).eq('is_active', true).order('nama').range(0, 999),
    db.from('laporan_hasil')
      .select('id,nomor_teks,atlet_ids,hasil,peringkat,nilai_teks,keterangan,foto_path,tanggal,status,alasan_tolak,created_at')
      .eq('akses_id', s.akses_id).order('created_at', { ascending: false }).limit(100),
  ])

  const namaAnak = new Map(keluarga.map(k => [k.id, k.nama]))
  return NextResponse.json({
    pic: { nama: s.nama_pic },
    kontingen: kontingen?.nama ?? '',
    cabor: namaCabor,
    atlet: (atlet ?? []).map((a: any) => ({ id: a.id, nama: a.nama_lengkap, gender: a.gender })),
    nomor: (nomor ?? []).map((n: any) => ({
      id: n.id, nama: n.nama, gender: n.gender,
      // Sub-cabor hanya ditulis bila berbeda dari cabor induknya.
      sub: n.cabor_id !== s.cabor_id ? (namaAnak.get(n.cabor_id) ?? null) : null,
    })),
    laporan: (laporan ?? []).map(({ foto_path, ...l }: any) => ({ ...l, ada_foto: !!foto_path })),
  })
}
