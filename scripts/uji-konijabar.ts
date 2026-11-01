// scripts/uji-konijabar.ts — mengunci cara membaca situs panitia (porprov.konijabar.or.id)
// dan menerjemahkannya ke laporan kita. Dijalankan: npm run uji:konijabar
import {
  bacaJadwalHarian, bacaLaga, cocokCabor, cocokPartai, keteranganLaporan, lagaKita, lawanSama, nomorSama,
  pilihNomorResmi, skorTeks, tebakHasil, type PartaiCocok,
  arahHasil, bandingkan, cariAlarm, kunciBanding, skorUtama, type HasilLuarBanding, type LaporanBanding,
} from '../src/lib/konijabar'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

// Potongan halaman laga, mengikuti susunan HTML situs panitia (Nov 2026).
const laga = (o: { tgl?: string; cabor?: string; disiplin?: string; nomor?: string; selesai?: boolean; babak?: string; kode?: string; a?: string; b?: string; menang?: 'a' | 'b' | null; skor?: [number, number] | null; atletA?: string[]; atletB?: string[]; video?: boolean }) => {
  const s = { tgl: '2026-10-30', cabor: 'Futsal', nomor: 'Beregu Putra', selesai: true, babak: 'Penyisihan', kode: 'PA-06', a: 'Kab. Bandung', b: 'Kota Depok', menang: 'b' as const, skor: [3, 5] as [number, number], atletA: ['Asyam Albar', 'Gugun Gunawan'], atletB: ['Arya Dwi Putra'], ...o }
  const chip = (n: string) => `<a class="ath-chip" href="/atlet/x-1"><img class="person-avatar xs" src="/f.webp" alt=""><span>${n}</span></a>`
  return `<main><nav class="crumbs"> <a href="/jadwal?tgl=${s.tgl}">Jadwal</a> <a href="/cabor/x">${s.cabor}</a> </nav>
  <article class="md" aria-labelledby="md-title-95"><header class="md-head"><div class="md-head-text">
  <p class="md-kicker"> <a href="/cabor/x">${s.cabor}</a> ${s.disiplin ? `<span class="sep"></span>${s.disiplin}` : ''} </p>
  <h1 class="md-title" id="md-title-95">${s.nomor}</h1>
  <p class="md-phase"> <span class="status-pill ${s.selesai ? 'is-done' : 'is-soon'}">${s.selesai ? 'Selesai' : 'Terjadwal'}</span> <span>${s.babak}</span> <span class="md-no">${s.kode}</span> </p>
  </div></header>
  <dl class="md-facts"> <div><dt>Tanggal</dt><dd>Jumat, 30 Oktober 2026</dd></div> <div><dt>Waktu</dt><dd>13.30 WIB</dd></div>
  <div class="md-venue"><dt>Venue</dt><dd> <a href="/klaster?venue=92#peta">GOR Bang Yan Bulu Tangkis, Kota Bekasi</a> <a class="md-map" href="https://maps.google.com/?cid=1">Buka peta</a> <a class="md-map" href="https://www.google.com/maps/dir/?api=1&amp;destination=1,2">Rute</a> </dd></div></dl>
  ${s.video ? '<a class="md-video-link" href="https://www.youtube.com/watch?v=XtBvEViB1zI">Tonton</a>' : ''}
  <div class="md-duel${s.selesai ? ' is-final' : ''}">
   <div class="duel-side side-a${s.menang === 'a' ? ' is-win' : ''}"> <a class="duel-team" href="/kontingen/a"><img src="/l.webp" alt=""><span>${s.a}</span></a> <p class="duel-athletes">${s.atletA.map(chip).join('')}</p> </div>
   <div class="duel-score" aria-label="Skor"> ${s.skor ? `<span class="ds-n${s.menang === 'a' ? ' is-win' : ''}">${s.skor[0]}</span> <span class="ds-colon">:</span> <span class="ds-n${s.menang === 'b' ? ' is-win' : ''}">${s.skor[1]}</span>` : '<span class="ds-vs">vs</span>'} </div>
   <div class="duel-side side-b${s.menang === 'b' ? ' is-win' : ''}"> <a class="duel-team" href="/kontingen/b"><img src="/l.webp" alt=""><span>${s.b}</span></a> <p class="duel-athletes">${s.atletB.map(chip).join('')}</p> </div>
  </div></article></main>`
}

// --- membaca halaman laga ---
const L1 = bacaLaga(laga({}), '95')!
cek('baca: tanggal dari tautan jadwal', L1.tanggal, '2026-10-30')
cek('baca: jam 13.30 → 13:30', L1.jam, '13:30')
cek('baca: cabor/nomor/babak/kode', [L1.cabor, L1.disiplin, L1.nomor, L1.babak, L1.kode], ['Futsal', null, 'Beregu Putra', 'Penyisihan', 'PA-06'])
cek('baca: venue tanpa tautan peta', L1.venue, 'GOR Bang Yan Bulu Tangkis, Kota Bekasi')
cek('baca: selesai + skor', [L1.selesai, L1.skorA, L1.skorB], [true, 3, 5])
cek('baca: sisi + pemenang + atlet', [L1.a?.nama, L1.a?.menang, L1.b?.nama, L1.b?.menang, L1.a?.atlet], ['Kab. Bandung', false, 'Kota Depok', true, ['Asyam Albar', 'Gugun Gunawan']])
const L2 = bacaLaga(laga({ cabor: 'Hockey', disiplin: 'Hockey Indoor', selesai: false, skor: null, menang: null, video: true }), '134')!
cek('baca: disiplin sesudah pemisah', L2.disiplin, 'Hockey Indoor')
cek('baca: belum selesai = tanpa skor', [L2.selesai, L2.status, L2.skorA, L2.skorB], [false, 'Terjadwal', null, null])
cek('baca: tautan siaran', L2.video, 'https://www.youtube.com/watch?v=XtBvEViB1zI')
cek('baca: halaman asing = null', bacaLaga('<html><body>404</body></html>', '1'), null)
cek('baca: bukan duel → sisi null', bacaLaga(laga({}).replace(/md-duel/g, 'md-heat'), '9')?.a, null)

// --- sudut pandang Kab. Bandung ---
const K1 = lagaKita(L1, 'Kab. Bandung')!
cek('kita: lawan, skor dari sisi kita, kalah', [K1.lawan, K1.skorKita, K1.skorLawan, K1.akhir, skorTeks(K1)], ['Kota Depok', 3, 5, 'kalah', '3-5'])
const K2 = lagaKita(bacaLaga(laga({ a: 'Kota Cirebon', b: 'Kab. Bandung', menang: 'b', skor: [2, 5] }), '90')!, 'Kab. Bandung')!
cek('kita di sisi B, menang', [K2.lawan, K2.skorKita, K2.skorLawan, K2.akhir], ['Kota Cirebon', 5, 2, 'menang'])
cek('Kab. Bandung Barat bukan kita', lagaKita(bacaLaga(laga({ a: 'Kab. Bandung Barat' }), '1')!, 'Kab. Bandung'), null)
cek('laga orang lain = null', lagaKita(bacaLaga(laga({ a: 'Kota Bogor' }), '1')!, 'Kab. Bandung'), null)
cek('seri dari skor sama', lagaKita(bacaLaga(laga({ menang: null, skor: [1, 1] }), '1')!, 'Kab. Bandung')?.akhir, 'seri')
cek('belum selesai → akhir null', lagaKita(L2.a ? { ...L2, a: { ...L2.a, nama: 'Kab. Bandung' } } : L2, 'Kab. Bandung')?.akhir, null)

// --- menang/kalah → pilihan hasil kita ---
cek('pool menang', tebakHasil('Penyisihan', 'A1', 'menang').hasil, 'menang')
cek('pool kalah = kalah, masih bertanding', tebakHasil('Penyisihan', 'PA-06', 'kalah').hasil, 'kalah')
cek('perempat final menang = lolos', tebakHasil('Perempat final', 'KO QF1', 'menang').hasil, 'lolos')
cek('semifinal kalah = gugur', tebakHasil('Semifinal', 'KO SF2', 'kalah').hasil, 'gugur')
cek('final menang = emas', tebakHasil('Final', 'KO F', 'menang').hasil, 'emas')
cek('final kalah = perak', tebakHasil('Final', null, 'kalah').hasil, 'perak')
cek('kode KO F tanpa teks babak = final', tebakHasil(null, 'KO F', 'menang').hasil, 'emas')
cek('perebutan juara 3 menang = perunggu', tebakHasil('Perebutan juara 3', 'KO B3', 'menang').hasil, 'perunggu')
cek('perebutan juara 3 kalah = peringkat 4', tebakHasil('Perebutan juara 3', 'KO B3', 'kalah'), { hasil: 'peringkat', peringkat: 4, catatan: null })
cek('babak gugur awal (KO R1) menang = lolos', tebakHasil('Babak 1', 'KO R1-2', 'menang').hasil, 'lolos')
cek('seri diberi catatan', tebakHasil('Penyisihan', 'B1', 'seri').catatan !== null, true)

// --- pencocokan nama ---
cek('nomor: Beregu Putra = Beregu Putra (Pa)', nomorSama('Beregu Putra', 'Beregu Putra (Pa)'), true)
cek('nomor: Beregu Putra = Beregu (Pa)', nomorSama('Beregu Putra', 'Beregu (Pa)'), true)
cek('nomor: Beregu Putra = BOLA VOLI PASIR · Beregu (Pa)', nomorSama('Beregu Putra', 'BOLA VOLI PASIR · Beregu (Pa)'), true)
cek('nomor: putra ≠ putri', nomorSama('Beregu Putra', 'Beregu (Pi)'), false)
cek('lawan: Kota Bandung = Kota Bandung 2', lawanSama('Kota Bandung', 'Kota Bandung 2'), true)
cek('lawan: Kab. Bandung Barat ≠ Kab. Bandung', lawanSama('Kab. Bandung Barat', 'Kab. Bandung'), false)
cek('cabor: nama sama', cocokCabor('Bola Basket', [{ id: 151, nama: 'Bola Basket' }, { id: 165, nama: 'Futsal' }]), 151)
cek('cabor: tak dikenal = null', cocokCabor('Kriket', [{ id: 151, nama: 'Bola Basket' }]), null)
cek('nomor resmi: pilih yang cocok', pilihNomorResmi(L1, [{ disiplin: 'FUTSAL', nomor: 'Beregu (Pa)' }, { disiplin: 'FUTSAL', nomor: 'Beregu (Pi)' }]), 'Beregu (Pa)')

// --- mencari partai di jadwal kita ---
const P = (o: Partial<PartaiCocok>): PartaiCocok => ({ id: 1, cabor_id: 165, tanggal: '2026-10-30', jam: '13:30', nomor_teks: 'Beregu (Pa)', lawan: 'Kota Depok', ...o })
cek('partai: lawan sama', cocokPartai(K1, 165, [P({ id: 7, lawan: 'Kota Cirebon', jam: '09:00' }), P({ id: 8 })])?.id, 8)
cek('partai: tanggal beda = tidak ada', cocokPartai(K1, 165, [P({ tanggal: '2026-10-28' })]), undefined)
cek('partai: cabor beda = tidak ada', cocokPartai(K1, 151, [P({})]), undefined)
cek('partai: lawan sama, nomor putra/putri memutus', cocokPartai(K1, 165, [P({ id: 1, nomor_teks: 'Beregu (Pi)' }), P({ id: 2 })])?.id, 2)
const gulat = lagaKita(bacaLaga(laga({ cabor: 'Gulat', nomor: 'Grego 55 Kg Putra', a: 'Kab. Bandung', b: 'Kota Bekasi', atletA: ['Muhammad Rasya'] }), '501')!, 'Kab. Bandung')!
cek('partai: tanpa lawan di jadwal → cocok lewat nama atlet', cocokPartai(gulat, 25, [
  P({ id: 26, cabor_id: 25, lawan: null, nomor_teks: 'Grego - kelas s/d 55 kg (Pa)', atlet_nama: ['Muhammad Rasya'] }),
  P({ id: 27, cabor_id: 25, lawan: null, nomor_teks: 'Grego - kelas s/d 67 kg (Pa)', atlet_nama: ['Hasan Ruslan'] }),
])?.id, 26)
cek('partai: dua kandidat sama kuat, jam memutus', cocokPartai(K1, 165, [P({ id: 1, jam: '09:00' }), P({ id: 2, jam: '13:30' })])?.id, 2)

// --- jadwal harian ---
const jadwal = `<a class="mrow status-finished" href="/laga/163" data-match="163"> <span class="ml ml-a is-win"><span class="ml-name">Kota Cirebon</span></span> <span class="ml-score"><b>94</b></span> <span class="ml ml-b"><span class="ml-name">Kab. Bandung</span></span> <span class="status-pill is-done">Selesai</span> </a>
<a class="mrow status-upcoming" href="/laga/193" data-match="193"> <span class="ml-name">Kota Tasikmalaya</span> <span class="ml-name">Kab. Bandung</span> <span class="status-pill is-soon">Terjadwal</span> </a>
<a class="mrow status-finished" href="/laga/164" data-match="164"> <span class="ml-name">Kota Bandung</span> <span class="ml-name">Kota Bekasi</span> </a>`
cek('jadwal harian: nomor laga, tim, status', bacaJadwalHarian(jadwal), [
  { ref: '163', tim: ['Kota Cirebon', 'Kab. Bandung'], selesai: true },
  { ref: '193', tim: ['Kota Tasikmalaya', 'Kab. Bandung'], selesai: false },
  { ref: '164', tim: ['Kota Bandung', 'Kota Bekasi'], selesai: true },
])

cek('keterangan menyebut sumber dan tautan', keteranganLaporan(K1, null), 'Situs KONI Jabar: Penyisihan · PA-06 · GOR Bang Yan Bulu Tangkis, Kota Bekasi · https://porprov.konijabar.or.id/laga/95')


// --- alarm beda data ---
cek('skor utama: "5 - 2"', skorUtama('5 - 2'), [5, 2])
cek('skor utama: rincian set diabaikan', skorUtama('1-2 (17-21, 21-18, 13-15)'), [1, 2])
cek('skor utama: titik dua', skorUtama('3:1'), [3, 1])
cek('skor utama: tanpa angka', skorUtama('Juara grup'), null)
cek('arah: lolos = menang, perak = kalah, perunggu = tak dibandingkan', [arahHasil('lolos'), arahHasil('perak'), arahHasil('perunggu')], ['menang', 'kalah', null])
const H = (o: Partial<HasilLuarBanding> = {}): HasilLuarBanding => ({ ref: '95', tanggal: '2026-10-30', cabor_id: 165, partai_id: 3, laporan_id: null, lawan: 'Kota Depok', skor_kita: 3, skor_lawan: 5, akhir: 'kalah', ...o })
const LB = (o: Partial<LaporanBanding> = {}): LaporanBanding => ({ id: 200, cabor_id: 165, partai_id: 3, tanggal: '2026-10-30', lawan: 'Kota Depok', hasil: 'kalah', nilai_teks: '3-5', status: 'menunggu', pelapor_nama: 'PIC Futsal', ...o })
cek('banding: sama persis', bandingkan(LB(), H()).status, 'sama')
cek('banding: spasi & strip berbeda tetap sama', bandingkan(LB({ nilai_teks: '3 – 5' }), H()).status, 'sama')
cek('banding: skor ditulis terbalik tetap sama', bandingkan(LB({ nilai_teks: '5-3' }), H()).status, 'sama')
cek('banding: skor beda', bandingkan(LB({ nilai_teks: '3-4' }), H()), { status: 'beda', alasan: 'skor kita 3–4, situs 3–5' })
cek('banding: arah beda', bandingkan(LB({ hasil: 'menang', nilai_teks: null }), H()), { status: 'beda', alasan: 'laporan kita menang, situs kalah' })
cek('banding: situs seri, kita menang', bandingkan(LB({ hasil: 'menang', nilai_teks: '2-2' }), H({ skor_kita: 2, skor_lawan: 2, akhir: 'seri' })).status, 'beda')
cek('banding: perunggu tanpa skor = tak bisa', bandingkan(LB({ hasil: 'perunggu', nilai_teks: null }), H()).status, 'tak_bisa')
cek('banding: voli set beda', bandingkan(LB({ nilai_teks: '1-2 (17-21, 21-18, 13-15)' }), H({ skor_kita: 0, skor_lawan: 2 })).status, 'beda')

const lp = new Map<number, string | null>([[3, 'Kota Depok'], [26, null]])
cek('alarm: laporan PIC beda skor → alarm', cariAlarm([H()], [LB({ nilai_teks: '3-4' })], lp).map(a => [a.laporan_id, a.situs, a.dicek]), [[200, '3–5 kalah', false]])
cek('alarm: sama → tidak ada alarm', cariAlarm([H()], [LB()], lp), [])
cek('alarm: laporan ditolak diabaikan', cariAlarm([H()], [LB({ nilai_teks: '9-9', status: 'ditolak' })], lp), [])
cek('alarm: lawan kosong di laporan → diambil dari partai', cariAlarm([H()], [LB({ lawan: null, nilai_teks: '4-5' })], lp).length, 1)
cek('alarm: partai lain (lawan lain) tidak dibandingkan', cariAlarm([H()], [LB({ partai_id: 9, lawan: 'Kota Bogor', nilai_teks: '1-0', hasil: 'menang' })], lp), [])
cek('alarm: tanpa partai, cocok cabor+tanggal+lawan', cariAlarm([H({ partai_id: null })], [LB({ partai_id: null, nilai_teks: '3-4' })], lp).length, 1)
cek('alarm: gulat (partai tanpa lawan, laporan tanpa lawan) tidak dibandingkan per laga', cariAlarm([H({ partai_id: 26, lawan: 'Kota Bekasi', cabor_id: 25 })], [LB({ partai_id: 26, cabor_id: 25, lawan: null, hasil: 'emas', nilai_teks: null })], lp), [])
cek('alarm: laporan dari situs itu sendiri, situs lalu diubah → alarm + "berubah"', cariAlarm(
  [H({ skor_kita: 4, skor_lawan: 5, skor_sebelum: '3-5' })], [LB({ ref_luar: '95', status: 'disahkan', pelapor_nama: 'Situs KONI Jabar (otomatis)' })], lp).map(a => [a.berubah, a.laporan_status]), [['3–5 → 4–5', 'disahkan']])
const k = kunciBanding(H(), LB({ nilai_teks: '3-4' }))
cek('alarm: sudah dicek → dicek=true', cariAlarm([H({ dicek_kunci: k })], [LB({ nilai_teks: '3-4' })], lp)[0].dicek, true)
cek('alarm: sudah dicek tapi skor situs berubah lagi → aktif lagi', cariAlarm([H({ dicek_kunci: k, skor_kita: 2 })], [LB({ nilai_teks: '3-4' })], lp)[0].dicek, false)
cek('alarm: belum dicek di depan', cariAlarm([H({ ref: '1', dicek_kunci: kunciBanding(H({ ref: '1' }), LB({ nilai_teks: '3-4' })) }), H({ ref: '2' })], [LB({ nilai_teks: '3-4' })], lp).map(a => a.ref), ['2', '1'])

console.log(`uji-konijabar: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
