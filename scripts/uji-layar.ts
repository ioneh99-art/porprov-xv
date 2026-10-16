// scripts/uji-layar.ts — mengunci susunan isi Mode Layar (videotron).
// Dijalankan: npm run uji:layar
import { hitungMundur, jadwalPada, jadwalTampil, kelompokPerTanggal, namaAtletLayar, type MedaliLayar } from '../src/lib/layar'
import type { BarisJadwal } from '../src/lib/matriks'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

const m = (id: number, tanggal: string, hasil: MedaliLayar['hasil'], waktu = '2026-11-07T08:00:00Z'): MedaliLayar =>
  ({ id, tanggal, cabor: 'Gulat', nomor: 'x', hasil, atlet: ['A'], nilai: null, waktu })
const g = kelompokPerTanggal([
  m(1, '2026-11-08', 'perunggu', '2026-11-08T01:00:00Z'), m(2, '2026-11-07', 'perak'), m(3, '2026-11-08', 'emas', '2026-11-08T05:00:00Z'),
  m(4, '2026-11-08', 'emas', '2026-11-08T02:00:00Z'), m(5, '2026-11-03', 'emas'),
])
cek('tanggal paling awal di atas', g.map(h => h.tanggal), ['2026-11-03', '2026-11-07', '2026-11-08'])
cek('dalam sehari: emas dulu, lalu menurut waktu', g[2].medali.map(x => x.id), [4, 3, 1])
cek('hitungan per hari', g.map(h => [h.emas, h.perak, h.perunggu]), [[1, 0, 0], [0, 1, 0], [2, 0, 1]])
cek('hari ke-n PORPROV', g.map(h => h.hari_ke), [null, 1, 2])
cek('kosong', kelompokPerTanggal([]), [])

cek('nama atlet', [namaAtletLayar(['A']), namaAtletLayar(['A', 'B']), namaAtletLayar(['A', 'B', 'C']), namaAtletLayar([])], ['A', 'A & B', 'A dkk. (3 atlet)', '-'])

const j = (cabor_disiplin: string, cabor_nama_raw: string | null, mulai: string, selesai: string, tuan_rumah = 'BEKASI', jenis = 'pertandingan'): BarisJadwal =>
  ({ cabor_disiplin, cabor_nama_raw, jenis, wilayah: null, tuan_rumah, mulai, selesai, venue: 'V' })
const J = [
  j('Gulat', 'Gulat', '2026-11-03', '2026-11-06'),
  j('Canoeing', 'Dayung', '2026-11-04', '2026-11-09', 'KARAWANG'),
  j('Golf', 'Golf', '2026-11-10', '2026-11-19'),
  j('UPACARA PEMBUKAAN', null, '2026-11-07', '2026-11-07', 'BEKASI', 'upacara'),
  j('Rowing', 'DAYUNG', '2026-11-10', '2026-11-14', 'KARAWANG'),
]
const kita = ['Gulat', 'Dayung']
cek('jadwal pada satu tanggal: hanya cabor kita, upacara tidak', jadwalPada(J, kita, '2026-11-05').map(x => x.cabor_disiplin), ['Gulat', 'Canoeing'])
cek('jadwal hari ini bila ada', jadwalTampil(J, kita, '2026-11-04'), { tanggal: '2026-11-04', hari_ini: true, kegiatan: jadwalPada(J, kita, '2026-11-04') })
cek('sebelum mulai: hari terdekat yang ada pertandingan', jadwalTampil(J, kita, '2026-10-16')?.tanggal, '2026-11-03')
cek('jeda di tengah: lompat ke berikutnya (Golf bukan cabor kita)', jadwalTampil(J, kita, '2026-11-09')?.kegiatan.map(x => x.cabor_disiplin), ['Canoeing'])
cek('sesudah semua selesai', jadwalTampil(J, kita, '2026-11-20'), null)

cek('hitung mundur', [hitungMundur('2026-10-16'), hitungMundur('2026-11-06'), hitungMundur('2026-11-07'), hitungMundur('2026-11-10')], [22, 1, null, null])

console.log(`\nuji-layar: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
