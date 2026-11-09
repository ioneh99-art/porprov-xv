// scripts/uji-dayung-jabar.ts — mengunci cara membaca data Dayung se-Jabar dari situs panitia.
// Contoh halaman asli (9 Nov 2026) ada di scripts/contoh-situs/dayung-*.html.
// Dijalankan: npm run uji:dayung-jabar
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  bacaAtlet, bacaDaftarAtlet, bacaLagaDayung, bacaRefJadwal, cocokKontingen, detikDari, genderDari,
  idDariSlug, klasemenDayung, urutkanDemo, waktuTeks,
} from '../src/lib/dayung-jabar'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const contoh = (f: string) => readFileSync(join(__dirname, 'contoh-situs', f), 'utf8')

// --- bantuan ---
cek('slug → id', idDariSlug('indra-hidayat-4285'), 4285)
cek('gender putra/putri/campuran', ['K-1 500 M Putra', 'C-2 Putri', 'Mixed DBR', 'tanpa'].map(genderDari), ['L', 'P', 'MIX', null])
cek('waktu m:ss.cc', detikDari('1:29.96'), 89.96)
cek('waktu ss.cc', detikDari('45.12'), 45.12)
cek('waktu h:mm:ss', detikDari('1:02:03.4'), 3723.4)
cek('waktu kosong/teks → null', [detikDari(''), detikDari('DNS'), detikDari(null)], [null, null, null])
cek('detik → teks', [waktuTeks(89.96), waktuTeks(45.1), waktuTeks(null)], ['1:29.96', '45.10', '—'])

// --- daftar atlet ---
const D = bacaDaftarAtlet(contoh('dayung-daftar-atlet-hal1.html'))
cek('daftar: total 466, 8 halaman', [D.total, D.halTotal], [466, 8])
cek('daftar: 60 atlet per halaman', D.atlet.length, 60)
cek('daftar: atlet pertama', D.atlet[0], { situsId: 11678, slug: 'moch-septian-alek-mukt-11678', nama: 'Moch Septian Alek Mukt', kontingen: 'Kota Depok', kontingenSitusId: 20, gender: 'L' })
cek('daftar: semua punya kontingen & gender', D.atlet.every(a => a.kontingen && a.gender), true)

// --- halaman atlet ---
const A = bacaAtlet(contoh('dayung-atlet-indra-hidayat.html'))!
cek('atlet: nama/kontingen/disiplin/gender', [A.nama, A.kontingen, A.disiplin, A.gender], ['Indra Hidayat', 'Kab. Bandung', 'Dayung Canoeing', 'L'])
cek('atlet: medali 1/1/0', [A.emas, A.perak, A.perunggu], [1, 1, 0])
cek('atlet: laga yang diikuti', [...A.lagaRefs].sort(), [3296, 3297, 3917].sort())

// --- laga selesai (K-4 500 M Putra, final) ---
const L = bacaLagaDayung(contoh('dayung-laga-3917-selesai.html'), 3917)!
cek('laga: kepala', [L.tanggal, L.jam, L.disiplin, L.nomor, L.gender, L.babak, L.kode, L.selesai, L.perebutanMedali],
  ['2026-11-08', '08:53', 'Dayung Canoeing', 'Canoeing - K - 4 500 M Putra', 'L', 'Final', 'F', true, true])
cek('laga: 6 perahu', L.peserta.length, 6)
cek('laga: juara 1', [L.peserta[0].peringkat, L.peserta[0].kontingen, L.peserta[0].medali, L.peserta[0].waktu, L.peserta[0].waktuDetik],
  [1, 'Kab. Bandung Barat', 'emas', '1:29.96', 89.96])
cek('laga: perak Kab. Bandung', [L.peserta[1].kontingen, L.peserta[1].medali, L.peserta[1].waktu], ['Kab. Bandung', 'perak', '1:30.65'])
cek('laga: awak tertulis 3 + lebih 1', [L.peserta[1].atlet.length, L.peserta[1].atletLebih, L.peserta[1].atlet[0].situsId], [3, 1, 4285])
cek('laga: tanpa medali di urutan 4+', L.peserta.slice(3).every(p => p.medali === null), true)

// --- laga terjadwal (belum ada hasil) ---
const T = bacaLagaDayung(contoh('dayung-laga-3319-terjadwal.html'), 3319)!
cek('terjadwal: belum selesai, final perebutan medali', [T.selesai, T.perebutanMedali, T.babak], [false, true, 'Final'])
cek('terjadwal: 6 peserta tanpa peringkat/waktu', [T.peserta.length, T.peserta.every(p => p.peringkat === null && p.waktuDetik === null)], [6, true])
cek('terjadwal: peserta kedua', [T.peserta[1].kontingen, T.peserta[1].atlet[0]?.nama], ['Kab. Bandung', 'Sanni Supriatna'])

// --- bukan dayung → null ---
cek('laga cabor lain → null', bacaLagaDayung(contoh('laga-786.html'), 786), null)

// --- jadwal ---
cek('jadwal: ref dari baris laga', bacaRefJadwal('<a class="mrow status-finished" href="/laga/12">x</a><a class="mrow" href="/laga/13">y</a><a class="mrow" href="/laga/12">z</a>'), [12, 13])

// --- kontingen & klasemen ---
const kont = [{ id: 4, nama: 'KAB. BANDUNG' }, { id: 11, nama: 'KAB. BANDUNG BARAT' }]
cek('kontingen: cocok persis, bukan awalan', [cocokKontingen('Kab. Bandung', kont), cocokKontingen('Kab. Bandung Barat', kont), cocokKontingen('Kota Depok', kont)], [4, 11, null])
cek('klasemen: urut emas → perak', klasemenDayung([L, { selesai: true, peserta: [{ kontingen: 'Kab. Bandung', medali: 'emas' }] }]).map(r => [r.kontingen, r.emas, r.perak, r.perunggu]),
  [['Kab. Bandung', 1, 1, 0], ['Kab. Bandung Barat', 1, 0, 0], ['Kab. Bekasi', 0, 0, 1]])

// --- mode demo ---
const U = urutkanDemo([
  { urutan: 1, waktuDetik: 92.1, status: 'ok' }, { urutan: 2, waktuDetik: 89.96, status: 'ok' },
  { urutan: 3, waktuDetik: 92.1, status: 'ok' }, { urutan: 4, waktuDetik: 95, status: 'ok' },
  { urutan: 5, waktuDetik: null, status: 'ok' }, { urutan: 6, waktuDetik: 80, status: 'DSQ' },
], true)
cek('demo: peringkat & seri', U.map(x => x.peringkat), [2, 1, 2, 4, null, null])
cek('demo: medali final (seri perak, tak ada perunggu)', U.map(x => x.medali), ['perak', 'emas', 'perak', null, null, null])
cek('demo: selisih dari tercepat', U.map(x => x.selisih), [2.14, 0, 2.14, 5.04, null, null])
cek('demo: heat tanpa medali', urutkanDemo([{ urutan: 1, waktuDetik: 50, status: 'ok' }], false)[0].medali, null)

console.log(`uji dayung-jabar: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
