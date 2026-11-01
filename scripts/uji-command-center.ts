// scripts/uji-command-center.ts — aturan 3 layar command center. Dijalankan: npm run uji:command-center
import { kalimatRingkas, nomorLayar, papanKlasemen, persenTarget, selisihTetangga } from '../src/lib/command-center'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const K = (nama: string, emas: number, perak = 0, perunggu = 0) => ({ nama, emas, perak, perunggu, total: emas + perak + perunggu })
const klas = [K('KOTA BEKASI', 21, 5), K('KOTA BANDUNG', 30, 2), K('KAB. BANDUNG', 12, 9, 15), K('KAB. BOGOR', 11), K('KOTA DEPOK', 3), K('KAB. GARUT', 1)]

cek('papan: urut emas, kita ditandai', papanKlasemen(klas, 'Kab. Bandung', 4).map(r => [r.peringkat, r.nama, r.kita]),
  [[1, 'KOTA BANDUNG', false], [2, 'KOTA BEKASI', false], [3, 'KAB. BANDUNG', true], [4, 'KAB. BOGOR', false]])
cek('papan: kita di luar n → baris terakhir diganti kita', papanKlasemen(klas, 'KAB. GARUT', 3).map(r => r.nama), ['KOTA BANDUNG', 'KOTA BEKASI', 'KAB. GARUT'])
cek('papan: peringkat bersama bila medali sama persis', papanKlasemen([K('A', 2), K('B', 2), K('C', 1)], 'C').map(r => r.peringkat), [1, 1, 3])
cek('papan: semua nol → kosong', papanKlasemen([K('A', 0), K('B', 0)], 'A'), [])
cek('tetangga: selisih emas atas & bawah', selisihTetangga(klas, 'KAB. BANDUNG'), { atas: { nama: 'KOTA BEKASI', emas: 9 }, bawah: { nama: 'KAB. BOGOR', emas: 1 } })
cek('tetangga: peringkat 1 tidak punya atas', selisihTetangga(klas, 'KOTA BANDUNG').atas, null)
cek('tetangga: belum mulai', selisihTetangga([K('A', 0)], 'A'), { atas: null, bawah: null })
cek('ringkas: lengkap', kalimatRingkas({ hariKe: 6, peringkat: 3, jumlahKontingen: 27, emas: 12, target: 74, besok: 8 }),
  ['Hari ke-6', 'Peringkat 3 dari 27', '12 emas dari target 74', 'Besok 8 peluang emas'])
cek('ringkas: pra-PORPROV, klasemen belum mulai, tanpa besok', kalimatRingkas({ hariKe: null, peringkat: null, jumlahKontingen: 27, emas: 0, target: 74, besok: 0 }),
  ['Pra-PORPROV', 'Klasemen belum dimulai', '0 emas dari target 74'])
cek('persen target', [persenTarget(12, 74), persenTarget(80, 74), persenTarget(3, 0)], [16, 100, 0])
cek('nomor layar', [nomorLayar('1'), nomorLayar('3'), nomorLayar('4'), nomorLayar('5'), nomorLayar(null), nomorLayar('x')], [1, 3, 4, null, null, null])

console.log(`uji-command-center: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
