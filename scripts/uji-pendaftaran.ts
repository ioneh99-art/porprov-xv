// scripts/uji-pendaftaran.ts — mengunci pembacaan berkas klasifikasi_verified.
// Dijalankan: npm run uji:pendaftaran
import {
  jkNomor, kelompokkanNomor, namaSama, penandaNomor, petaCaborBerkas, rapikan, tulisNomorResmi, uraiAtlet,
} from '../src/lib/pendaftaran'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

// NIK di bawah ini karangan untuk uji, bukan milik siapa pun.
// ── kolom Atlet ──
cek('bentuk baku', uraiAtlet('ARSYA DEWI SAPUTRA (PEREMPUAN/ 3204000000000001/ANGKAT BESI)'),
  { nama: 'ARSYA DEWI SAPUTRA', jk: 'P', nik: '3204000000000001', cabor: 'ANGKAT BESI' })
cek('spasi ganda di nama dirapikan', uraiAtlet('AULIA  ANNISA   MUTMAINAH  (PEREMPUAN/ 3204000000000002/ANGKAT BESI)')?.nama, 'AULIA ANNISA MUTMAINAH')
cek('laki-laki', uraiAtlet('RINALDI RUSTIANA (LAKI-LAKI/ 3204000000000003/ANGKAT BESI)')?.jk, 'L')
cek('cabor dua kata', uraiAtlet('X (LAKI-LAKI/ 3204000000000004/MODERN PENTATHLON)')?.cabor, 'MODERN PENTATHLON')
cek('nama berkurung tetap terbaca', uraiAtlet('SITI (ITI) AMINAH (PEREMPUAN/ 3204000000000005/WUSHU)')?.nama, 'SITI (ITI) AMINAH')
cek('NIK 14 digit tetap diterima apa adanya', uraiAtlet('NAYLA (PEREMPUAN/ 32040000000001/DAYUNG)')?.nik.length, 14)
cek('tanpa kurung', uraiAtlet('ARSYA DEWI SAPUTRA'), null)
cek('bagian kurang', uraiAtlet('ARSYA (PEREMPUAN/ANGKAT BESI)'), null)
cek('jenis kelamin tak dikenal', uraiAtlet('ARSYA (WANITA/ 3204000000000001/ANGKAT BESI)'), null)
cek('NIK bukan angka', uraiAtlet('ARSYA (PEREMPUAN/ 32O4000000000001/ANGKAT BESI)'), null)
cek('nama kosong', uraiAtlet('(PEREMPUAN/ 3204000000000001/ANGKAT BESI)'), null)
cek('bukan teks', uraiAtlet(null), null)
cek('rapikan', rapikan('  Kelas  53   Kg (Pi) '), 'Kelas 53 Kg (Pi)')

// ── penanda nomor ──
cek('Pa', penandaNomor('Kelas 60 Kg (Pa)'), 'Pa')
cek('Pi', penandaNomor('Kelas 53 Kg (Pi)'), 'Pi')
cek('Campuran', penandaNomor('DBR - 22 pendayung - 200 m (Campuran)'), 'Campuran')
cek('Terbuka', penandaNomor('Slalom (Terbuka)'), 'Terbuka')
cek('kurung di tengah bukan penanda', penandaNomor('Lomba Unjuk Gelar (LUG) (Campuran)'), 'Campuran')
cek('tanpa penanda', penandaNomor('Marathon'), null)
cek('nomor putra wajib L', jkNomor('Pa'), 'L')
cek('nomor putri wajib P', jkNomor('Pi'), 'P')
cek('campuran bebas', jkNomor('Campuran'), null)

// ── pengelompokan untuk form ──
const baris = [
  { disiplin: 'ANGKAT BESI', nomor: 'Kelas 60 Kg (Pa)', penanda: 'Pa', atlet_id: 1876 },
  { disiplin: 'ANGKAT BESI', nomor: 'Kelas 60 Kg (Pa)', penanda: 'Pa', atlet_id: 1898 },
  { disiplin: 'ANGKAT BESI', nomor: 'Kelas 53 Kg (Pi)', penanda: 'Pi', atlet_id: 1881 },
  { disiplin: 'ANGKAT BESI', nomor: 'Kelas 110 Kg (Pa)', penanda: 'Pa', atlet_id: null },
  { disiplin: 'ANGKAT BESI', nomor: 'Kelas 53 Kg (Pi)', penanda: 'Pi', atlet_id: 1881 },   // baris berulang
]
const kel = kelompokkanNomor(baris)
cek('tiga nomor', kel.length, 3)
cek('urut angka, bukan urut huruf (53 < 60 < 110)', kel.map(k => k.nomor), ['Kelas 53 Kg (Pi)', 'Kelas 60 Kg (Pa)', 'Kelas 110 Kg (Pa)'])
cek('dua atlet di satu nomor', kel[1].atlet_ids, [1876, 1898])
cek('atlet berulang tidak dihitung dua kali', kel[0].atlet_ids, [1881])
cek('atlet belum ada di sistem dihitung terpisah', [kel[2].atlet_ids, kel[2].belum_ada], [[], 1])
cek('penanda ikut', kel.map(k => k.penanda), ['Pi', 'Pa', 'Pa'])
const dua = kelompokkanNomor([
  { disiplin: 'HOCKEY OUTDOOR', nomor: 'Beregu (Pa)', penanda: 'Pa', atlet_id: 1 },
  { disiplin: 'HOCKEY INDOOR', nomor: 'Beregu (Pa)', penanda: 'Pa', atlet_id: 1 },
])
cek('nomor bernama sama di dua disiplin tetap dua', dua.map(d => d.kunci), ['HOCKEY INDOOR|Beregu (Pa)', 'HOCKEY OUTDOOR|Beregu (Pa)'])
cek('daftar kosong', kelompokkanNomor([]), [])

// ── tulisan nomor di laporan ──
cek('satu disiplin: nomor saja', tulisNomorResmi('ANGKAT BESI', 'Kelas 53 Kg (Pi)', 1), 'Kelas 53 Kg (Pi)')
cek('banyak disiplin: disiplin ikut', tulisNomorResmi('HOCKEY INDOOR', 'Beregu (Pa)', 2), 'HOCKEY INDOOR · Beregu (Pa)')

// ── padanan cabor berkas → sistem ──
const peta = petaCaborBerkas([
  { cabor_berkas: 'BERKUDA', disiplin: 'BERKUDA EQUESTRIAN', cabor_id: 169 },
  { cabor_berkas: 'BERKUDA', disiplin: 'BERKUDA EQUESTRIAN', cabor_id: 169 },
  { cabor_berkas: 'BERKUDA', disiplin: 'BERKUDA PACUAN', cabor_id: 204 },
  { cabor_berkas: 'BERKUDA', disiplin: 'BERKUDA EQUESTRIAN', cabor_id: 204 },   // satu tautan nyasar
  { cabor_berkas: 'RUGBY', disiplin: 'RUGBY', cabor_id: null },
])
cek('satu cabor berkas bisa pecah jadi dua cabor sistem', [peta.get('BERKUDA|BERKUDA EQUESTRIAN'), peta.get('BERKUDA|BERKUDA PACUAN')], [169, 204])
cek('tanpa tautan tidak dipetakan', peta.has('RUGBY|RUGBY'), false)

// ── nama ──
cek('nama sama walau spasi & huruf beda', namaSama('AULIA  ANNISA MUTMAINAH', 'Aulia Annisa Mutmainah'), true)
cek('nama beda', namaSama('LEVINDA HAZA', 'Revinda Haza'), false)

console.log(`\n${lulus} lulus, ${gagal} gagal`)
if (gagal > 0) process.exit(1)
