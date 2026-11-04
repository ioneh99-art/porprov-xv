// scripts/uji-grup-medali.ts — medali dari kelas sistem grup murni (setengah kompetisi).
// Dijalankan: npm run uji:grup-medali
// Halaman contoh = salinan asli situs KONI Jabar 4 Nov 2026 (scripts/contoh-situs/).
import { readFileSync } from 'fs'
import { join } from 'path'
import { babakGrup, baganDariRef, bacaGrupMurni, medaliGrup, refGrup } from '../src/lib/grup-medali'
import { bacaLaga, tebakHasil, urlLaga } from '../src/lib/konijabar'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap)
  if (ok) lulus++; else { gagal++; console.log(`✗ ${nama}\n   dapat: ${JSON.stringify(dapat)}\n   harap: ${JSON.stringify(harap)}`) }
}
const contoh = (f: string) => readFileSync(join(__dirname, 'contoh-situs', f), 'utf8')

// ── Gulat Grego 87 kg: 5 peserta, satu grup, tanpa final ──
const murni = bacaGrupMurni(contoh('bagan-grup-murni-gulat87.html'))
cek('87 kg: grup murni', murni.murni, true)
cek('87 kg: 10/10 laga selesai', [murni.selesai, murni.laga], [true, { selesai: 10, total: 10 }])
cek('87 kg: 5 peserta urut klasemen', murni.peserta.map(p => `${p.peringkat}:${p.kontingen}`),
  ['1:kab. Bandung', '2:kota Bekasi', '3:kota Banjar', '4:kab. Bandung Barat', '5:kota Cirebon'])
cek('87 kg: nama & poin juara', [murni.peserta[0].nama, murni.peserta[0].poin], ['Ikbar Gustiana', 12])
cek('87 kg: Kab. Bandung = emas', medaliGrup(murni, 'Kab. Bandung').map(m => [m.hasil, m.peserta.nama, m.jumlahPeserta]), [['emas', 'Ikbar Gustiana', 5]])
cek('Kab. Bandung Barat (peringkat 4) tidak dapat medali', medaliGrup(murni, 'Kab. Bandung Barat'), [])
cek('Kota Bekasi = perak, Kota Banjar = perunggu', [medaliGrup(murni, 'Kota Bekasi')[0]?.hasil, medaliGrup(murni, 'Kota Banjar')[0]?.hasil], ['perak', 'perunggu'])

// ── Gulat Grego 72 kg: grup lalu semifinal & final → bukan urusan pembaca grup ──
const gugur = bacaGrupMurni(contoh('bagan-grup-semifinal-gulat72.html'))
cek('72 kg: ada babak gugur → bukan grup murni', gugur.murni, false)
cek('72 kg: tetap tanpa medali grup walau Kab. Bandung peringkat 3 grup', medaliGrup(gugur, 'Kab. Bandung'), [])

// ── Grup murni yang belum selesai ──
const belum = bacaGrupMurni(contoh('bagan-grup-murni-gulat87.html').replace('10/10 laga selesai', '9/10 laga selesai'))
cek('grup belum selesai → belum ada medali', [belum.murni, belum.selesai, medaliGrup(belum, 'Kab. Bandung').length], [true, false, 0])

// ── Klasemen bentuk daftar (<ol class="sg-list">) juga terbaca ──
const daftar = bacaGrupMurni(`<section class="sg-group sg-pool"><span class="sg-pill">Grup A</span> <span class="sg-count">3/3 laga selesai</span>
  <div class="sg-pane" data-pane="klasemen"><ol class="sg-list">
  <li><span class="sg-rank">1</span><span class="sg-name">Kab. Bogor</span><span class="sg-pts">6 poin</span></li>
  <li><span class="sg-rank">2</span><span class="sg-name">Kab. Bandung</span><span class="sg-pts">3 poin</span></li>
  <li><span class="sg-rank">3</span><span class="sg-name">Kota Depok</span><span class="sg-pts">0 poin</span></li></ol></div></section>
  <span class="bk-meta">A1 vs A2, 4 Nov</span><span class="bk-meta">Klasemen akhir · Belum dijadwalkan</span>`)
cek('beregu tanpa nama atlet: kontingen dari nama', medaliGrup(daftar, 'Kab. Bandung').map(m => [m.hasil, m.peserta.nama, m.jumlahPeserta]), [['perak', 'Kab. Bandung', 3]])
cek('dua grup → bukan grup murni', bacaGrupMurni(`<section class="sg-group">x</section><section class="sg-group">y</section>`).murni, false)

// ── Penanda & tautan ──
cek('ref laporan grup', refGrup(527, 1), 'grup-527-1')
cek('ref grup → nomor bagan', [baganDariRef('grup-527-1'), baganDariRef('786')], [527, null])
cek('tautan laporan grup ke bagan, laga biasa ke laga', [urlLaga('grup-527-1'), urlLaga('786')],
  ['https://porprov.konijabar.or.id/bagan?nomor=527', 'https://porprov.konijabar.or.id/laga/786'])
cek('babak grup dikenali', ['Penyisihan', 'Pool A', 'Grup B', 'Final', 'Semifinal', null].map(babakGrup), [true, true, true, false, false, false])

// ── Halaman laga menyimpan ref bagan ──
const laga = bacaLaga(contoh('laga-786.html'), '786')
cek('laga 786: bagan 527, babak Penyisihan', [laga?.bagan, laga?.babak], [527, 'Penyisihan'])
cek('laga penyisihan tetap "menang" biasa (medali dari klasemen grup)', tebakHasil(laga?.babak ?? null, laga?.kode ?? null, 'menang').hasil, 'menang')

console.log(`\nuji-grup-medali: ${lulus} lulus, ${gagal} gagal`)
if (gagal > 0) process.exit(1)
