// scripts/uji-bahan-porprov.ts — mengunci hitungan Bahan PORPROV berikutnya.
// Dijalankan: npm run uji:bahan-porprov
import { hitungBahan, type BahanLagaJ } from '../src/lib/bahan-porprov'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const L = (ref: number, tanggal: string | null, cabor: number, venue: string | null, opsi: Partial<BahanLagaJ> = {}): BahanLagaJ =>
  ({ ref, tanggal, jam: '09:00', caborSitusId: cabor, venue, klaster: 'K1', status: 'Selesai', perebutanMedali: false, ...opsi })

const laga = [
  L(1, '2026-11-02', 1, 'GOR A'), L(2, '2026-11-02', 1, 'GOR A', { perebutanMedali: true }), L(3, '2026-11-02', 2, 'Kolam B'),
  L(4, '2026-11-01', 1, 'GOR A'), L(5, '2026-11-01', 2, 'GOR A', { status: 'Dibatalkan' }),
  L(6, null, 1, 'GOR A'), // tanpa tanggal diabaikan
  L(7, '2026-11-03', 3, null, { perebutanMedali: true }),
]
const nomor = [
  { situsId: 10, nama: 'Nomor sepi', caborSitusId: 1, disiplin: null, gender: 'L', jumlahPeserta: 2 },
  { situsId: 11, nama: 'Nomor tipis', caborSitusId: 1, disiplin: null, gender: 'P', jumlahPeserta: 5 },
  { situsId: 12, nama: 'Nomor ramai', caborSitusId: 2, disiplin: null, gender: 'L', jumlahPeserta: 12 },
  { situsId: 13, nama: 'Nomor tanpa data', caborSitusId: 2, disiplin: null, gender: 'L', jumlahPeserta: null },
]
const medali = [
  { nomorSitusId: 10, medali: 'emas' as const, kontingenSitusId: 100 }, { nomorSitusId: 10, medali: 'perak' as const, kontingenSitusId: 200 },
  { nomorSitusId: 11, medali: 'emas' as const, kontingenSitusId: 200 }, { nomorSitusId: 12, medali: 'emas' as const, kontingenSitusId: 100 },
]
const h = hitungBahan({ laga, nomor, medali })

cek('hari urut & isi', h.hari, [
  { tanggal: '2026-11-01', laga: 1, dibatalkan: 1, perebutanMedali: 0, cabor: 1, venue: 1 },
  { tanggal: '2026-11-02', laga: 3, dibatalkan: 0, perebutanMedali: 1, cabor: 2, venue: 2 },
  { tanggal: '2026-11-03', laga: 1, dibatalkan: 0, perebutanMedali: 1, cabor: 1, venue: 0 },
])
cek('ringkas', h.ringkas, { hari: 3, mulai: '2026-11-01', selesai: '2026-11-03', laga: 5, dibatalkan: 1, venue: 2, nomorSepi: 1, nomorTipis: 1 })
cek('kalender tanpa yang batal', h.kalender['2026-11-01'], { 1: 1 })
cek('venue terpadat', h.venue.map(v => [v.nama, v.laga, v.hari, v.cabor, v.puncak]), [['GOR A', 3, 2, [1], { tanggal: '2026-11-02', laga: 2 }], ['Kolam B', 1, 1, [2], { tanggal: '2026-11-02', laga: 1 }]])
cek('nomor sepi & tipis', h.nomorSepi.map(n => [n.situsId, n.peserta, n.medali.length]), [[10, 2, 2], [11, 5, 1]])
cek('medali dari nomor sepi per kontingen', h.sepiPerKontingen, [
  { kontingenSitusId: 100, medaliSepi: 1, emasSepi: 1, medaliTotal: 2 },
  { kontingenSitusId: 200, medaliSepi: 1, emasSepi: 0, medaliTotal: 2 },
])

console.log(`uji bahan-porprov: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
