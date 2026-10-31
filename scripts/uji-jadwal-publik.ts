// scripts/uji-jadwal-publik.ts — mengunci susunan halaman publik jadwal dan rencana impor matriks KONI.
// Dijalankan: npm run uji:jadwal-publik
import { hasilPublik, namaAtletPartai, namaRapi, pasangHasil, pilihKabarLolos, kabarLolosAktif, type LaporanSah, type PartaiPublik } from '../src/lib/jadwal-publik'
import { adalahMedali, medaliPerCabor, rekapPublik, urutMedali, type MedaliPublik } from '../src/lib/jadwal-publik'
import { ikonCabor, ringkasWilayah, segeraMulai, cocokCari, deretTanggal, hariKe, kegiatanPada, rentangSingkat, statusKegiatan, tanggalAwal, tglPanjang, urutDaftar, type BarisPublik } from '../src/lib/jadwal-publik'
import { jamSel, rencanaMatriks, rencanaPartai, type BarisAda } from '../src/lib/impor-matriks'

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

// ── hiasan ──
cek('ikon futsal', ikonCabor({ kegiatan: 'Futsal Putra', cabor: 'Futsal' }), '⚽')
cek('ikon sepak takraw bukan sepak bola', ikonCabor({ kegiatan: 'Sepak Takraw', cabor: 'Sepak Takraw' }), '🏐')
cek('ikon dayung', ikonCabor({ kegiatan: 'Canoeing Sprint & SUP', cabor: 'Dayung' }), '🚣')
cek('ikon polo air bukan renang', ikonCabor({ kegiatan: 'Akuatik - Polo Air', cabor: 'Akuatik' }), '🤽')
cek('ikon kick boxing', ikonCabor({ kegiatan: 'Kick Boxing', cabor: 'Kickboxing' }), '🥊')
cek('ikon pentathlon', ikonCabor({ kegiatan: 'Modern Pentathlon', cabor: 'Modern Pentathlon' }), '🤺')
cek('ikon tak dikenal', ikonCabor({ kegiatan: 'Cabor Baru', cabor: null }), '🏅')
const W = ringkasWilayah([
  { ...J[0], wilayah: 'WILAYAH II', kota: 'BEKASI' }, { ...J[1], wilayah: 'WILAYAH II', kota: 'BEKASI' },
  { ...J[2], wilayah: 'WILAYAH II', kota: 'KARAWANG' }, { ...J[4], wilayah: 'WILAYAH I', kota: 'KOTA DEPOK' }, J[3],
])
cek('wilayah urut, upacara tidak dihitung', W.map(w => [w.wilayah, w.kegiatan]), [['WILAYAH I', 1], ['WILAYAH II', 3]])
cek('kota terbanyak dulu', W[1].kota, [{ nama: 'BEKASI', kegiatan: 2 }, { nama: 'KARAWANG', kegiatan: 1 }])
cek('segera mulai: terdekat dulu, hari lagi', segeraMulai(J, '2026-11-05', 2).map(x => [x.kegiatan, x.hari_lagi]), [['Canoeing Sprint & SUP', 1], ['Kick Boxing', 2]])
cek('segera mulai tidak memuat yang sudah jalan', segeraMulai(J, '2026-11-08').map(x => x.kegiatan), ['Golf'])

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

// ── partai dari matriks ──
cek('jam: titik', jamSel('09.00'), '09:00')
cek('jam: pecahan hari Excel', jamSel(0.375), '09:00')
cek('jam: tanggal+jam Excel', jamSel(46323.5625), '13:30')
cek('jam: kosong / ngawur', [jamSel(''), jamSel('pagi'), jamSel('25:00')], [null, null, null])
const SHEET2 = [KEPALA,
  m('2026-10-28', 'Kick Boxing', 'BEKASI', 'Aula Arafah'),
  [2, seri('2026-10-28'), 0.375, 'WILAYAH II', 'BEKASI', 'Kick Boxing', 'Point Fight -51 Kg', 'Budi Santoso, Nama Tak Dikenal', 'Kota Bekasi', '', 'Aula Arafah', '', ''],
  [3, seri('2026-10-30'), '', 'WILAYAH II', 'BEKASI', 'Cabor Asing', 'Final', '', 'Kota Bogor', '', 'X', '', ''],
]
const r2 = rencanaMatriks(SHEET2, LAMA, [], 'uji.xlsx')
cek('hanya baris berisi yang jadi partai', r2.partai.length, 2)
cek('partai tertaut ke baris jadwal', r2.partai[0].jadwal_id, 1)
const caborJadwal = new Map([[1, 70]])
const atletC = new Map([[70, [{ id: 501, nama: 'BUDI SANTOSO' }]]])
const rp = rencanaPartai(r2.partai, [], caborJadwal, atletC)
cek('partai baru: nomor, jam, lawan, atlet cocok nama', rp.tambah.map(t => [t.nomor_teks, t.jam, t.lawan, t.atlet_ids]), [['Kick Boxing · Point Fight -51 Kg', '09:00', 'Kota Bekasi', [501]]])
cek('atlet tak dikenal ke keterangan', rp.tambah[0].keterangan, 'Atlet di berkas KONI: Nama Tak Dikenal')
cek('kegiatan tak tertaut dilaporkan', rp.tak_tertaut, [{ kegiatan: 'Cabor Asing', tanggal: '2026-10-30' }])
const adaPIC = [{ id: 9, cabor_id: 70, tanggal: '2026-10-28', nomor_teks: 'Kick Boxing · Point Fight -51 Kg', lawan: 'Kota Bekasi', jam: '10:15', venue: null, atlet_ids: [] }]
const rp2 = rencanaPartai(r2.partai, adaPIC, caborJadwal, atletC)
cek('partai PIC tidak ditambah ulang', rp2.tambah.length, 0)
cek('jam PIC tidak ditimpa; venue & atlet kosong dilengkapi', rp2.lengkapi.map(l => [l.id, l.isi]), [[9, { venue: 'Aula Arafah', atlet_ids: [501] }]])


// ── perolehan medali publik ──
const MD: MedaliPublik[] = [
  { id: 1, tanggal: '2026-10-28', cabor: 'Futsal', nomor: 'Beregu (Pa)', medali: 'perunggu', atlet: ['A'] },
  { id: 2, tanggal: '2026-11-03', cabor: 'Gulat', nomor: 'Grego 67 kg', medali: 'emas', atlet: ['B'] },
  { id: 3, tanggal: '2026-11-03', cabor: 'Gulat', nomor: 'Grego 60 kg', medali: 'perak', atlet: ['C'] },
  { id: 4, tanggal: '2026-11-03', cabor: 'Atletik', nomor: '5.000 M', medali: 'emas', atlet: ['D'] },
]
cek('rekap medali', rekapPublik(MD), { emas: 2, perak: 1, perunggu: 1, total: 4 })
cek('rekap kosong', rekapPublik([]), { emas: 0, perak: 0, perunggu: 0, total: 0 })
cek('urut: terbaru dulu, emas sebelum perak', urutMedali(MD).map(m => m.id), [4, 2, 3, 1])
cek('per cabor gaya klasemen', medaliPerCabor(MD).map(c => `${c.cabor}:${c.emas}${c.perak}${c.perunggu}`), ['Gulat:110', 'Atletik:100', 'Futsal:001'])
cek('lolos/gugur/peringkat bukan medali', ['lolos', 'gugur', 'peringkat', 'emas'].map(adalahMedali), [false, false, false, true])

// ── skor partai dari laporan disahkan ──
const PT = [
  { id: 2, cabor_id: 165, tanggal: '2026-10-28', lawan: 'Kota Cirebon' },
  { id: 3, cabor_id: 165, tanggal: '2026-10-30', lawan: 'Kota Depok' },
  { id: 9, cabor_id: 50, tanggal: '2026-11-04', lawan: null },
]
const LS = (o: Partial<LaporanSah>): LaporanSah => ({ id: 1, partai_id: null, cabor_id: 165, tanggal: '2026-10-28', lawan: 'Kota cirebon', hasil: 'lolos', peringkat: null, nilai_teks: '5 - 2', ...o })
const ph = (l: LaporanSah[]) => Object.fromEntries(Array.from(pasangHasil(PT, l)).map(([k, v]) => [k, `${v.label}|${v.skor}`]))
cek('cocok lewat cabor+tanggal+lawan (huruf diabaikan)', ph([LS({})]), { 2: 'Lolos|5 - 2' })
cek('tautan partai_id diutamakan', ph([LS({ id: 7, partai_id: 3, tanggal: '2026-10-30', lawan: 'x', nilai_teks: '3-1' })]), { 3: 'Lolos|3-1' })
cek('lawan beda → tidak dipasang', ph([LS({ lawan: 'Kota Bogor' })]), {})
cek('partai tanpa lawan tidak dicocokkan tebakan', ph([LS({ cabor_id: 50, tanggal: '2026-11-04', lawan: null })]), {})
cek('laporan terbaru menang', ph([LS({ id: 1, nilai_teks: '4-2' }), LS({ id: 5, nilai_teks: '5-2' })]), { 2: 'Lolos|5-2' })
cek('label gugur/peringkat/emas', [LS({ hasil: 'gugur' }), LS({ hasil: 'peringkat', peringkat: 4 }), LS({ hasil: 'emas', nilai_teks: '  ' })].map(l => { const h = hasilPublik(l)!; return `${h.label}|${h.skor}` }), ['Gugur|5 - 2', 'Peringkat 4|5 - 2', 'Emas|null'])
cek('hasil asing diabaikan', hasilPublik(LS({ hasil: 'aneh' })), null)

// Kabar LOLOS di halaman depan
const NC = new Map([[165, 'Futsal']])
const PTB = PT.map(p => ({ ...p, babak: p.id === 2 ? 'Grup A' : null }))
const LN = (o: Partial<LaporanSah & { nomor_teks: string | null }>) => ({ ...LS({}), nomor_teks: 'Beregu (Pa)', ...o })
const kb = pilihKabarLolos([LN({})], NC, PTB)
cek('kabar lolos: skor, lawan & babak dari partai', kb.map(k => `${k.cabor}|${k.skor}|${k.lawan}|${k.babak}`), ['Futsal|5 - 2|Kota Cirebon|Grup A'])
cek('kabar turun kalau sesudahnya gugur', pilihKabarLolos([LN({}), LN({ id: 2, tanggal: '2026-10-30', hasil: 'gugur', lawan: 'Kota Depok' })], NC, PTB).length, 0)
cek('kabar turun kalau sudah medali', pilihKabarLolos([LN({}), LN({ id: 2, tanggal: '2026-11-08', hasil: 'emas' })], NC, PTB).length, 0)
cek('nomor lain tidak saling menurunkan', pilihKabarLolos([LN({}), LN({ id: 2, hasil: 'gugur', nomor_teks: 'Beregu (Pi)' })], NC, PTB).length, 1)
cek('lolos lagi → kabar terbaru', pilihKabarLolos([LN({}), LN({ id: 2, tanggal: '2026-10-30', lawan: 'Kota Depok', nilai_teks: '3 - 1' })], NC, PTB).map(k => k.skor), ['3 - 1'])
cek('menang pool → kabar MENANG', pilihKabarLolos([LN({ hasil: 'menang' })], NC, PTB).map(k => k.jenis), ['menang'])
cek('kalah pool terbaru → kabar turun', pilihKabarLolos([LN({ hasil: 'menang' }), LN({ id: 2, tanggal: '2026-10-30', hasil: 'kalah', lawan: 'Kota Depok' })], NC, PTB).length, 0)
cek('label publik kalah pool', hasilPublik(LS({ hasil: 'kalah', nilai_teks: '1-2' })), { jenis: 'kalah', label: 'Kalah · masih bertanding', skor: '1-2' })
const JF = [b('Futsal Putra', '2026-10-28', '2026-11-08')].map(x => ({ ...x, cabor: 'Futsal' }))
const PP = (o: Partial<PartaiPublik>): PartaiPublik => ({ id: 3, cabor: 'Futsal', tanggal: '2026-10-30', jam: '13:30:00', nomor: 'Beregu (Pa)', babak: 'Grup A', atlet: [], lawan: 'Kota Depok', venue: null, status: 'terjadwal', ...o })
const ak = (h: string, p: PartaiPublik[] = [PP({})]) => kabarLolosAktif(kb, JF, p, h).map(k => `${k.sampai}|${k.berikut?.lawan ?? '-'}`)
cek('kabar tayang + laga berikutnya', ak('2026-10-30'), ['2026-11-08|Kota Depok'])
cek('kabar tayang sampai cabor selesai', ak('2026-11-08', []), ['2026-11-08|-'])
cek('kabar turun sesudah cabor selesai', ak('2026-11-09'), [])
cek('laga yang sudah selesai bukan "berikutnya"', ak('2026-10-30', [PP({ status: 'selesai' })]), ['2026-11-08|-'])
const kbVoli = kb.map(k => ({ ...k, nomor: 'BOLA VOLI PASIR · Beregu (Pa)' }))
cek('laga berikutnya: nomor laporan berawalan disiplin', kabarLolosAktif(kbVoli, JF, [PP({ disiplin: 'BOLA VOLI PASIR' })], '2026-10-30').map(k => k.berikut?.lawan ?? '-'), ['Kota Depok'])
cek('disiplin lain bukan laga berikutnya', kabarLolosAktif(kbVoli, JF, [PP({ disiplin: 'BOLA VOLI INDOOR' })], '2026-10-30').map(k => k.berikut?.lawan ?? '-'), ['-'])
cek('cabor tanpa jadwal → 3 hari', kabarLolosAktif(kb, [], [], '2026-10-31').map(k => k.sampai), ['2026-10-31'])

// Nama dari daftar resmi untuk atlet yang belum punya data
cek('namaRapi', [namaRapi('  SITI NAJIRA  ADABINA GYSANI'), namaRapi("EVANDRA SATRIA NUR SYA'BAN"), namaRapi('NUURIL HUDAA AL-FURQAAN')], ['Siti Najira Adabina Gysani', "Evandra Satria Nur Sya'ban", 'Nuuril Hudaa Al-Furqaan'])
cek('tim dilengkapi dari daftar resmi', namaAtletPartai(['Khania Julianti'], ['SRI SALSABILA', 'KHANIA JULIANTI']), ['Khania Julianti', 'Sri Salsabila'])
cek('nama HURUF BESAR dirapikan, campuran dibiarkan', namaAtletPartai(['REVAN ANWARI', 'Fauzan McDonald'], []), ['Revan Anwari', 'Fauzan McDonald'])
cek('partai tanpa atlet tetap kosong', namaAtletPartai([], ['SRI SALSABILA']), [])

console.log(`uji-jadwal-publik: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
