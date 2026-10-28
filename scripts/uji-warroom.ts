// scripts/uji-warroom.ts — War Room tanpa data contoh: peringkat, klasemen kosong, laga live.
// Dijalankan: npm run uji:warroom
import { klasemenDimulai, lagaLive, peringkatKontingen, type PartaiWR } from '../src/lib/warroom'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  if (JSON.stringify(dapat) === JSON.stringify(harap)) lulus++
  else { gagal++; console.log(`  GAGAL  ${nama}\n    dapat ${JSON.stringify(dapat)}\n    harap ${JSON.stringify(harap)}`) }
}
const b = (nama: string, emas: number, perak = 0, perunggu = 0) => ({ nama, emas, perak, perunggu, total: emas + perak + perunggu })

const NOL = [b('KAB. BANDUNG', 0), b('KOTA BANDUNG', 0), b('KAB. BEKASI', 0)]
cek('semua nol = belum mulai', klasemenDimulai(NOL), false)
cek('semua nol → tanpa peringkat (bukan #1)', peringkatKontingen(NOL, 'KAB. BANDUNG'), null)
const ADA = [b('KAB. BANDUNG', 1), b('KOTA BANDUNG', 3, 1), b('KAB. BEKASI', 1), b('KOTA DEPOK', 0, 0, 2)]
cek('ada medali = mulai', klasemenDimulai(ADA), true)
cek('peringkat urut emas', peringkatKontingen(ADA, 'KOTA BANDUNG'), 1)
cek('peringkat bersama bila sama persis', [peringkatKontingen(ADA, 'KAB. BANDUNG'), peringkatKontingen(ADA, 'KAB. BEKASI')], [2, 2])
cek('perunggu saja di bawah emas', peringkatKontingen(ADA, 'KOTA DEPOK'), 4)
cek('nama tak dikenal → null', peringkatKontingen(ADA, 'KAB. ANTAH'), null)
cek('huruf kecil tetap cocok', peringkatKontingen(ADA, 'kab. bandung'), 2)

const P = (id: number, tanggal: string, jam: string | null, status: string): PartaiWR => ({ id, cabor_id: 165, tanggal, jam, nomor_teks: 'Beregu (Pa)', lawan: null, venue: null, status })
const DAFTAR = [P(1, '2026-10-28', '13:30', 'berlangsung'), P(2, '2026-10-28', '09:00', 'berlangsung'), P(3, '2026-10-28', '10:00', 'terjadwal'),
  P(4, '2026-10-27', '20:00', 'berlangsung'), P(5, '2026-10-25', '09:00', 'berlangsung'), P(6, '2026-10-28', null, 'selesai')]
cek('laga live: hanya "berlangsung", hari ini dulu urut jam, lalu kemarin', lagaLive(DAFTAR, '2026-10-28').map(p => p.id), [2, 1, 4])
cek('laga live: lupa ditutup >1 hari tidak ikut', lagaLive(DAFTAR, '2026-10-30').map(p => p.id), [])
cek('laga live kosong', lagaLive([], '2026-10-28'), [])

console.log(`uji-warroom: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
