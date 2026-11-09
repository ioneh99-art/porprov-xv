// scripts/uji-dayung-profil.ts — mengunci hitungan Profil Atlet Dayung.
// Dijalankan: npm run uji:dayung-profil
import { kelengkapan, kelompokUmur, lagaAtlet, ringkasPerforma, umurPada, type LagaRingkas, type PesertaRingkas } from '../src/lib/dayung-profil'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

// Atlet 1 (Kab. Bandung): heat K-1 1000 juara 1 → final emas; final K-4 500 perak; final C-2 tanpa medali.
const laga: LagaRingkas[] = [
  { ref: 10, tanggal: '2026-11-06', jam: '08:19', nomor: 'K-1 1000 M Putra', babak: 'Penyisihan', kode: 'H1', selesai: true, perebutan_medali: false },
  { ref: 11, tanggal: '2026-11-06', jam: '15:40', nomor: 'K-1 1000 M Putra', babak: 'Final', kode: 'F', selesai: true, perebutan_medali: true },
  { ref: 12, tanggal: '2026-11-08', jam: '08:53', nomor: 'K-4 500 M Putra', babak: 'Final', kode: 'F', selesai: true, perebutan_medali: true },
  { ref: 13, tanggal: '2026-11-08', jam: '10:00', nomor: 'C-2 500 M Putra', babak: 'Penyisihan', kode: 'H1', selesai: true, perebutan_medali: false },
  { ref: 14, tanggal: '2026-11-08', jam: '14:00', nomor: 'C-2 500 M Putra', babak: 'Final', kode: 'F', selesai: true, perebutan_medali: true },
  { ref: 15, tanggal: '2026-11-08', jam: '15:00', nomor: 'K-2 200 M Putra', babak: 'Penyisihan', kode: 'H1', selesai: false, perebutan_medali: false },
]
const P = (laga_ref: number, urutan: number, kontingen: string, peringkat: number | null, waktu_detik: number | null, ids: number[], medali: PesertaRingkas['medali'] = null): PesertaRingkas =>
  ({ laga_ref, urutan, kontingen, peringkat, medali, waktu: waktu_detik ? String(waktu_detik) : null, waktu_detik, atlet_situs_ids: ids, atlet_nama: ids.map(i => `A${i}`) })
const peserta: PesertaRingkas[] = [
  P(10, 1, 'Kab. Bandung', 1, 250, [1]), P(10, 2, 'Kota Depok', 2, 255, [2]),
  P(11, 1, 'Kab. Bandung', 1, 245, [1], 'emas'), P(11, 2, 'Kota Depok', 2, 247, [2], 'perak'),
  P(12, 1, 'KBB', 1, 89.96, [5, 6, 7, 8], 'emas'), P(12, 2, 'Kab. Bandung', 2, 90.65, [1, 3, 4, 9], 'perak'), P(12, 3, 'Kab. Bekasi', 3, 93.9, [10], 'perunggu'),
  P(13, 1, 'Kab. Bandung', 3, 120, [1, 3]), P(13, 2, 'Kota Bogor', 1, 115, [20]),
  P(14, 1, 'Kota Bogor', 1, 110, [20], 'emas'), P(14, 2, 'KBB', 2, 111, [21], 'perak'), P(14, 3, 'Kab. Bekasi', 3, 112, [22], 'perunggu'),
  P(15, 1, 'Kab. Bandung', null, null, [1, 4]),
]

const R = lagaAtlet(1, laga, peserta)
cek('laga atlet 1: urut tanggal/jam', R.map(r => r.ref), [10, 11, 12, 13, 15])
cek('heat → lolos final', R.find(r => r.ref === 10)!.lolosFinal, true)
cek('heat → tidak lolos final', R.find(r => r.ref === 13)!.lolosFinal, false)
cek('heat tanpa final diketahui → null', R.find(r => r.ref === 15)!.lolosFinal, null)
cek('juara: 100% & selisih 0', [R[1].persenJuara, R[1].selisihJuara], [100, 0])
cek('K-4 perak: 99.2% & +0.69', [R[2].persenJuara, R[2].selisihJuara, R[2].selisihMedali], [99.2, 0.69, null])
cek('rekan perahu', R[2].rekan, ['A3', 'A4', 'A9'])
cek('jumlah perahu', R[2].jumlahPerahu, 3)

// Final tanpa medali → selisih ke perunggu
const R3 = lagaAtlet(21, laga, [...peserta, P(14, 4, 'Kota Depok', 4, 113.5, [30])])
cek('final peringkat 2 → selisih medali null (dapat perak)', R3[0].selisihMedali, null)
const R4 = lagaAtlet(30, laga, [...peserta, P(14, 4, 'Kota Depok', 4, 113.5, [30])])
cek('final peringkat 4 → +1.5 dari perunggu', R4[0].selisihMedali, 1.5)

const S = ringkasPerforma(R)
cek('ringkas: jumlah', [S.laga, S.selesai, S.final], [5, 4, 2])
cek('ringkas: medali', [S.emas, S.perak, S.perunggu], [1, 1, 0])
cek('ringkas: persen rata & terbaik', [S.persenRata, S.persenTerbaik], [98.8, 100])
cek('ringkas: terdekat ke emas', S.terdekatEmas, { nomor: 'K-4 500 M Putra', selisih: 0.69 })
cek('ringkas: terbaik per nomor', S.terbaikPerNomor.map(t => [t.nomor, t.waktuDetik]), [['K-1 1000 M Putra', 245], ['K-4 500 M Putra', 90.65], ['C-2 500 M Putra', 120]])
cek('ringkas: lolos heat 1 dari 2', S.lolosHeat, { lolos: 1, dari: 2 })
cek('ringkas: beban maks per hari', S.bebanMaksHarian, 3)
cek('ringkas kosong', ringkasPerforma([]).persenRata, null)

// Umur
cek('umur: sebelum ulang tahun', umurPada('2000-11-08'), 25)
cek('umur: tepat ulang tahun', umurPada('2000-11-07'), 26)
cek('umur kosong', umurPada(null), null)
cek('kelompok umur', [18, 19, 23, 24, null].map(kelompokUmur), ['U-18', 'U-23', 'U-23', 'Senior', null])

// Kelengkapan
const K = kelengkapan({ tanggalLahir: true, hasilLomba: true, bpjs: true })
cek('kelengkapan: 3 dari 10 = 30%', [K.ada, K.total, K.persen], [3, 10, 30])
cek('kelengkapan: lapis', Array.from(new Set(K.butir.map(b => b.lapis))), ['Identitas', 'Performa', 'Manajemen'])
cek('kelengkapan kosong', kelengkapan({}).persen, 0)

console.log(`uji dayung-profil: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
