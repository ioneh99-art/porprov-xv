// src/app/api/lapor/kirim/route.ts
// PIC mengirim satu laporan hasil, boleh disertai satu foto bukti. Masuk sebagai 'menunggu'.
// Dua pengecualian (Jalur Cepat, keputusan Bos 7 Nov 2026 — lihat src/lib/jalur-cepat.ts):
//   • Superadministrator mencentang "Medali jalur cepat" → langsung disahkan, bertanda menunggu PIC.
//   • Laporan PIC yang sama dengan medali jalur cepat → menjadi validasinya (tidak dihitung dua kali).
//     Sejak 8 Nov berlaku juga untuk medali sah dari situs KONI Jabar / Input Langsung KONIDA.

import { NextRequest, NextResponse } from 'next/server'
import { adalahFinal, adalahMedali, kunciKembar, periksaLaporan, tanggalWIB } from '@/lib/lapor'
import { ALASAN_VALIDASI, bukanDariPic, cocokJalurCepat, laporanPicSudahAda, lengkapiDariPic, menungguPic, type BarisCepat } from '@/lib/jalur-cepat'
import { aksesKonida } from '@/lib/konfirmasi-pic'
import { rapikan, tulisNomorResmi } from '@/lib/pendaftaran'
import { WADAH_BUKTI, ambilSesiLapor, atletCabor, bacaKiriman, dbLapor, keluargaCabor, pendaftaranCabor, simpanFotoBukti } from '@/lib/lapor-sesi'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAudit, reqMeta } from '@/lib/audit'
import { segarkanPublik } from '@/lib/partai-server'
import { periksaPengisi } from '@/lib/pengisi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const s = await ambilSesiLapor()
  if (!s) return NextResponse.json({ error: 'Sesi habis. Masukkan kode lapor lagi.' }, { status: 401 })
  const terbatas = checkRateLimit(req, { limit: 30, windowMs: 60_000, key: 'lapor-kirim' })
  if (terbatas) return terbatas

  const kiriman = await bacaKiriman(req)
  if (!kiriman) return NextResponse.json({ error: 'Kiriman tidak terbaca. Coba lagi.' }, { status: 400 })
  const { mentah, foto } = kiriman

  const hasil = periksaLaporan(mentah)
  if ('galat' in hasil) return NextResponse.json({ error: hasil.galat }, { status: 422 })
  // Siapa yang benar-benar mengisi (kode PIC bisa dipinjam orang lain).
  const cekPengisi = periksaPengisi(mentah)
  if ('galat' in cekPengisi) return NextResponse.json({ error: cekPengisi.galat }, { status: 422 })
  const { pengisi } = cekPengisi
  const isi = hasil.isi
  const db = dbLapor()

  // Atlet yang dikirim peramban tidak dipercaya: semuanya harus termasuk atlet
  // yang boleh dilaporkan lewat kode ini (cabornya, atau terdaftar resmi di cabornya).
  const daftar = await pendaftaranCabor(s.kontingen_id, s.cabor_id, s.disiplin)
  const boleh = new Set((await atletCabor(s.kontingen_id, s.cabor_id, daftar, !!s.disiplin)).map(a => a.id))
  if (isi.atlet_ids.some(id => !boleh.has(id)))
    return NextResponse.json({ error: 'Ada atlet yang bukan dari cabor Anda.' }, { status: 403 })

  // Nomor dari daftar resmi: disiplin dan namanya dicocokkan ulang di server, dan
  // tulisan nomornya disusun di sini — bukan memakai tulisan kiriman peramban.
  let disiplin: string | null = null
  if (mentah?.disiplin != null && mentah.disiplin !== '') {
    const d = rapikan(mentah.disiplin), n = rapikan(mentah.nomor_resmi)
    if (!daftar.some(x => x.disiplin === d && x.nomor === n))
      return NextResponse.json({ error: 'Nomor itu tidak ada di daftar resmi cabor Anda.' }, { status: 422 })
    disiplin = d
    isi.nomor_id = null
    isi.nomor_teks = tulisNomorResmi(d, n, s.disiplin ? 2 : new Set(daftar.map(x => x.disiplin)).size)
  }

  // Kode per disiplin: nomor yang diketik bebas tetap dicatat di disiplin kode itu.
  if (!disiplin && s.disiplin) disiplin = s.disiplin

  if (isi.nomor_id != null) {
    const idKeluarga = (await keluargaCabor(s.cabor_id)).map(k => k.id)
    const { data: nomor } = await db.from('nomor_pertandingan').select('id,cabor_id').eq('id', isi.nomor_id).maybeSingle()
    if (!nomor || !idKeluarga.includes(nomor.cabor_id))
      return NextResponse.json({ error: 'Nomor pertandingan bukan dari cabor Anda.' }, { status: 403 })
  }

  // Laporan dari partai terjadwal: partainya harus milik cabor ini.
  let partai_id: number | null = null
  let tanggalPartai: string | null = null
  if (mentah?.partai_id != null && mentah.partai_id !== '') {
    const { data: p } = await db.from('jadwal_partai').select('id,tanggal').eq('id', Number(mentah.partai_id))
      .eq('kontingen_id', s.kontingen_id).eq('cabor_id', s.cabor_id).maybeSingle()
    if (!p) return NextResponse.json({ error: 'Jadwal partai itu bukan dari cabor Anda.' }, { status: 403 })
    partai_id = p.id; tanggalPartai = p.tanggal
  }

  // Laporan dari jadwal memakai tanggal pertandingannya (dilaporkan belakangan tetap masuk
  // jurnal hari pertandingan); laporan bebas memakai tanggal hari ini.
  const hariIni = tanggalWIB()
  const tanggal = tanggalPartai && tanggalPartai <= hariIni ? tanggalPartai : hariIni

  // Jalur Cepat: hanya Superadministrator (s.cepat), hanya untuk medali.
  const mintaCepat = mentah?.jalur_cepat === true || mentah?.jalur_cepat === 'true'
  if (mintaCepat && !s.cepat) return NextResponse.json({ error: 'Jalur cepat hanya untuk Superadministrator.' }, { status: 403 })
  if (mintaCepat && !adalahMedali(isi.hasil)) return NextResponse.json({ error: 'Jalur cepat hanya untuk medali (emas/perak/perunggu).' }, { status: 422 })

  // Laporan cabor ini di sekitar tanggalnya (±2 hari): untuk cek kembar dan jalur cepat.
  const geser = (h: number) => new Date(Date.parse(tanggal + 'T00:00:00Z') + h * 86_400_000).toISOString().slice(0, 10)
  const { data: sekitar } = await db.from('laporan_hasil')
    .select('id,cabor_id,nomor_teks,atlet_ids,tanggal,hasil,status,validasi,ref_luar,akses_id,pelapor_nama,foto_path,nilai_teks,lawan,jam,keterangan,partai_id')
    .eq('kontingen_id', s.kontingen_id).eq('cabor_id', s.cabor_id).gte('tanggal', geser(-2)).lte('tanggal', geser(2))
  const konida = await aksesKonida(db, s.kontingen_id)
  const dekat = (sekitar ?? []).map((l: any) => ({ ...l, bukan_pic: bukanDariPic(l, konida) })) as any[]

  if (mintaCepat) {
    const pic = laporanPicSudahAda({ cabor_id: s.cabor_id, nomor_teks: isi.nomor_teks, tanggal }, dekat)
    if (pic) return NextResponse.json({ error: `${pic.pelapor_nama ?? 'PIC'} sudah melaporkan hasil nomor ini (#${pic.id}). Tidak perlu jalur cepat — sahkan laporan itu di Antrean.` }, { status: 409 })
  }
  const cocok = mintaCepat ? null : cocokJalurCepat({ cabor_id: s.cabor_id, nomor_teks: isi.nomor_teks, hasil: isi.hasil, atlet_ids: isi.atlet_ids, tanggal }, dekat as BarisCepat[])

  // Kembar: medali yang menunggu bukti PIC (jalur cepat, situs, Input Langsung) bukan "laporan
  // kembar" bagi PIC — itu ditangani pencocokan di atas.
  const kunci = kunciKembar({ ...isi, tanggal })
  if (dekat.some((l: any) => l.tanggal === tanggal && l.status !== 'ditolak' && (mintaCepat || (!l.validasi && !menungguPic(l))) && adalahFinal(l.hasil) && kunciKembar(l) === kunci))
    return NextResponse.json({ error: 'Hasil akhir nomor ini untuk atlet yang sama sudah dilaporkan untuk tanggal ini.' }, { status: 409 })

  let foto_path: string | null = null
  if (foto) {
    const unggah = await simpanFotoBukti(`${s.kontingen_id}/${tanggal}`, foto)
    if ('error' in unggah) return NextResponse.json({ error: unggah.error }, { status: unggah.status })
    foto_path = unggah.path
  }

  const kini = new Date().toISOString()
  const keputusan = mintaCepat
    ? { status: 'disahkan', diputus_oleh: 'Superadministrator', diputus_at: kini, validasi: 'menunggu_pic' }
    : cocok?.jenis === 'cocok'
      ? { status: 'ditolak', diputus_oleh: 'Sistem · validasi jalur cepat', diputus_at: kini, alasan_tolak: ALASAN_VALIDASI(cocok.id), memvalidasi_id: cocok.id }
      : {}
  const { data: baru, error } = await db.from('laporan_hasil').insert({
    kontingen_id: s.kontingen_id, cabor_id: s.cabor_id,
    ...isi, disiplin, tanggal, foto_path, partai_id,
    akses_id: s.akses_id, pelapor_nama: s.nama_pic, pelapor_wa: s.no_wa,
    pengisi_nama: pengisi.nama, pengisi_jabatan: pengisi.jabatan,
    ...keputusan,
  }).select('id').single()
  if (error) {
    if (foto_path) await db.storage.from(WADAH_BUKTI).remove([foto_path])   // jangan tinggalkan foto yatim
    return NextResponse.json({ error: 'Gagal menyimpan. Coba lagi.' }, { status: 500 })
  }

  // Laporan PIC ↔ medali jalur cepat.
  let pesan: string | null = null
  if (cocok) {
    const cepat = dekat.find((l: any) => l.id === cocok.id)
    const ubah = cocok.jenis === 'cocok'
      ? { validasi: 'tervalidasi', validasi_laporan_id: baru.id, validasi_oleh: s.nama_pic, validasi_at: kini,
          ...lengkapiDariPic(cepat ?? {}, { foto_path, nilai_teks: isi.nilai_teks, lawan: isi.lawan, jam: isi.jam, keterangan: isi.keterangan, partai_id }) }
      : { validasi: 'bentrok', validasi_laporan_id: baru.id, validasi_oleh: s.nama_pic, validasi_at: kini }
    const { data: kena } = await db.from('laporan_hasil').update({ ...ubah, updated_at: kini })
      .eq('id', cocok.id).eq('kontingen_id', s.kontingen_id).or('validasi.eq.menunggu_pic,validasi.is.null').select('id')
    if (!kena?.length && cocok.jenis === 'cocok') {
      // Sudah divalidasi laporan lain di saat bersamaan: laporan ini masuk Antrean seperti biasa.
      await db.from('laporan_hasil').update({ status: 'menunggu', diputus_oleh: null, diputus_at: null, alasan_tolak: null, memvalidasi_id: null }).eq('id', baru.id)
    } else if (kena?.length) {
      pesan = cocok.jenis === 'cocok'
        ? 'Terima kasih — laporan Anda memvalidasi medali yang sudah dicatat KONI Kab. Bandung. ✓'
        : 'Laporan Anda berbeda dengan medali yang sudah dicatat KONI Kab. Bandung. KONIDA akan memeriksanya.'
      await writeAudit({
        action: cocok.jenis === 'cocok' ? 'LAPOR_HASIL_VALIDASI_CEPAT' : 'LAPOR_HASIL_BENTROK_CEPAT', resource: 'laporan_hasil', resource_id: cocok.id,
        actor_id: `lapor_akses:${s.akses_id}`, actor_email: s.nama_pic, actor_role: 'pic_lapangan', kontingen_id: s.kontingen_id,
        payload: { laporan_pic: baru.id, ...(cocok.jenis === 'bentrok' ? { alasan: cocok.alasan } : {}) }, ...reqMeta(req),
      })
    }
  }
  if (mintaCepat || cocok?.jenis === 'cocok') segarkanPublik()

  await writeAudit({
    action: mintaCepat ? 'LAPOR_HASIL_JALUR_CEPAT' : 'LAPOR_HASIL_KIRIM', resource: 'laporan_hasil', resource_id: baru.id,
    actor_id: `lapor_akses:${s.akses_id}`, actor_email: s.nama_pic, actor_role: s.jalur === 'konida' ? 'konida_langsung' : 'pic_lapangan',
    kontingen_id: s.kontingen_id, payload: { cabor_id: s.cabor_id, hasil: isi.hasil, nomor: isi.nomor_teks, foto: !!foto_path, partai_id, pengisi },
    ...reqMeta(req),
  })
  // Partainya sudah dimainkan: tandai selesai supaya halaman publik ikut berubah.
  if (partai_id) {
    await db.from('jadwal_partai').update({ status: 'selesai', diubah_oleh: s.nama_pic, updated_at: new Date().toISOString() }).eq('id', partai_id)
    segarkanPublik()
  }
  return NextResponse.json({ ok: true, id: baru.id, ...(mintaCepat ? { jalur_cepat: true } : {}), ...(pesan ? { pesan } : {}) })
}
