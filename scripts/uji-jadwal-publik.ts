// scripts/uji-jadwal-publik.ts — mengunci susunan halaman publik jadwal dan rencana impor matriks KONI.
// Dijalankan: npm run uji:jadwal-publik
import { cocokCari, deretTanggal, hariKe, kegiatanPada, rentangSingkat, statusKegiatan, tanggalAwal, tglPanjang, urutDaftar, type BarisPublik } from '../src/lib/jadwal-publik'
import { rencanaMatriks, type BarisAda } from '../src/lib/impor-matriks'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

let id = 0
const b = (kegiatan: string, mulai: string | null, selesai: string | null, kota = 'BEKASI', jenis: 'pertandingan' | 'upacara' = 'pertandingan'): BarisPublik =>
  ({ id: ++id, jenis, kegiatan, cabor: kegiatan, wilayah: 'WILAYAH II', kota, venue: 'Venue ' + kegiatan, mulai, selesai })

const J = [
  b('Futsal Putra', '2026-10-28', '2026-11-08'),
  b('Kick Boxing', '2026-11-07', '2026-11-10'),
  b('Canoeing Sprint & SUP', '2026-11-06', '2026-11-10', 'KARAWANG'),
  b('UPACARA PEMBUKAAN PORPROV XV 2026', '2026-11-07', '2026-11-07', 'BEKASI', 'upacara'),
  b('Golf', '2026-11-10', '2026-11-19', 'KOTA DEPOK'),
  b('Tanpa Tanggal', null, null),
]

// ── status ──
cek('akan datang', statusKegiatan(J[1], '2026-11-06'), 'akan')
cek('hari pertama = berlangsung', statusKegiatan(J[1], '2026-11-07'), 'berlangsung')
cek('hari terakhir = berlangsung', statusKegiatan(J[1], '2026-11-10'), 'berlangsung')
cek('sesudahnya selesai', statusKegiatan(J[1], '2026-11-11'), 'selesai')
cek('tanpa tanggal', statusKegiatan(J[5], '2026-11-11'), 'tanpa_tanggal')
cek('satu hari tanpa selesai', statusKegiatan({ mulai: '2026-11-08', selesai: null }, '2026-11-08'), 'berlangsung')

// ── hari ke ──
cek('hari ke-3 dari 4', hariKe(J[1], '2026-11-09'), { ke: 3, dari: 4 })
cek('di luar rentang null', hariKe(J[1], '2026-11-11'), null)

// ── per tanggal ──
cek('7 Nov: upacara dulu, lalu kota', kegiatanPada(J, '2026-11-07').map(x => x.kegiatan), ['UPACARA PEMBUKAAN PORPROV XV 2026', 'Futsal Putra', 'Kick Boxing', 'Canoeing Sprint & SUP'])
cek('tanpa tanggal tidak ikut', kegiatanPada(J, '2026-11-07').some(x => x.kegiatan === 'Tanpa Tanggal'), false)

// ── deret tanggal ──
const d = deretTanggal(J)
cek('deret mulai 28 Okt', d[0].tanggal, '2026-10-28')
cek('deret berakhir 19 Nov', d[d.length - 1].tanggal, '2026-11-19')
cek('deret tanpa lubang (23 hari)', d.length, 23)
cek('jumlah 7 Nov tanpa upacara', d.find(x => x.tanggal === '2026-11-07')?.jumlah, 3)
cek('tanggal salah ketik tidak meledak', deretTanggal([b('X', '2026-11-01', '2062-11-01')]).length, 120)
cek('deret kosong', deretTanggal([]), [])

// ── tanggal awal ──
cek('sebelum mulai → hari pertama ada kegiatan', tanggalAwal(J, '2026-10-21'), '2026-10-28')
cek('hari ini ada kegiatan → hari ini', tanggalAwal(J, '2026-11-09'), '2026-11-09')
cek('sesudah semua selesai → tanggal terakhir', tanggalAwal(J, '2026-12-01'), '2026-11-19')

// ── urutan daftar ──
cek('urut: berlangsung, akan (terdekat), selesai (terbaru), tanpa tanggal',
  urutDaftar(J, '2026-11-08').map(x => x.kegiatan),
  ['Futsal Putra', 'Canoeing Sprint & SUP', 'Kick Boxing', 'Golf', 'UPACARA PEMBUKAAN PORPROV XV 2026', 'Tanpa Tanggal'])

// ── cari ──
cek('cari kota', cocokCari(J[2], 'karawang'), true)
cek('cari dua kata', cocokCari(J[2], 'canoe karawang'), true)
cek('cari tidak cocok', cocokCari(J[2], 'canoe bekasi'), false)
cek('cari kosong = semua', cocokCari(J[2], '  '), true)

// ── tulisan tanggal ──
cek('satu hari', rentangSingkat('2026-11-08', '2026-11-08'), '8 Nov')
cek('sebulan', rentangSingkat('2026-11-06', '2026-11-10'), '6–10 Nov')
cek('lintas bulan', rentangSingkat('2026-10-31', '2026-11-08'), '31 Okt – 8 Nov')
cek('tanpa tanggal', rentangSingkat(null, null), 'Tanggal belum ada')
cek('nama hari', tglPanjang('2026-11-07'), 'Sabtu, 7 November 2026')

// ── rencana impor matriks ──
const KEPALA = ['No.', 'Tanggal', 'Jam', 'Klaster Wilayah', 'Wilayah Venue', 'Cabor / Kegiatan', 'Nomor Pertandingan', 'Nama Atlet', 'Lawan', 'Hasil Pertandingan', 'Venue', 'Status Target', 'PIC']
const seri = (iso: string) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse('1899-12-30T00:00:00Z')) / 86_400_000)
const m = (tgl: string, kegiatan: string, kota: string, venue: string) => [1, seri(tgl), '', 'WILAYAH II', kota, kegiatan, '', '', '', '', venue, '', '']
const LAMA: BarisAda[] = [
  { id: 1, cabor_disiplin: 'Kick Boxing', mulai: '2026-11-12', selesai: '2026-11-15', venue: 'BCC Hotel Santika', tuan_rumah: 'BEKASI' },
  { id: 2, cabor_disiplin: 'Canoeing Slalom', mulai: '2026-11-04', selesai: '2026-11-09', venue: 'Sungai Cisangkuy', tuan_rumah: 'KAB. BANDUNG', akomodasi: 'Kab. BANDUNG' },
  { id: 3, cabor_disiplin: 'Canoeing Sprint & SUP', mulai: '2026-11-06', selesai: '2026-11-10', venue: 'Situ Cipule KAB. KARAWANG', tuan_rumah: 'KARAWANG' },
  { id: 4, cabor_disiplin: 'Marathon', mulai: '2026-11-17', selesai: '2026-11-17', venue: 'Harapan Indah', tuan_rumah: 'BEKASI' },
]
const SHEET = [[], ['MATRIX JADWAL HARIAN PORPROV XV 2026'], [], KEPALA,
  m('2026-11-07', 'Kick Boxing', 'BEKASI', 'Aula Arafah Asrama Haji'), m('2026-11-10', 'Kick Boxing', 'BEKASI', 'Aula Arafah Asrama Haji'),
  m('2026-11-10', 'Canoeing Slalom', 'KARAWANG', 'Tarum Barat Karawang'), m('2026-11-13', 'Canoeing Slalom', 'KARAWANG', 'Tarum Barat Karawang'),
  m('2026-11-06', 'Canoeing', 'KARAWANG', 'Situ Cipule'), m('2026-11-10', 'Canoeing', 'KARAWANG', 'Situ Cipule'),
  m('2026-11-14', 'Sakteboard', 'BEKASI', 'Lap. Skateboard Wibawa Mukti'),
  ['', '', '', '', '', '', '', '', '', '', '', '', ''],
]
const r = rencanaMatriks(SHEET, LAMA, ['Skateboard'], 'uji.xlsx')
cek('baris harian terbaca', r.baris_harian, 7)
cek('kick boxing: tanggal dan venue berubah', r.ubah.find(u => u.id === 1)?.isi, { mulai: '2026-11-07', selesai: '2026-11-10', venue: 'Aula Arafah Asrama Haji', sumber: 'uji.xlsx' })
cek('slalom pindah kota: akomodasi dikosongkan', r.ubah.find(u => u.id === 2)?.isi.akomodasi, null)
cek('slalom: tuan rumah baru', r.ubah.find(u => u.id === 2)?.isi.tuan_rumah, 'KARAWANG')
cek('nama lama "Canoeing" menunjuk baris Sprint & SUP, venue berimbuhan kota dianggap sama', r.ubah.some(u => u.id === 3), false)
cek('sama dihitung', r.sama, 1)
cek('kegiatan baru ditambah', r.tambah.map(t => [t.cabor_disiplin, t.mulai, t.selesai]), [['Sakteboard', '2026-11-14', '2026-11-14']])
cek('tidak di matriks dibiarkan', r.tak_di_matriks.map(t => t.id), [4])
let pesan = ''
try { rencanaMatriks([['bukan', 'matriks']], LAMA, [], 'x') } catch (e: any) { pesan = e.message }
cek('berkas salah → pesan jelas', pesan.startsWith('Baris kepala'), true)
pesan = ''
try { rencanaMatriks([KEPALA], LAMA, [], 'x') } catch (e: any) { pesan = e.message }
cek('kepala tanpa isi → pesan jelas', pesan.startsWith('Tidak ada baris'), true)

console.log(`uji-jadwal-publik: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
