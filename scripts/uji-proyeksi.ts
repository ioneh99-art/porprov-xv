// scripts/uji-proyeksi.ts — mengunci hitungan proyeksi vs realisasi medali.
// Dijalankan: npm run uji:proyeksi
import { labelTanggal, pakaiTargetTetap, rapikanNama, rapikanNomor, susunProyeksi, urutkanRincian } from '../src/lib/proyeksi'
import { TARGET_EMAS_KONI } from '../src/lib/target-emas-koni'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const x = (tanggal: string, cabor: string) => ({ tanggal, cabor })

// Proyeksi kecil: 3 Nov 1, 4 Nov 2, 6 Nov 1 (5 Nov kosong)
const P = [x('2026-11-03', 'Gulat'), x('2026-11-04', 'Gulat'), x('2026-11-04', 'Dayung'), x('2026-11-06', 'Wushu')]

// ── sebelum PORPROV, tanpa realisasi ──
const awal = susunProyeksi(P, [], '2026-10-16')
cek('rentang hari berurutan tanpa lubang', awal.hari.map(h => h.tanggal), ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'])
cek('proyeksi harian dan kumulatif', awal.hari.map(h => [h.proyeksi, h.kum_proyeksi]), [[1, 1], [2, 3], [0, 3], [1, 4]])
cek('belum mulai: garis realisasi tidak digambar', awal.hari.map(h => h.kum_realisasi), [null, null, null, null])
cek('status belum mulai', [awal.status, awal.batas, awal.proyeksi_sd_batas], ['belum_mulai', null, 0])
cek('total', [awal.total_proyeksi, awal.total_realisasi], [4, 0])

// ── di tengah PORPROV ──
const tengah = susunProyeksi(P, [x('2026-11-03', 'Gulat')], '2026-11-04')
cek('batas = hari ini bila lebih akhir dari realisasi terakhir', tengah.batas, '2026-11-04')
cek('garis realisasi berhenti di batas', tengah.hari.map(h => h.kum_realisasi), [1, 1, null, null])
cek('dibandingkan dengan proyeksi sampai batas, bukan total', [tengah.proyeksi_sd_batas, tengah.status], [3, 'di_belakang'])

// ── realisasi lebih cepat dari jadwal (simulasi: laporan bertanggal ke depan) ──
const depan = susunProyeksi(P, [x('2026-11-03', 'Gulat'), x('2026-11-03', 'Dayung'), x('2026-11-04', 'Gulat')], '2026-10-16')
cek('batas = realisasi terakhir bila hari ini sebelum rentang', depan.batas, '2026-11-04')
cek('sama dengan proyeksi sampai batas', [depan.hari[1].kum_realisasi, depan.proyeksi_sd_batas, depan.status], [3, 3, 'sesuai'])
const lebih = susunProyeksi(P, [x('2026-11-03', 'Gulat'), x('2026-11-03', 'Dayung')], '2026-11-03')
cek('lebih banyak dari proyeksi hari itu', lebih.status, 'di_depan')

// ── sesudah PORPROV ──
const akhir = susunProyeksi(P, [x('2026-11-03', 'Gulat')], '2026-12-01')
cek('hari ini sesudah rentang: batas = hari terakhir', [akhir.batas, akhir.hari.map(h => h.kum_realisasi)], ['2026-11-06', [1, 1, 1, 1]])
cek('realisasi di luar tanggal proyeksi memperluas rentang', susunProyeksi(P, [x('2026-11-08', 'Gulat')], '2026-11-08').hari.map(h => h.tanggal).pop(), '2026-11-08')

// ── per cabor ──
const pc = susunProyeksi(P, [x('2026-11-03', 'Gulat'), x('2026-11-03', 'Gulat'), x('2026-11-05', 'Karate')], '2026-11-06').per_cabor
cek('per cabor: yang tertinggal di atas, cabor tanpa proyeksi tetap muncul', pc, [
  { cabor: 'Dayung', proyeksi: 1, realisasi: 0, selisih: -1 },
  { cabor: 'Wushu', proyeksi: 1, realisasi: 0, selisih: -1 },
  { cabor: 'Gulat', proyeksi: 2, realisasi: 2, selisih: 0 },
  { cabor: 'Karate', proyeksi: 0, realisasi: 1, selisih: 1 },
])

// ── kosong ──
const kosong = susunProyeksi([], [], '2026-11-03')
cek('tanpa data apa pun', [kosong.hari.length, kosong.status, kosong.per_cabor.length], [0, 'belum_mulai', 0])

// ── target tetap tanpa tanggal (target KONI 54 Kab. Bandung) ──
const RT = [x('2026-11-03', 'Gulat'), x('2026-11-04', 'Gulat'), x('2026-11-04', 'Karate')]
const tt = pakaiTargetTetap(susunProyeksi(P, RT, '2026-11-04'), [{ cabor: 'Gulat', emas: 1 }, { cabor: 'Dayung', emas: 2 }], RT)
cek('target tetap: rentang & realisasi tetap dari dasar', [tt.hari.map(h => h.tanggal), tt.hari.map(h => h.kum_realisasi)], [['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'], [1, 3, null, null]])
cek('target tetap: garis datar, tanpa proyeksi per hari', tt.hari.map(h => [h.proyeksi, h.kum_proyeksi]), [[0, 3], [0, 3], [0, 3], [0, 3]])
cek('target tetap: total, pembanding, status', [tt.total_proyeksi, tt.proyeksi_sd_batas, tt.status, tt.target_tetap], [3, 3, 'sesuai', true])
cek('target tetap: per cabor vs target', tt.per_cabor, [
  { cabor: 'Dayung', proyeksi: 2, realisasi: 0, selisih: -2 },
  { cabor: 'Gulat', proyeksi: 1, realisasi: 2, selisih: 1 },
  { cabor: 'Karate', proyeksi: 0, realisasi: 1, selisih: 1 },
])
const tb = pakaiTargetTetap(susunProyeksi(P, [], '2026-10-16'), [{ cabor: 'Gulat', emas: 2 }], [])
cek('target tetap sebelum mulai', [tb.status, tb.proyeksi_sd_batas], ['belum_mulai', 0])
cek('target KONI Kab. Bandung = 54 emas, cabor tidak kembar', [TARGET_EMAS_KONI.reduce((n, t) => n + t.emas, 0), new Set(TARGET_EMAS_KONI.map(t => t.cabor_id)).size === TARGET_EMAS_KONI.length], [54, true])

cek('label tanggal', [labelTanggal('2026-11-03'), labelTanggal('2026-10-30'), labelTanggal('x')], ['3 Nov', '30 Okt', 'x'])

// ── rekap emas per hari ──
cek('nomor: awalan disiplin dibuang', rapikanNomor('DAYUNG CANOEING · Canoeing - K - 1 1000 M (Pa)'), 'Canoeing - K - 1 1000 M (Pa)')
cek('nomor: tanpa awalan tetap', rapikanNomor('Kelas 45 Kg (Pa)'), 'Kelas 45 Kg (Pa)')
cek('nomor: titik tengah di dalam nama tidak dipotong', rapikanNomor('Beregu · putaran 2'), 'Beregu · putaran 2')
cek('nomor kosong', rapikanNomor(null), '-')
cek('nama kapital dirapikan', [rapikanNama('AGUNG GUNAWAN'), rapikanNama('M. RAMDAN RUDIANA'), rapikanNama('Verlyta Joevanka W')], ['Agung Gunawan', 'M. Ramdan Rudiana', 'Verlyta Joevanka W'])
const ri = (id: number, tanggal: string, cabor: string, nomor: string) => ({ id, tanggal, cabor, disiplin: null, nomor, atlet: [], nilai: null })
cek('rincian urut tanggal → cabor → nomor', urutkanRincian([ri(3, '2026-11-04', 'Gulat', 'B'), ri(1, '2026-11-04', 'Dayung', 'Z'), ri(2, '2026-11-03', 'Wushu', 'A'), ri(4, '2026-11-04', 'Gulat', 'A')]).map(r => r.id), [2, 1, 4, 3])

console.log(`\nuji-proyeksi: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
