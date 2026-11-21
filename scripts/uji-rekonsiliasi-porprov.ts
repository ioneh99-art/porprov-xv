// scripts/uji-rekonsiliasi-porprov.ts — mengunci pemasangan medali resmi vs medali kita.
// Dijalankan: npm run uji:rekonsiliasi-porprov
import { rekonsiliasi, type MedaliKita, type MedaliResmi } from '../src/lib/rekonsiliasi-porprov'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const R = (id: number, caborId: number | null, nomor: string, jenis: MedaliResmi['jenis'], atlet: string[], cabor = 'X'): MedaliResmi => ({ id, nomorSitusId: id, cabor, caborId, nomor, jenis, atlet })
const K = (id: number, caborId: number | null, nomor: string, jenis: MedaliKita['jenis'], atlet: string[]): MedaliKita => ({ id, caborId, nomor, jenis, atlet })

// Nomor & atlet sama → berpasangan, tanpa beda
const h1 = rekonsiliasi([R(1, 9, 'Canoeing - K - 1 1000 M Putra', 'emas', ['Indra Hidayat'])], [K(101, 9, 'DAYUNG CANOEING · Canoeing - K - 1 1000 M (Pa)', 'emas', ['INDRA HIDAYAT'])])
cek('pasangan sempurna', [h1.pasangan.length, h1.pasangan[0].atletBeda, h1.resmiSaja.length, h1.kitaSaja.length], [1, { hanyaResmi: [], hanyaKita: [] }, 0, 0])

// Nama nomor beda tulisan tapi atlet sama → berpasangan, cocokNomor=false
const h2 = rekonsiliasi([R(2, 30, 'Techno Terbuka', 'emas', ['Budi Santoso'])], [K(102, 30, 'open tecno', 'emas', ['Budi Santoso'])])
cek('nomor beda, atlet sama', [h2.pasangan.length, h2.pasangan[0].cocokNomor], [1, false])

// Jenis medali beda → tidak berpasangan
const h3 = rekonsiliasi([R(3, 30, 'Techno Terbuka', 'emas', ['Budi Santoso'])], [K(103, 30, 'Techno Terbuka', 'perak', ['Budi Santoso'])])
cek('jenis beda → dua-duanya sendiri', [h3.pasangan.length, h3.resmiSaja.length, h3.kitaSaja.length], [0, 1, 1])

// Cabor beda → tidak berpasangan
const h4 = rekonsiliasi([R(4, 1, 'Beregu Putra', 'emas', ['A B'])], [K(104, 2, 'Beregu Putra', 'emas', ['A B'])])
cek('cabor beda → tidak berpasangan', h4.pasangan.length, 0)

// Dua perunggu satu nomor → masing-masing ke laporannya sendiri lewat atlet
const h5 = rekonsiliasi(
  [R(5, 7, 'Kelas 52 Kg Putra', 'perunggu', ['Andi Pratama']), R(6, 7, 'Kelas 52 Kg Putra', 'perunggu', ['Rudi Hartono'])],
  [K(106, 7, 'Kelas 52 Kg Putra', 'perunggu', ['Rudi Hartono']), K(105, 7, 'Kelas 52 Kg Putra', 'perunggu', ['Andi Pratama'])])
cek('dua perunggu dipasangkan sesuai atlet', h5.pasangan.map(p => [p.resmi.id, p.kita.id]).sort(), [[5, 105], [6, 106]])

// Laporan yang paling yakin tidak dicuri pasangan lain
const h6 = rekonsiliasi(
  [R(7, 3, 'Beregu Putra', 'emas', ['Ali Akbar']), R(8, 3, 'Ganda Putra', 'emas', ['Ali Akbar', 'Bayu Aji'])],
  [K(107, 3, 'Ganda Putra', 'emas', ['Ali Akbar', 'Bayu Aji']), K(108, 3, 'Beregu Putra', 'emas', ['Ali Akbar', 'Cecep'])])
cek('prioritas nomor+atlet', h6.pasangan.map(p => [p.resmi.id, p.kita.id]).sort(), [[7, 108], [8, 107]])

// Beda daftar atlet beregu
const h7 = rekonsiliasi([R(9, 9, 'DBR - 12 pendayung - 500 m Putra', 'emas', ['Bayu Nugraha', 'Indra Hidayat'])],
  [K(109, 9, 'DBR 12 pendayung 500 m Putra', 'emas', ['INDRA HIDAYAT', 'Yadi'])])
cek('beda atlet beregu', h7.pasangan[0].atletBeda, { hanyaResmi: ['Bayu Nugraha'], hanyaKita: ['Yadi'] })

// Nama disingkat/dipotong di situs tetap dianggap sama (awalan ≥6 huruf)
const h8 = rekonsiliasi([R(10, 9, 'X', 'perak', ['Moch Septian Alek Mukt'])], [K(110, 9, 'Y', 'perak', ['Moch Septian Alek Mukti'])])
cek('nama terpotong tetap sama', [h8.pasangan.length, h8.pasangan[0].atletBeda.hanyaResmi], [1, []])

// Cabor tak diketahui di salah satu sisi → boleh berpasangan lewat nomor/atlet
const h9 = rekonsiliasi([R(11, null, 'Tunggal Putri', 'emas', ['Siti'])], [K(111, 40, 'Tunggal Putri', 'emas', ['Siti'])])
cek('cabor resmi tak dikenal tetap bisa berpasangan', h9.pasangan.length, 1)

// Kosong
cek('kosong', rekonsiliasi([], []), { pasangan: [], resmiSaja: [], kitaSaja: [] })

console.log(`uji rekonsiliasi-porprov: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
