// scripts/uji-warroom.ts — War Room tanpa data contoh: peringkat, klasemen kosong, laga live.
// Dijalankan: npm run uji:warroom
import { duelRival, kalenderPanas, klasemenDimulai, koordinatKota, lagaLive, menitLagi, partaiBerikut, peringkatKontingen, statusMisi, tetangga, type PartaiWR, type ProyeksiBaris } from '../src/lib/warroom'

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


// ── tetangga & rival ──
cek('tetangga sebelum mulai kosong', tetangga(NOL, 'KAB. BANDUNG'), { atas: null, kita: null, bawah: null })
const t = tetangga(ADA, 'KAB. BEKASI')
cek('tetangga: atas & bawah', [t.atas?.nama, t.kita?.nama, t.bawah?.nama], ['KAB. BANDUNG', 'KAB. BEKASI', 'KOTA DEPOK'])
cek('tetangga juara: tanpa atas', tetangga(ADA, 'KOTA BANDUNG').atas, null)
cek('duel rival: selisih emas (+ = unggul)', duelRival(ADA, 'KAB. BANDUNG', ['KOTA BANDUNG', 'KAB. ANTAH', 'KOTA DEPOK']).map(r => [r.nama, r.selisih_emas]), [['KOTA BANDUNG', -2], ['KOTA DEPOK', 1]])

// ── misi emas ──
const PR = (urutan: number, cabor_id: number, nomor: string, tanggal = '2026-11-05'): ProyeksiBaris => ({ urutan, tanggal, cabor_id, cabor: 'Gulat', nomor, atlet: null, kota: null })
const MISI = [PR(1, 25, 'Bebas - Kelas s/d 86 Kg (Pa)'), PR(2, 25, 'Bebas - Kelas s/d 52 Kg (Pa)'), PR(3, 71, 'Kyorugi -54 kg (Pa)'), PR(4, 10, '5.000 M (Pi)')]
const LAP = [
  { id: 11, cabor_id: 25, tanggal: '2026-11-05', hasil: 'perak', nomor_teks: 'Bebas Kelas s/d 52 Kg (Pa)' },
  { id: 12, cabor_id: 25, tanggal: '2026-11-05', hasil: 'emas', nomor_teks: 'Gaya Bebas 86 kg' },
  { id: 13, cabor_id: 71, tanggal: '2026-11-05', hasil: 'gugur', nomor_teks: 'Kyorugi -54 kg (Pa)' },
  { id: 14, cabor_id: 25, tanggal: '2026-11-04', hasil: 'emas', nomor_teks: 'Bebas - Kelas s/d 86 Kg (Pa)' },
]
const sm = statusMisi(MISI, LAP, new Set([10]))
cek('misi: nomor cocok → perak = medali lain', sm.find(m => m.urutan === 2)?.status, 'medali_lain')
cek('misi: nomor cocok → emas', sm.find(m => m.urutan === 1)?.status, 'emas')
cek('misi: gugur = meleset', sm.find(m => m.urutan === 3)?.status, 'meleset')
cek('misi: cabor sedang main = berjalan', sm.find(m => m.urutan === 4)?.status, 'berjalan')
cek('misi: laporan tanggal lain tidak dipakai', statusMisi([PR(9, 25, 'X', '2026-11-06')], LAP, new Set()).map(m => m.status), ['belum'])
cek('misi: emas tanpa nama cocok dibagi berurutan, sekali pakai', statusMisi([PR(1, 25, 'A'), PR(2, 25, 'B')], [{ id: 1, cabor_id: 25, tanggal: '2026-11-05', hasil: 'emas', nomor_teks: 'zzz' }], new Set()).map(m => m.status), ['emas', 'belum'])

// ── arena ──
cek('menit lagi', [menitLagi('13:30', '12:00'), menitLagi('09:00', '12:00'), menitLagi(null, '12:00')], [90, -180, null])
const AR = [P(1, '2026-10-28', '09:00', 'terjadwal'), P(2, '2026-10-28', '14:00', 'terjadwal'), P(3, '2026-10-28', '15:00', 'selesai'),
  P(4, '2026-10-28', null, 'ditunda'), P(5, '2026-10-30', '13:30', 'terjadwal'), P(6, '2026-10-31', '08:00', 'terjadwal')]
cek('berikut hari ini: urut jam, >3 jam lewat dibuang, tanpa jam di akhir', partaiBerikut(AR, '2026-10-28', '12:30').map(p => p.id), [2, 4])
cek('berikut hari ini termasuk lewat ≤3 jam', partaiBerikut(AR, '2026-10-28', '11:00').map(p => p.id), [1, 2, 4])
cek('berikut: hari ini habis → tanggal terdekat', partaiBerikut(AR, '2026-10-29', '08:00').map(p => p.id), [5])

// ── kalender & kota ──
const kal = kalenderPanas(['2026-11-18', '2026-11-18', '2026-11-03'], ['2026-11-03'], [{ mulai: '2026-11-02', selesai: '2026-11-04' }], '2026-11-02', '2026-11-04')
cek('kalender panas', kal.map(h => [h.tanggal.slice(8), h.proyeksi, h.realisasi, h.kegiatan]), [['02', 0, 0, 1], ['03', 1, 1, 1], ['04', 0, 0, 1]])
cek('koordinat kota', ['BEKASI', 'Kota Depok', 'KAB. BANDUNG', 'KOTA CIMAHI', 'Antah'].map(k => koordinatKota(k)?.label ?? null), ['Bekasi', 'Depok', 'Kab. Bandung', 'Cimahi', null])

console.log(`uji-warroom: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
