// src/app/api/lapor/data/route.ts
// Bahan form PIC: atlet dan nomor pertandingan cabornya, plus laporan dan catatan yang sudah ia kirim.
// Hanya nama dan jenis kelamin atlet yang keluar dari sini — tidak ada data pribadi.

import { NextRequest, NextResponse } from 'next/server'
import { buangNomorKembar, tanggalWIB } from '@/lib/lapor'
import { urutPartai } from '@/lib/jadwal-partai'
import { kelompokkanNomor } from '@/lib/pendaftaran'
import { ambilSesiLapor, atletCabor, dbLapor, keluargaCabor, pendaftaranCabor } from '@/lib/lapor-sesi'
import { medaliMenungguPic, pencatatMedali } from '@/lib/konfirmasi-pic'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JK_PENANDA: Record<string, string> = { Pa: 'L', Pi: 'P', Campuran: 'MIX', Terbuka: 'OPEN' }

export async function GET(req: NextRequest) {
  const s = await ambilSesiLapor()
  if (!s) return NextResponse.json({ error: 'Masukkan kode lapor dulu.' }, { status: 401 })

  const db = dbLapor()
  const keluarga = await keluargaCabor(s.cabor_id)
  const namaCabor = keluarga[0]?.nama ?? 'Cabor'
  // Kode per disiplin: nomor, atlet & jadwal hanya dari disiplin itu.
  const daftar = await pendaftaranCabor(s.kontingen_id, s.cabor_id, s.disiplin)

  // Jadwal partai: tiga hari ke belakang sampai seterusnya — cukup untuk mengisi laporan yang tertunda.
  const sejak = new Date(Date.parse(tanggalWIB() + 'T00:00:00Z') - 3 * 86_400_000).toISOString().slice(0, 10)
  const namaKeluarga = keluarga.map(k => k.nama)
  const [{ data: kontingen }, atlet, { data: laporan }, { data: catatan }, { data: partai }, { data: kegiatan }] = await Promise.all([
    db.from('kontingen').select('nama').eq('id', s.kontingen_id).maybeSingle(),
    atletCabor(s.kontingen_id, s.cabor_id, daftar, !!s.disiplin),
    db.from('laporan_hasil')
      .select('id,nomor_teks,atlet_ids,hasil,peringkat,nilai_teks,keterangan,foto_path,tanggal,status,alasan_tolak,created_at,validasi,memvalidasi_id')
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

  // "Laporkan sekarang" dari Jejak Pertandingan (KONIDA) bisa menunjuk partai yang lebih lama
  // dari tiga hari — ikut dikirim asal milik cabor ini.
  const idDiminta = Number(new URL(req.url).searchParams.get('partai'))
  let partaiDiminta: any[] = []
  if (Number.isInteger(idDiminta) && idDiminta > 0 && !(partai ?? []).some((p: any) => p.id === idDiminta)) {
    const { data } = await db.from('jadwal_partai')
      .select('id,tanggal,jam,nomor_teks,disiplin,nomor_resmi,babak,atlet_ids,lawan,venue,status,keterangan,sumber,diubah_oleh,updated_at')
      .eq('id', idDiminta).eq('kontingen_id', s.kontingen_id).eq('cabor_id', s.cabor_id).maybeSingle()
    if (data) partaiDiminta = [data]
  }

  // Nomor: daftar resmi pendaftaran bila ada. Katalog lama hanya dipakai untuk
  // cabor yang belum punya daftar resmi — isinya tidak cocok dengan yang
  // sungguh dipertandingkan (kelas Angkat Besi berbeda) dan memuat baris kembar.
  let nomor: any[]
  const resmi = daftar.length > 0
  if (resmi) {
    const kelompok = kelompokkanNomor(daftar)
    const banyakDisiplin = new Set(kelompok.map(k => k.disiplin)).size > 1 || !!s.disiplin
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

  // Medali cabor ini yang dicatat pihak lain dan menunggu bukti PIC (bukan untuk jalur KONIDA).
  const idAtlet = new Set(atlet.map(a => a.id))
  const namaAtlet = new Map(atlet.map(a => [a.id, a.nama_lengkap]))
  const konfirmasi = s.jalur === 'pic'
    ? (await medaliMenungguPic(db, s.kontingen_id, s.cabor_id, s.disiplin))
      .filter(l => !s.disiplin || l.disiplin || (l.atlet_ids ?? []).some((id: number) => idAtlet.has(id)))
    : []

  return NextResponse.json({
    konfirmasi: konfirmasi.map(l => ({
      id: l.id, nomor_teks: l.nomor_teks, disiplin: l.disiplin, hasil: l.hasil, tanggal: l.tanggal, nilai_teks: l.nilai_teks, atlet_ids: l.atlet_ids ?? [],
      atlet: (l.atlet_ids ?? []).map((id: number) => namaAtlet.get(id) ?? `Atlet #${id}`),
      oleh: pencatatMedali(l), ada_foto: !!l.foto_path,
    })),
    pic: { nama: s.nama_pic, jalur: s.jalur, disiplin: s.disiplin, cepat: s.cepat },
    kontingen: kontingen?.nama ?? '',
    cabor: namaCabor,
    atlet: atlet.map(a => ({ id: a.id, nama: a.nama_lengkap, gender: a.gender })),
    nomor_resmi: resmi,
    nomor,
    laporan: (laporan ?? []).map(({ foto_path, ...l }: any) => ({ ...l, ada_foto: !!foto_path })),
    catatan: (catatan ?? []).map(({ foto_path, ...c }: any) => ({ ...c, ada_foto: !!foto_path })),
    partai: urutPartai(([...(partai ?? []), ...partaiDiminta] as any[]).filter(p => !s.disiplin || !p.disiplin || p.disiplin === s.disiplin)
      // Partai tanpa disiplin: hanya bila atletnya termasuk disiplin ini.
      .filter(p => !s.disiplin || p.disiplin || (p.atlet_ids ?? []).some((id: number) => atlet.some(a => a.id === id)))),
    kegiatan: (kegiatan ?? []).map((k: any) => ({ nama: k.cabor_disiplin, mulai: k.mulai, selesai: k.selesai, venue: k.venue })),
  })
}
