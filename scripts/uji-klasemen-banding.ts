// scripts/uji-klasemen-banding.ts — klasemen situs KONI Jabar vs data kita (War Room).
// Dijalankan: npm run uji:klasemen-banding
import { bandingKlasemen, klasemenDisesuaikan } from '../src/lib/klasemen-banding'

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

console.log(`\nuji-klasemen-banding: ${lulus} lulus, ${gagal} gagal`)
if (gagal > 0) process.exit(1)
