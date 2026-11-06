// scripts/uji-klasemen-banding.ts — klasemen situs KONI Jabar vs data kita (War Room).
// Dijalankan: npm run uji:klasemen-banding
import { bandingKlasemen, klasemenDisesuaikan } from '../src/lib/klasemen-banding'
import { bacaKlasemenKotaBdg } from '../src/lib/klasemen-kotabdg'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap)
  if (ok) lulus++; else { gagal++; console.log(`✗ ${nama}\n   dapat: ${JSON.stringify(dapat)}\n   harap: ${JSON.stringify(harap)}`) }
}

const NOL = ['Kab. Bandung', 'Kab. Bandung Barat', 'Kota Bandung', 'Kab. Bogor'].map(nama => ({ nama, emas: 0, perak: 0, perunggu: 0 }))

// Keadaan 5 Nov: situs masih nol semua, data kita 3-1-3.
{ const b = bandingKlasemen(NOL, { emas: 3, perak: 1, perunggu: 3 })
  cek('situs nol: selisih = data kita', b.selisih, { emas: 3, perak: 1, perunggu: 3 })
  cek('situs nol: akurasi 0%', [b.cocok, b.akurasi], [0, 0])
  cek('situs nol: tanpa peringkat (bukan #1 palsu)', [b.peringkatSitus, b.peringkatKita], [null, null])
  cek('catatan: 3 jenis menunggu verifikasi + peringkat belum bermakna', b.catatan.length, 4) }

{ const b = bandingKlasemen(NOL, { emas: 0, perak: 0, perunggu: 0 })
  cek('dua sisi nol → akurasi kosong', [b.akurasi, b.catatan], [null, ['Kedua sisi masih nol.']]) }

const JALAN = [
  { nama: 'Kota Bandung', emas: 10, perak: 4, perunggu: 2 },
  { nama: 'Kab. Bandung', emas: 3, perak: 1, perunggu: 2 },
  { nama: 'Kab. Bogor', emas: 4, perak: 0, perunggu: 0 },
  { nama: 'Kab. Bandung Barat', emas: 0, perak: 0, perunggu: 0 },
]
{ const b = bandingKlasemen(JALAN, { emas: 3, perak: 1, perunggu: 2 })
  cek('sama persis → 100%', [b.akurasi, b.catatan], [100, ['Data kita dan situs panitia sama persis.']])
  cek('peringkat situs = peringkat kita', [b.peringkatSitus, b.peringkatKita], [3, 3]) }
{ const b = bandingKlasemen(JALAN, { emas: 5, perak: 1, perunggu: 2 })
  cek('kita lebih banyak 2 emas → 6/8 = 75%', [b.cocok, b.akurasi, b.selisih.emas], [6, 75, 2])
  cek('dengan data kita naik ke #2', [b.peringkatSitus, b.peringkatKita], [3, 2]) }
{ const b = bandingKlasemen(JALAN, { emas: 3, perak: 0, perunggu: 2 })
  cek('situs lebih banyak perak → catatan cek Antrean', b.catatan.some(c => c.includes('Cek Antrean')), true)
  cek('akurasi 5/6 = 83%', b.akurasi, 83) }
{ const b = bandingKlasemen(JALAN, { emas: 3, perak: 1, perunggu: 2 })
  cek('Kab. Bandung Barat & Kota Bandung bukan kita', b.situs, { emas: 3, perak: 1, perunggu: 2 }) }

// Klasemen disesuaikan
{ const k = klasemenDisesuaikan(JALAN, { emas: 5, perak: 0, perunggu: 0 })
  cek('urut ulang dengan data kita', k.map(r => r.nama), ['Kota Bandung', 'Kab. Bandung', 'Kab. Bogor', 'Kab. Bandung Barat'])
  cek('kontingen lain tidak berubah', k.find(r => r.nama === 'Kota Bandung')?.emas, 10) }
cek('Kab. Bandung tidak ada di situs → ditambahkan', klasemenDisesuaikan([{ nama: 'Kota Bandung', emas: 1, perak: 0, perunggu: 0 }], { emas: 2, perak: 0, perunggu: 0 }).map(r => r.nama), ['Kab. Bandung', 'Kota Bandung'])

// ── Situs KONI Kota Bandung (rekap sementara) — potongan HTML asli 6 Nov ──
const tr = (no: number, kode: string, nama: string, e: number, p: number, b: number) => `<tr>
  <td class="klasemen-center">${no}</td>
  <td>
      <span class="klasemen-code">${kode}</span>
      ${nama}                            </td>
  <td class="klasemen-center">${e}</td><td class="klasemen-center">${p}</td><td class="klasemen-center">${b}</td>
  <td class="klasemen-center"><strong>${e + p + b}</strong></td>
  <td class="klasemen-center"><a href="https://koni-kotabandung.or.id/klasemen_detail/${kode}">Lihat</a></td></tr>`
const HTML_KB = `<table><thead><tr><th>No.</th><th>Kontingen</th></tr></thead><tbody>${[
  tr(1, '001', 'Kota Bandung', 13, 15, 14), tr(6, '028', 'Kab. Bandung Barat', 5, 2, 5), tr(7, '023', 'Kab. Karawangan', 3, 4, 4),
  tr(9, '007', 'Kab. Bandung', 2, 3, 13), tr(26, '016', 'KBB', 0, 0, 0),
].join('')}</tbody></table>`
const KB = bacaKlasemenKotaBdg(HTML_KB)
cek('kota bdg: baris terbaca, KBB kosong dibuang', KB.map(b => b.nama), ['Kota Bandung', 'Kab. Bandung Barat', 'Kab. Karawang', 'Kab. Bandung'])
cek('kota bdg: angka Kab. Bandung', KB.find(b => b.nama === 'Kab. Bandung'), { kode: '007', nama: 'Kab. Bandung', emas: 2, perak: 3, perunggu: 13 })
cek('kota bdg: Kab. Bandung diganti data kita, KBB tidak ikut terganti',
  klasemenDisesuaikan(KB, { emas: 8, perak: 3, perunggu: 12 }).map(r => `${r.peringkat}:${r.nama}:${r.emas}`), ['1:Kota Bandung:13', '2:Kab. Bandung:8', '3:Kab. Bandung Barat:5', '4:Kab. Karawang:3'])
cek('kota bdg: halaman tanpa tabel = kosong', bacaKlasemenKotaBdg('<html>galat</html>'), [])

console.log(`\nuji-klasemen-banding: ${lulus} lulus, ${gagal} gagal`)
if (gagal > 0) process.exit(1)
