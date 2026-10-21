// src/app/api/lapor/data/route.ts
// Bahan form PIC: atlet dan nomor pertandingan cabornya, plus laporan dan catatan yang sudah ia kirim.
// Hanya nama dan jenis kelamin atlet yang keluar dari sini — tidak ada data pribadi.

import { NextResponse } from 'next/server'
import { buangNomorKembar, tanggalWIB } from '@/lib/lapor'
import { urutPartai } from '@/lib/jadwal-partai'
import { kelompokkanNomor } from '@/lib/pendaftaran'
import { ambilSesiLapor, atletCabor, dbLapor, keluargaCabor, pendaftaranCabor } from '@/lib/lapor-sesi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JK_PENANDA: Record<string, string> = { Pa: 'L', Pi: 'P', Campuran: 'MIX', Terbuka: 'OPEN' }

export async function GET() {
  const s = await ambilSesiLapor()
  if (!s) return NextResponse.json({ error: 'Masukkan kode lapor dulu.' }, { status: 401 })

  const db = dbLapor()
  const keluarga = await keluargaCabor(s.cabor_id)
  const namaCabor = keluarga[0]?.nama ?? 'Cabor'
  const daftar = await pendaftaranCabor(s.kontingen_id, s.cabor_id)

  // Jadwal partai: tiga hari ke belakang sampai seterusnya — cukup untuk mengisi laporan yang tertunda.
  const sejak = new Date(Date.parse(tanggalWIB() + 'T00:00:00Z') - 3 * 86_400_000).toISOString().slice(0, 10)
  const namaKeluarga = keluarga.map(k => k.nama)
  const [{ data: kontingen }, atlet, { data: laporan }, { data: catatan }, { data: partai }, { data: kegiatan }] = await Promise.all([
    db.from('kontingen').select('nama').eq('id', s.kontingen_id).maybeSingle(),
    atletCabor(s.kontingen_id, s.cabor_id, daftar),
    db.from('laporan_hasil')
      .select('id,nomor_teks,atlet_ids,hasil,peringkat,nilai_teks,keterangan,foto_path,tanggal,status,alasan_tolak,created_at')
      .eq('akses_id', s.akses_id).order('created_at', { ascending: false }).limit(100),
    db.from('catatan_lapangan')
      .select('id,jenis,mendesak,tanggal,jam,nomor_teks,isi,foto_path,status,tanggapan,created_at')
      .eq('akses_id', s.akses_id).order('created_at', { ascending: false }).limit(100),
    db.from('jadwal_partai')
      .select('id,tanggal,jam,nomor_teks,disiplin,nomor_resmi,babak,atlet_ids,lawan,venue,status,keterangan,sumber,diubah_oleh,updated_at')
      .eq('kontingen_id', s.kontingen_id).eq('cabor_id', s.cabor_id).gte('tanggal', sejak).limit(500),
    // Venue dan rentang hari cabor ini dari jadwal KONI, sebagai saran isian.
    namaKeluarga.length ? db.from('jadwal_cabor').select('cabor_disiplin,mulai,selesai,venue').in('cabor_nama_raw', namaKeluarga) : Promise.resolve({ data: [] as any[] }),
  ])

  // Nomor: daftar resmi pendaftaran bila ada. Katalog lama hanya dipakai untuk
  // cabor yang belum punya daftar resmi — isinya tidak cocok dengan yang
  // sungguh dipertandingkan (kelas Angkat Besi berbeda) dan memuat baris kembar.
  let nomor: any[]
  const resmi = daftar.length > 0
  if (resmi) {
    const kelompok = kelompokkanNomor(daftar)
    const banyakDisiplin = new Set(kelompok.map(k => k.disiplin)).size > 1
    nomor = kelompok.map(k => ({
      id: null, kunci: k.kunci, nama: k.nomor, gender: k.penanda ? JK_PENANDA[k.penanda] : null,
      sub: banyakDisiplin ? k.disiplin : null, disiplin: k.disiplin,
      atlet_ids: k.atlet_ids, belum_ada: k.belum_ada,
    }))
  } else {
    const idKeluarga = keluarga.map(k => k.id)
    const namaAnak = new Map(keluarga.map(k => [k.id, k.nama]))
    const { data: katalog } = await db.from('nomor_pertandingan').select('id,nama,gender,cabor_id')
      .in('cabor_id', idKeluarga).eq('is_active', true).order('nama').range(0, 999)
    nomor = buangNomorKembar((katalog ?? []).map((n: any) => ({
      id: n.id as number, nama: n.nama as string, gender: n.gender as string | null,
      // Sub-cabor hanya ditulis bila berbeda dari cabor induknya.
      sub: n.cabor_id !== s.cabor_id ? (namaAnak.get(n.cabor_id) ?? null) : null,
    }))).map(n => ({ ...n, kunci: `katalog-${n.id}`, disiplin: null, atlet_ids: [], belum_ada: 0 }))
  }

  return NextResponse.json({
    pic: { nama: s.nama_pic },
    kontingen: kontingen?.nama ?? '',
    cabor: namaCabor,
    atlet: atlet.map(a => ({ id: a.id, nama: a.nama_lengkap, gender: a.gender })),
    nomor_resmi: resmi,
    nomor,
    laporan: (laporan ?? []).map(({ foto_path, ...l }: any) => ({ ...l, ada_foto: !!foto_path })),
    catatan: (catatan ?? []).map(({ foto_path, ...c }: any) => ({ ...c, ada_foto: !!foto_path })),
    partai: urutPartai((partai ?? []) as any[]),
    kegiatan: (kegiatan ?? []).map((k: any) => ({ nama: k.cabor_disiplin, mulai: k.mulai, selesai: k.selesai, venue: k.venue })),
  })
}
