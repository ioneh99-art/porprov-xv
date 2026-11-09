// scripts/uji-dayung-data-awal.ts — mengunci isian data awal & pengukuran atlet Dayung.
// Dijalankan: npm run uji:dayung-data-awal
import {
  bacaBarisTemplate, bacaNilai, gabungDataAwal, indeksRentang, pace500, perkembangan, tampilNilai, tanggalLahirWajar,
} from '../src/lib/dayung-data-awal'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

// --- membaca isian ---
cek('tinggi angka', bacaNilai('tinggi_badan', '172'), { nilai: 172 })
cek('berat pakai koma', bacaNilai('berat_badan', '68,5'), { nilai: 68.5 })
cek('kosong → null tanpa galat', bacaNilai('tinggi_badan', ''), { nilai: null })
cek('ergo 2000 m:ss.d', bacaNilai('ergo_2000', '6:45.3'), { nilai: 405.3 })
cek('ergo dalam detik', bacaNilai('ergo_500', '95.4'), { nilai: 95.4 })
cek('tinggi di luar batas', bacaNilai('tinggi_badan', '17.2').galat?.startsWith('di luar batas'), true)
cek('ergo salah format', bacaNilai('ergo_2000', '6 menit').galat, 'format waktu m:ss.d')
cek('ukuran tak dikenal', bacaNilai('lari', '1').galat, 'ukuran tidak dikenal')

// --- tampilan ---
cek('tampil waktu', [tampilNilai('ergo_2000', 405.3), tampilNilai('ergo_500', 95.4)], ['6:45.3', '1:35.4'])
cek('tampil angka', [tampilNilai('tinggi_badan', 172), tampilNilai('berat_badan', 68.5), tampilNilai('x', null)], ['172', '68.5', '—'])
cek('pace per 500 m', [pace500('ergo_2000', 405.3), pace500('ergo_500', 95.4), pace500('tinggi_badan', 170)], [101.3, 95.4, null])
cek('indeks rentang lengan', [indeksRentang(180, 172), indeksRentang(null, 172)], [1.05, null])

// --- penggabungan dengan data lama ---
const G = gabungDataAwal({
  tglLahirLokal: '2003-02-01', tglLahirIsian: '2003-02-02',
  tesFisik: { tanggal: '2026-04-11', tinggi: 170, berat: 65 },
  pengukuran: [
    { item: 'tinggi_badan', tanggal: '2026-11-10', nilai: 171 },
    { item: 'ergo_2000', tanggal: '2026-11-10', nilai: 410 },
    { item: 'ergo_2000', tanggal: '2026-12-10', nilai: 402.5 },
  ],
})
cek('gabung: tgl lahir Data Atlet didahulukan', [G.tglLahir, G.sumberTglLahir], ['2003-02-01', 'Data Atlet'])
cek('gabung: tinggi riwayat dari 2 sumber', G.riwayat.tinggi_badan.map(u => [u.tanggal, u.nilai, u.sumber]), [['2026-04-11', 170, 'Tes Biomotorik'], ['2026-11-10', 171, 'Isian PODSI']])
cek('gabung: terkini tinggi = isian baru', G.terkini.tinggi_badan.nilai, 171)
cek('gabung: berat dari tes biomotorik', [G.terkini.berat_badan.nilai, G.terkini.berat_badan.sumber], [65, 'Tes Biomotorik'])
cek('gabung: ergo terkini', G.terkini.ergo_2000.nilai, 402.5)
const G2 = gabungDataAwal({ tglLahirIsian: '2005-01-01', tesFisik: { tanggal: '2026-04-11', tinggi: 160, berat: null }, pengukuran: [{ item: 'tinggi_badan', tanggal: '2026-04-11', nilai: 161 }] })
cek('gabung: isian tanggal sama mengalahkan tes biomotorik', [G2.riwayat.tinggi_badan.length, G2.terkini.tinggi_badan.nilai], [1, 161])
cek('gabung: tgl lahir isian bila Data Atlet kosong', G2.sumberTglLahir, 'Isian PODSI')
cek('gabung kosong', gabungDataAwal({}).tglLahir, null)

// --- perkembangan ---
cek('ergo membaik (waktu turun)', perkembangan('ergo_2000', G.riwayat.ergo_2000), { awal: 410, terkini: 402.5, selisih: -7.5, membaik: true, kali: 2 })
cek('kekuatan membaik (naik)', perkembangan('bench_pull', [{ tanggal: '2026-01-01', nilai: 60 }, { tanggal: '2026-03-01', nilai: 65 }])?.membaik, true)
cek('kekuatan menurun', perkembangan('pull_up', [{ tanggal: '2026-01-01', nilai: 12 }, { tanggal: '2026-03-01', nilai: 10 }])?.membaik, false)
cek('postur tidak dinilai baik/buruk', perkembangan('berat_badan', [{ tanggal: '2026-01-01', nilai: 60 }, { tanggal: '2026-03-01', nilai: 62 }])?.membaik, null)
cek('satu ukuran = titik nol saja', perkembangan('ergo_500', [{ tanggal: '2026-01-01', nilai: 95 }]), { awal: 95, terkini: 95, selisih: 0, membaik: null, kali: 1 })
cek('tanpa riwayat', perkembangan('ergo_500', []), null)

// --- template Excel ---
const B = bacaBarisTemplate({ situs_id: '4285', nama: 'Indra', tgl_lahir: '17/05/2004', tinggi_badan: '172', ergo_2000: '6:45.3', pull_up: '' })!
cek('template: baris lengkap', [B.situs_id, B.tgl_lahir, B.nilai, B.galat], [4285, '2004-05-17', { tinggi_badan: 172, ergo_2000: 405.3 }, []])
cek('template: tanggal Excel', bacaBarisTemplate({ situs_id: 1, tgl_lahir: new Date('2004-05-17T00:00:00Z') })!.tgl_lahir, '2004-05-17')
const C = bacaBarisTemplate({ situs_id: 2, tgl_lahir: '31/02/2004', berat_badan: '500' })!
cek('template: tanggal mustahil & berat tak wajar → galat', [C.tgl_lahir, C.galat.length, Object.keys(C.nilai).length], [null, 2, 0])
cek('template: tanpa situs_id → dilewati', bacaBarisTemplate({ nama: 'x' }), null)
cek('tanggal lahir wajar', ['2004-05-17', '1950-01-01', '2020-01-01', '2004-02-30'].map(tanggalLahirWajar), [true, false, false, false])

console.log(`uji dayung-data-awal: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
