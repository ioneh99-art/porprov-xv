// scripts/uji-head-to-head.ts — pembaca situs panitia & aturan Head-to-Head. Dijalankan: npm run uji:head-to-head
import { bacaBagan, bacaDaftarAtlet, bacaDaftarBagan, bacaPilihanCabor, cocokBagan, genderNomor, kontingenDisebut } from '../src/lib/lawan-luar'
import { calonLawan, grupKita, lawanDariBagan, namaDisebut } from '../src/lib/head-to-head'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

// Potongan HTML mengikuti bentuk asli situs (2 Nov 2026).
const orang = (slug: string, ref: number, nama: string, k: string, cabor: string, g: string, foto = true) =>
  `<li class="rv"> <a class="person" href="/atlet/${slug}-${ref}"> ${foto ? `<img class="person-avatar has-photo" src="/foto/${ref}-96.webp?v=ab" alt="">` : '<span class="person-avatar"></span>'} <span class="person-body"> <span class="person-name">${nama}</span> <span class="person-meta"><img class="badge" src="/logo/1-64.webp" alt="">${k}</span> <span class="person-meta"><img class="sport-icon" src="/s.svg" alt="">${cabor}<span class="sep"></span>${g}</span> </span> </a> </li>`
const daftar = `<h2 class="section-title results-title"> 229 atlet, Akuatik <span class="count">hal. 2/4</span> </h2><ul class="people">${orang('adellia', 14637, 'Adellia', 'Kab. Bekasi', 'Akuatik', 'Putri')}${orang('budi-santoso', 20, 'Budi Santoso', 'Kota Bandung', 'Akuatik', 'Putra', false)}</ul>`
const d = bacaDaftarAtlet(daftar)
cek('daftar: jumlah & halaman', [d.atlet.length, d.halaman, d.totalHalaman], [2, 2, 4])
cek('daftar: atlet berfoto', d.atlet[0], { ref: 14637, slug: 'adellia-14637', nama: 'Adellia', kontingen: 'Kab. Bekasi', cabor: 'Akuatik', gender: 'P', foto: 'https://porprov.konijabar.or.id/foto/14637-96.webp?v=ab' })
cek('daftar: tanpa foto & putra', [d.atlet[1].foto, d.atlet[1].gender], [null, 'L'])
cek('pilihan cabor', bacaPilihanCabor('<select name="kontingen"><option value="16">Kab. Bandung</option></select><select name="cabor"><option value="">Semua</option><option value="52">Akuatik</option><option value="51">Anggar</option></select>'), [{ id: 52, nama: 'Akuatik' }, { id: 51, nama: 'Anggar' }])
const daftarBagan = bacaDaftarBagan('{"@type":"ListItem","position":1,"name":"Hockey Beregu Putra","url":"https://porprov.konijabar.or.id/bagan?nomor=556"},{"@type":"ListItem","position":2,"name":"Hockey Beregu Putri","url":"https://porprov.konijabar.or.id/bagan?nomor=557"},{"name":"Muaythai Kelas 51 Kg Putra","url":"https://porprov.konijabar.or.id/bagan?nomor=706"},{"name":"Muaythai Kelas 54 Kg Putra","url":"https://porprov.konijabar.or.id/bagan?nomor=707"},{"name":"Panahan Recurve Beregu Putra","url":"https://porprov.konijabar.or.id/bagan?nomor=900"},{"name":"Panahan Recurve Perorangan Putra","url":"https://porprov.konijabar.or.id/bagan?nomor=901"}')
cek('daftar bagan', daftarBagan.length, 6)
cek('cocok bagan: beregu putra', cocokBagan('Hockey', 'Beregu Putra (Pa)', daftarBagan)?.ref, 556)
cek('cocok bagan: beregu putri', cocokBagan('Hockey', 'Beregu Putri (Pi)', daftarBagan)?.ref, 557)
cek('cocok bagan: kelas berat persis', cocokBagan('Muaythai', 'Kelas 51 Kg Putra', daftarBagan)?.ref, 706)
cek('cocok bagan: kelas tidak ada', cocokBagan('Muaythai', 'Kelas 60 Kg Putra', daftarBagan), null)
cek('cocok bagan: beregu vs perorangan dibedakan', cocokBagan('Panahan', 'Recurve - Aduan Beregu Putra', daftarBagan)?.ref, 900)
cek('cocok bagan: cabor lain tidak tertukar', cocokBagan('Gulat', 'Beregu Putra', daftarBagan), null)

const L2 = [
  { ref: 513, nama: 'Gulat Bebas - Kelas s/d 52 Kg Putra' }, { ref: 556, nama: 'Hockey Beregu Putra' },
  { ref: 801, nama: 'Kickboxing Creative Form (Open Hands) - Individual Putra' },
  { ref: 802, nama: 'Taekwondo Kyorugi - Fly (Under 49 Kg : max 46,01 kg - 49,00 kg) Putri' },
  { ref: 803, nama: 'Menembak 10  M Air Rifle Man Individu Putra' }, { ref: 804, nama: 'Dayung Canoeing - C - 1 200 M Putri' },
  { ref: 805, nama: 'Muaythai Kelas 54 Kg Putri' }, { ref: 806, nama: 'Muaythai Kelas 54 Kg Putra' },
]
cek('ketat: kelas berat beda ditolak', cocokBagan('Gulat', 'Grego - kelas s/d 67 kg', L2), null)
cek('ketat: kelas berat sama diterima', cocokBagan('Gulat', 'Bebas - Kelas s/d 52 Kg', L2)?.ref, 513)
cek('ketat: hoki outdoor ≠ bagan hockey indoor', cocokBagan('Hockey', 'Beregu Putra', L2, { caborTeks: 'HOKI OUTDOOR' }), null)
cek('ketat: team ≠ individual', cocokBagan('Kickboxing', 'Creative Form (Open Hands) - Team', L2), null)
cek('ketat: taekwondo kelas beda', cocokBagan('Taekwondo', 'Gyorugi - Feather (Under 68 Kg : max 63,01 kg - 68,00 kg)', L2), null)
cek('ketat: pistol ≠ rifle', cocokBagan('Menembak', '10 M AIR PISTOL PUTRA STANDAR INDIVIDU', L2), null)
cek('ketat: kano C1 200 putri', cocokBagan('Dayung', 'W C 1 - 200 M', L2)?.ref, 804)
cek('ketat: kayak K1 ≠ kano C1', cocokBagan('Dayung', 'M K 1 - 1000', [{ ref: 810, nama: 'Dayung Canoeing - C - 1 1000 M Putra' }]), null)
cek('ketat: tanpa putra/putri → pakai jenis kelamin atlet', [cocokBagan('Muaythai', 'Kelas 54 Kg', L2, { gender: 'L' })?.ref, cocokBagan('Muaythai', 'Kelas 54 Kg', L2)], [806, null])

const sisi = (k: string, nama: string, dk: string, skor: string, kelas = '') => `<span class="bk-side${kelas}" data-k="${dk}" title="${k}: ${nama}"> <img src="/logo/x.webp"> <span class="bk-name">${nama}</span> <span class="bk-score">${skor}</span> </span>`
const bagan = bacaBagan(
  `<a class="bk-card bk-static is-done" style="left:0" href="/laga/167" data-match="167"> <span class="bk-meta" title="A4 vs A3">A4 vs A3, 1 Nov, 09.30</span> ${sisi('Kab. Bandung', 'Kab. Bandung', '16-1.2', '0', ' is-lose')}${sisi('Kota Bandung', 'Kota Bandung', '3-5.6', '6', ' is-win')} </a>` +
  `<div class="bk-card is-empty" style="left:0"> <span class="bk-meta">R1-3 · Bye</span> <span class="bk-side is-tbd"><span class="bk-name">Geri</span></span><span class="bk-side is-tbd"><span class="bk-name">Bye</span></span> </div>` +
  `<a class="bk-card" style="left:0" href="/laga/273" data-match="273"> <span class="bk-meta">R1-4, 2 Nov, 15.30</span> ${sisi('Kab. Bandung', 'Asep Wandi', '16-5351', '')}${sisi('Kota Tasikmalaya', 'Redho', '12-1002', '')} </a>` +
  `<section class="sg-group sg-pool"><h3><span class="sg-pill">Grup A</span></h3><div data-pane="klasemen"><table><tbody>` +
  `<tr><td>1</td><td class="sg-who"><span>Kota Bandung</span></td><td>1</td><td>1</td><td>0</td><td>0</td><td><b>3</b></td></tr>` +
  `<tr><td>2</td><td class="sg-who"><span>Kab. Bandung</span></td><td>1</td><td>0</td><td>0</td><td>1</td><td><b>0</b></td></tr></tbody></table></div>` +
  `<div data-pane="matriks"><table class="sg-mx"><thead><tr><th></th><th title="Kota Bandung"></th><th title="Kab. Bandung"></th></tr></thead><tbody>` +
  `<tr><td class="sg-who"><span>Kota Bandung</span></td><td class="mx-self"></td><td class="mx-cell"><a class="mx-res is-w" href="/laga/167">6-0</a></td></tr>` +
  `<tr><td class="sg-who"><span>Kab. Bandung</span></td><td class="mx-cell"><a class="mx-res is-wait" href="/laga/190">7 Nov, 16.00</a></td><td class="mx-self"></td></tr></tbody></table></div></section>`)
cek('bagan: kartu terbaca (termasuk bye)', bagan.kartu.map(k => [k.laga, k.status, k.sisi.length]), [['167', 'selesai', 2], [null, 'bye', 2], ['273', 'jadwal', 2]])
cek('bagan: sisi tim (banyak atlet)', [bagan.kartu[0].sisi[0].kontingen_ref, bagan.kartu[0].sisi[0].atlet_ref, bagan.kartu[0].sisi[0].atlet_refs], [16, null, [1, 2]])
cek('bagan: sisi perorangan', [bagan.kartu[2].sisi[1].atlet_ref, bagan.kartu[2].sisi[1].kontingen], [1002, 'Kota Tasikmalaya'])
cek('bagan: grup', bagan.grup, [{ nama: 'Grup A', klasemen: [{ kontingen: 'Kota Bandung', main: 1, menang: 1, seri: 0, kalah: 0, poin: 3 }, { kontingen: 'Kab. Bandung', main: 1, menang: 0, seri: 0, kalah: 1, poin: 0 }] }])
cek('bagan: matriks', bagan.matriks.map(m => [m.laga, m.baris, m.kolom, m.teks, m.status]), [['167', 'Kota Bandung', 'Kab. Bandung', '6-0', 'selesai'], ['190', 'Kab. Bandung', 'Kota Bandung', '7 Nov, 16.00', 'jadwal']])

const lawan = lawanDariBagan(bagan, new Map([[1002, 'foto.webp']]))
cek('lawan pasti: kartu + matriks tanpa kembar', lawan.map(l => [l.laga, l.kontingen, l.skor_kita, l.skor_lawan, l.hasil]), [['167', 'Kota Bandung', '0', '6', 'kalah'], ['273', 'Kota Tasikmalaya', null, null, null], ['190', 'Kota Bandung', null, null, null]])
cek('lawan pasti: foto atlet lawan', lawan[1].foto, 'foto.webp')
cek('lawan pasti: tanpa bagan', lawanDariBagan(null, new Map()), [])
cek('grup kita', grupKita(bagan), { nama: 'Grup A', posisi: 2, jumlah: 2, klasemen: [{ kontingen: 'Kota Bandung', main: 1, poin: 3 }, { kontingen: 'Kab. Bandung', main: 1, poin: 0 }] })

cek('gender nomor', [genderNomor('Beregu Putri (Pi)'), genderNomor('Kelas 51 Kg Putra'), genderNomor('Eights (M8+) (Campuran)'), genderNomor('Beregu Terbuka')], ['P', 'L', null, null])
const semua = ['Kab. Bandung', 'Kota Bandung', 'Kab. Karawang', 'Kab. Bekasi', 'Kota Bekasi']
cek('disebut: kota lengkap', kontingenDisebut('KOTA BANDUNG', semua), ['Kota Bandung'])
cek('disebut: tanpa kab/kota', kontingenDisebut('Karawang, Syaifahmi Riski (RIAU, Total 705 kg)', semua), ['Kab. Karawang'])
cek('disebut: ambigu → keduanya', kontingenDisebut('Bekasi', semua), ['Kab. Bekasi', 'Kota Bekasi'])
cek('disebut: kosong', kontingenDisebut('', semua), [])
cek('disebut: singkatan BDG & kabupaten', kontingenDisebut('BOGOR,KOTA BDG, KABUPATEN KARAWANG', semua), ['Kota Bandung', 'Kab. Karawang'])
cek('nama disebut', namaDisebut('Karawang, Syaifahmi Riski (RIAU, Total 705 kg)', 'Syaifahmi Riski Pratama'), true)
cek('nama tidak disebut', namaDisebut('Karawang, Syaifahmi Riski', 'Ahmad Riski'), false)

const kolam = [
  { ref: 1, slug: 'a-1', nama: 'Syaifahmi Riski', kontingen: 'Kab. Karawang', cabor_id: 9, gender: 'L' as const, foto: 'f1' },
  { ref: 2, slug: 'b-2', nama: 'Budi', kontingen: 'Kota Bandung', cabor_id: 9, gender: 'L' as const, foto: null },
  { ref: 3, slug: 'c-3', nama: 'Cici', kontingen: 'Kota Bandung', cabor_id: 9, gender: 'P' as const, foto: null },
  { ref: 4, slug: 'd-4', nama: 'Dodi', kontingen: 'Kota Bandung', cabor_id: 9, gender: 'L' as const, foto: null },
  { ref: 5, slug: 'e-5', nama: 'Eko', kontingen: 'Kab. Bandung', cabor_id: 9, gender: 'L' as const, foto: null },
  { ref: 6, slug: 'f-6', nama: 'Fajar', kontingen: 'Kab. Bekasi', cabor_id: 7, gender: 'L' as const, foto: null },
]
const c = calonLawan('Kelas 105 Kg Putra', 9, kolam, 'Karawang, Syaifahmi Riski', semua)
cek('calon: kontingen disebut di atas, kita & putri & cabor lain tersaring', c.map(x => [x.kontingen, x.disebut, x.jumlah]), [['Kab. Karawang', true, 1], ['Kota Bandung', false, 2]])
cek('calon: atlet disebut ditandai', c[0].atlet[0].disebut, true)
cek('calon: batas atlet per kontingen', calonLawan('Putra', 9, kolam, '', semua, 1).find(x => x.kontingen === 'Kota Bandung')?.atlet.length, 1)
cek('calon: tanpa cabor', calonLawan('Putra', null, kolam, '', semua), [])

console.log(`uji-head-to-head: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
