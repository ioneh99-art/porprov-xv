// scripts/uji-arsip-konijabar.ts — mengunci pembaca semua jenis halaman situs panitia PORPROV XV.
// Contoh halaman asli (arsip 20 Nov 2026, setelah penutupan) di scripts/contoh-situs/arsip/*.html.gz.
// Dijalankan: npm run uji:arsip-konijabar
import { readFileSync } from 'fs'
import { join } from 'path'
import { gunzipSync } from 'zlib'
import * as P from '../src/lib/arsip-konijabar'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const arsip = (f: string) => gunzipSync(readFileSync(join(__dirname, 'contoh-situs', 'arsip', f))).toString()
const contoh = (f: string) => readFileSync(join(__dirname, 'contoh-situs', f), 'utf8')

// --- bantuan ---
cek('id akhir slug', [P.idAkhir('indra-hidayat-4285'), P.idAkhir('/nomor/tenis-beregu-putra-1021'), P.idAkhir('tanpa')], [4285, 1021, null])
cek('waktu → detik', [P.detikDari('1:29.96'), P.detikDari('1:02:03.4'), P.detikDari('45.12'), P.detikDari('DNS')], [89.96, 3723.4, null, null])
cek('nilai angka', [P.angkaNilai('8,750'), P.angkaNilai('1:29.96'), P.angkaNilai('120 kg'), P.angkaNilai(''), P.angkaNilai('DNF')], [8.75, 89.96, 120, null, null])
cek('gender', ['Beregu Putra', 'Tunggal Putri', 'Ganda Campuran', 'Kelas 52 Kg'].map(P.genderDari), ['L', 'P', 'MIX', null])

// --- klasemen & ringkasan (halaman awal) ---
const K = P.bacaKlasemenMedali(arsip('index.html.gz'))
cek('klasemen: 27 kontingen', K.length, 27)
cek('klasemen: juara umum', K[0], { situsId: 2, slug: 'kota-bekasi', nama: 'Kota Bekasi', peringkat: 1, emas: 236, perak: 161, perunggu: 163, total: 560 })
cek('klasemen: Kab. Bandung', K.find(k => k.slug === 'kab-bandung'), { situsId: 16, slug: 'kab-bandung', nama: 'Kab. Bandung', peringkat: 6, emas: 65, perak: 69, perunggu: 98, total: 232 })
cek('klasemen: jumlah emas = 1.154', K.reduce((s, k) => s + k.emas, 0), 1154)
const R = P.bacaRingkasanAcara(arsip('index.html.gz'))
cek('ringkasan acara', [R.nomorBerjuara, R.nomorTotal, R.emas, R.perak, R.perunggu], [1153, 1154, 1154, 1151, 1549])

// --- kontingen ---
const DK = P.bacaDaftarKontingen(arsip('kontingen_index.html.gz'))
cek('daftar kontingen', [DK.length, DK[0]], [27, { situsId: 16, slug: 'kab-bandung', nama: 'Kab. Bandung', peringkat: 6 }])
cek('kontingen rinci', P.bacaKontingen(arsip('kontingen_kab-bandung.html.gz')),
  { nama: 'Kab. Bandung', situsId: 16, peringkat: 6, laga: 1321, menang: 357, atlet: 925, emas: 65, perak: 69, perunggu: 98 })

// --- cabor ---
const DC = P.bacaDaftarCabor(arsip('cabor_index.html.gz'))
cek('daftar cabor: 75, 1.154 nomor', [DC.length, DC.reduce((s, c) => s + (c.nomor ?? 0), 0)], [75, 1154])
cek('daftar cabor: pertama', DC[0], { slug: 'aeromodelling', nama: 'Aeromodelling', nomor: 16, selesai: 16, rentang: '11-19 November' })
const C = P.bacaCabor(arsip('cabor_dayung.html.gz'))!
cek('cabor dayung: kepala', [C.situsId, C.nama, C.jumlahNomor, C.rentang, C.jumlahAtlet], [9, 'Dayung', 54, '6-18 November', 459])
cek('cabor dayung: disiplin', C.disiplin.map(d => [d.situsId, d.nama]), [[9, 'Dayung Canoeing'], [80, 'Dayung Dbr'], [52, 'Dayung Rowing']])
cek('cabor dayung: jadwal disiplin', C.disiplin[0].jadwal, [
  { rentang: '6-9 November', venueSitusId: 91, venue: 'Situ Cipule, Kab. Karawang' },
  { rentang: '10-13 November', venueSitusId: 110, venue: 'Bendung Curug, Kab. Karawang' }])
cek('cabor dayung: 54 nomor = 27 + 9 + 18', [C.nomor.length, ...[9, 80, 52].map(d => C.nomor.filter(n => n.disiplinSitusId === d).length)], [54, 27, 9, 18])
cek('cabor dayung: nomor pertama', C.nomor[0], { situsId: 430, slug: 'dayung-canoeing-c-1-1000-m-putra-430', nama: 'Canoeing - C - 1 1000 M Putra', disiplinSitusId: 9, selesai: true })

// --- nomor beregu ---
const NB = P.bacaNomor(arsip('nomor_tenis-beregu-putra-1021.html.gz'))!
cek('nomor beregu: kepala', [NB.situsId, NB.caborSlug, NB.nama, NB.selesai, NB.rentang, NB.venueSitusId, NB.jumlahLaga, NB.jumlahPeserta],
  [1021, 'tenis', 'Beregu Putra', true, '10-15 November', 98, 25, 14])
cek('nomor beregu: podium 1-1-2', NB.podium.map(p => [p.medali, p.kontingenSlug, p.lagaRef, p.atlet.length]),
  [['emas', 'kab-bekasi', 7681, 4], ['perak', 'kab-bogor', 7681, 5], ['perunggu', 'kota-tasikmalaya', null, 4], ['perunggu', 'kab-karawang', null, 4]])
cek('nomor beregu: atlet emas', NB.podium[0].atlet[0], { slug: 'michal-ihsan-wicaksana-15298', situsId: 15298, nama: 'Michal Ihsan Wicaksana' })

// --- nomor perorangan (nm-who = atlet, kontingen di nm-team) ---
const NP = P.bacaNomor(arsip('nomor_dayung-canoeing-c-1-1000-m-putra-430.html.gz'))!
cek('nomor perorangan: kepala', [NP.situsId, NP.kicker, NP.jumlahLaga, NP.jumlahPeserta], [430, 'Dayung · Dayung Canoeing', 1, 6])
cek('nomor perorangan: podium', NP.podium.map(p => [p.medali, p.kontingen, p.atlet.map(a => a.nama)]),
  [['emas', 'Kota Depok', ['Rudiansyah']], ['perak', 'Kab. Bandung Barat', ['Akmal Thoriq']], ['perunggu', 'Kota Bogor', ['Ikballana Ikhsan']]])
cek('nomor perorangan: slug kontingen & laga', [NP.podium[0].kontingenSlug, NP.podium[0].lagaRef, NP.podium[0].atlet[0].situsId], ['kota-depok', 4955, 11710])

// --- venue ---
const V = P.bacaVenue(arsip('klaster_index.html.gz'))
cek('venue: 78 dengan 6 klaster', [V.length, new Set(V.flatMap(v => v.klaster)).size], [78, 6])
cek('venue: koordinat & cabor', [V[0].situsId, V[0].klaster, V[0].cabor, V[0].lokasi[0].lat, V[0].lokasi[0].lng], [51, ['Kota Bekasi'], ['Akuatik', 'Selam'], -6.309856, 107.182634])

// --- atlet ---
const A = P.bacaAtletPenuh(contoh('dayung-atlet-indra-hidayat.html'))!
cek('atlet', [A.nama, A.kontingenSlug, A.caborSlug, A.cabor, A.disiplin, A.gender, A.emas, A.perak, A.lagaRefs.length],
  ['Indra Hidayat', 'kab-bandung', 'dayung', 'Dayung', 'Dayung Canoeing', 'L', 1, 1, 3])

// --- laga duel ---
const LD = P.bacaLagaPenuh(contoh('laga-786.html'), 786)!
cek('laga duel: kepala', [LD.bentuk, LD.nomorSitusId, LD.caborSitusId, LD.tanggal, LD.jam, LD.cabor, LD.babak, LD.kode, LD.klaster, LD.selesai],
  ['duel', 527, 26, '2026-11-04', '15:19', 'Gulat', 'Penyisihan', 'P110', 'Kota Bekasi', true])
cek('laga duel: sisi', LD.peserta.map(p => [p.sisi, p.kontingenSlug, p.menang, p.skor, p.atlet.map(a => a.situsId)]),
  [['a', 'kab-bandung', true, 8, [507]], ['b', 'kota-cirebon', false, 0, [5376]]])

// --- laga peringkat ---
const LP = P.bacaLagaPenuh(contoh('dayung-laga-3917-selesai.html'), 3917)!
cek('laga peringkat: kepala', [LP.bentuk, LP.perebutanMedali, LP.nomorSitusId, LP.peserta.length], ['peringkat', true, 435, 6])
cek('laga peringkat: juara', [LP.peserta[0].peringkat, LP.peserta[0].medali, LP.peserta[0].kontingenSlug, LP.peserta[0].nilai, LP.peserta[0].nilaiAngka, LP.peserta[0].atletLebih],
  [1, 'emas', 'kab-bandung-barat', '1:29.96', 89.96, 1])
const LT = P.bacaLagaPenuh(contoh('dayung-laga-3319-terjadwal.html'), 3319)!
cek('laga terjadwal: tanpa peringkat', [LT.selesai, LT.peserta.length, LT.peserta.every(p => p.peringkat === null && p.nilai === null)], [false, 6, true])

// --- laga bentuk setelah penutupan (tautan /nomor/<nama>-N, bukan /bagan?nomor=N) ---
const LB = P.bacaLagaPenuh(arsip('laga_3917.html.gz'), 3917)!
cek('laga 20 Nov: nomor dari tautan /nomor/', [LB.nomorSitusId, LB.caborSitusId, LB.bentuk, LB.peserta.length, LB.peserta[0].nilai], [435, 9, 'peringkat', 6, '1:29.96'])
const LG = P.bacaLagaPenuh(arsip('laga_786.html.gz'), 786)!
cek('laga duel 20 Nov: nomor dari tautan /nomor/', [LG.nomorSitusId, LG.bentuk, LG.peserta.map(p => p.kontingenSlug)], [527, 'duel', ['kab-bandung', 'kota-cirebon']])

const AB = P.bacaAtletPenuh(arsip('atlet_a-erin-novitasari-11279.html.gz'))!
cek('atlet 20 Nov: drumband, 2 perunggu, 9 laga', [AB.nama, AB.kontingenSlug, AB.caborSlug, AB.disiplin, AB.gender, AB.perunggu, AB.lagaRefs.length],
  ["A'erin Novitasari", 'kab-cirebon', 'drumband', 'Drum Band', 'P', 2, 9])

console.log(`uji arsip-konijabar: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
