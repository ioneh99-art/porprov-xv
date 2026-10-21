// scripts/uji-matriks.ts — mengunci penyusunan jurnal format matriks KONI.
// Dijalankan: npm run uji:matriks
import {
  KEPALA_MATRIKS, lembarMatriks, pilihKegiatan, rentangTanggal, statusTarget, susunMatriks, tanggalIndonesia, tulisAtlet,
  type BarisJadwal, type LaporanMatriks,
} from '../src/lib/matriks'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

const j = (cabor_disiplin: string, cabor_nama_raw: string | null, mulai: string, selesai: string, tuan_rumah = 'BEKASI', wilayah = 'WILAYAH II', venue = 'Venue ' + cabor_disiplin): BarisJadwal =>
  ({ cabor_disiplin, cabor_nama_raw, jenis: 'pertandingan', wilayah, tuan_rumah, mulai, selesai, venue })

// Nama baris seperti yang benar-benar ada di jadwal_cabor.
const JADWAL: BarisJadwal[] = [
  j('Canoeing', 'Dayung', '2026-11-04', '2026-11-09', 'KARAWANG'),
  j('Canoeing - Slalom', 'Dayung', '2026-11-04', '2026-11-09', 'KAB. BANDUNG', 'WILAYAH III'),
  j('Rowing', 'Dayung', '2026-11-10', '2026-11-14', 'KARAWANG'),
  j('Rowing - Beach', 'Dayung', '2026-11-14', '2026-11-14', 'KARAWANG'),
  j('DBR', 'Dayung', '2026-11-15', '2026-11-19', 'KARAWANG'),
  j('Hoki Indoor', 'Hockey', '2026-11-01', '2026-11-07', 'DEPOK', 'WILAYAH I'),
  j('Hoki Outdoor - Field', 'Hockey', '2026-11-08', '2026-11-12', 'DEPOK', 'WILAYAH I'),
  j('Aquatic - Renang', 'Akuatik', '2026-11-05', '2026-11-10'),
  j('Akuatik - Renang', 'Akuatik', '2026-11-08', '2026-11-13'),
  j('Akuatik - Polo Air', 'Akuatik', '2026-11-05', '2026-11-14', 'KOTA BANDUNG', 'WILAYAH III'),
  j('Akuatik - Renang Perairan Terbuka', 'Akuatik', '2026-11-14', '2026-11-16', 'PURWAKARTA'),
  j('Akuatik - Renang Artistik', 'Akuatik', '2026-11-17', '2026-11-19'),
  j('Bolavoli Indoor', 'Bola Voli', '2026-11-10', '2026-11-19'),
  j('Bola Voli Pasir', 'Bola Voli', '2026-10-30', '2026-11-08'),
  j('Sepak Bola Putri', 'Sepak Bola', '2026-11-06', '2026-11-19', 'DEPOK', 'WILAYAH I'),
  j('Sepak Bola Putra', 'Sepak Bola', '2026-11-07', '2026-11-19'),
  j('Bermotor Road Race', 'Balap Motor', '2026-11-08', '2026-11-11', 'KAB. BOGOR', 'WILAYAH I'),
  j('Bermotor - Grass Track', 'Balap Motor', '2026-11-12', '2026-11-15', 'KAB. BOGOR', 'WILAYAH I'),
  j('Mini 4WD', 'Balap Motor', '2026-11-12', '2026-11-15'),
  j('Balap Sepeda BMX - Freestyle Park, Flat Land, Trial', 'Balap Sepeda', '2026-11-08', '2026-11-10'),
  j('Balap Sepeda BMX - Racing', 'Balap Sepeda', '2026-11-08', '2026-11-10', 'CIAMIS', 'WILAYAH III'),
  j('Balap Sepeda Road', 'Balap Sepeda', '2026-11-11', '2026-11-15'),
  j('Balap Sepeda MTB', 'Balap Sepeda', '2026-11-17', '2026-11-19', 'KAB. BOGOR', 'WILAYAH I'),
  j('Berkuda Dressage', 'Equestrian', '2026-11-12', '2026-11-19', 'KOTA DEPOK', 'WILAYAH I'),
  j('Equestrian - Endurance', 'Equestrian', '2026-11-19', '2026-11-19'),
  j('Atletik', 'Atletik', '2026-11-10', '2026-11-17'),
  j('Marathon', 'Atletik', '2026-11-17', '2026-11-17'),
  j('Gimnastik Artistik', 'Senam', '2026-11-11', '2026-11-13', 'KOTA BANDUNG', 'WILAYAH III'),
  j('Gimnastik Ritmik', 'Senam', '2026-11-14', '2026-11-16', 'KOTA BANDUNG', 'WILAYAH III'),
  j('Angkat Besi', 'Angkat Besi', '2026-11-07', '2026-11-10', 'BOGOR', 'WILAYAH I', 'Green Forest Hotel'),
  j('IBCA - MMA', 'Ibca Mma', '2026-11-10', '2026-11-12'),
  { cabor_disiplin: 'UPACARA PEMBUKAAN PORPROV XV 2026', cabor_nama_raw: null, jenis: 'upacara', wilayah: 'WILAYAH II', tuan_rumah: 'BEKASI', mulai: '2026-11-07', selesai: '2026-11-07', venue: 'STADION PATRIOT' },
]
const pilih = (cabor: string, disiplin: string | null, nomor_teks: string, tanggal = '2026-11-08') =>
  pilihKegiatan(JADWAL, { cabor, disiplin, nomor_teks, tanggal })?.cabor_disiplin ?? null

// ── laporan → baris jadwal ──
cek('canoeing', pilih('Dayung', 'DAYUNG CANOEING', 'DAYUNG CANOEING · Canoeing - C - 1 200 M (Pi)'), 'Canoeing')
cek('canoe slalom bila disebut di nomor', pilih('Dayung', 'DAYUNG CANOEING', 'DAYUNG CANOEING · Canoeing - Slalom K1 (Pa)'), 'Canoeing - Slalom')
cek('rowing', pilih('Dayung', 'DAYUNG ROWING', 'DAYUNG ROWING · Rowing M1X (Pa)', '2026-11-11'), 'Rowing')
cek('dragon boat', pilih('Dayung', 'DAYUNG DBR', 'DAYUNG DBR · DBR - 22 pendayung - 200 m (Campuran)', '2026-11-16'), 'DBR')

// ── nama Dayung sejak berkas KONI 21 Okt 2026 ──
const JADWAL_21OKT: BarisJadwal[] = [
  j('Canoeing Sprint & SUP', 'Dayung', '2026-11-06', '2026-11-10', 'KARAWANG'),
  j('Canoeing Slalom', 'Dayung', '2026-11-10', '2026-11-13', 'KARAWANG'),
  j('Rowing Classic', 'Dayung', '2026-11-11', '2026-11-14', 'KARAWANG'),
  j('Rowing - Beach / Coastal', 'Dayung', '2026-11-15', '2026-11-18', 'KARAWANG'),
  j('DBR', 'Dayung', '2026-11-15', '2026-11-18', 'KARAWANG'),
]
const pilih21 = (nomor_teks: string, disiplin: string, tanggal: string) =>
  pilihKegiatan(JADWAL_21OKT, { cabor: 'Dayung', disiplin, nomor_teks, tanggal })?.cabor_disiplin ?? null
cek('21 Okt: canoeing biasa → Sprint & SUP, bukan Slalom', pilih21('DAYUNG CANOEING · Canoeing - C - 1 200 M (Pi)', 'DAYUNG CANOEING', '2026-11-10'), 'Canoeing Sprint & SUP')
cek('21 Okt: stand up paddle → Sprint & SUP', pilih21('DAYUNG CANOEING · Canoeing - Stand Up Paddle (MSUP) 200M (Pa)', 'DAYUNG CANOEING', '2026-11-08'), 'Canoeing Sprint & SUP')
cek('21 Okt: slalom → Canoeing Slalom', pilih21('DAYUNG CANOEING · Canoeing - Slalom K - 1 (Pa)', 'DAYUNG CANOEING', '2026-11-10'), 'Canoeing Slalom')
cek('21 Okt: rowing biasa → Rowing Classic', pilih21('DAYUNG ROWING · Rowing - Single Sculls (M1X) (Pa)', 'DAYUNG ROWING', '2026-11-15'), 'Rowing Classic')
cek('21 Okt: rowing pantai → Beach / Coastal', pilih21('DAYUNG ROWING · Rowing - Beach Sprint (Pa)', 'DAYUNG ROWING', '2026-11-15'), 'Rowing - Beach / Coastal')
cek('21 Okt: dragon boat tetap DBR', pilih21('DAYUNG DBR · DBR - 12 pendayung - 200 m (Pa)', 'DAYUNG DBR', '2026-11-16'), 'DBR')
cek('hoki indoor', pilih('Hockey', 'HOCKEY INDOOR', 'HOCKEY INDOOR · Beregu Putra (Pa)'), 'Hoki Indoor')
cek('hoki outdoor', pilih('Hockey', 'HOCKEY OUTDOOR', 'HOCKEY OUTDOOR · Beregu Putra (Pa)'), 'Hoki Outdoor - Field')
cek('renang: dua baris seri → yang mulai lebih awal', pilih('Akuatik', 'RENANG', 'RENANG · 100 M Gaya Bebas (Pa)'), 'Aquatic - Renang')
cek('renang perairan terbuka', pilih('Akuatik', 'RENANG PERAIRAN TERBUKA', 'RENANG PERAIRAN TERBUKA · 5 Km (Pa)', '2026-11-14'), 'Akuatik - Renang Perairan Terbuka')
cek('renang artistik', pilih('Akuatik', 'RENANG ARTISTIK', 'RENANG ARTISTIK · Duet (Pi)', '2026-11-17'), 'Akuatik - Renang Artistik')
cek('polo air', pilih('Akuatik', 'POLO AIR', 'POLO AIR · Beregu (Pa)'), 'Akuatik - Polo Air')
cek('voli indoor (ejaan "Bolavoli")', pilih('Bola Voli', 'BOLA VOLI INDOOR', 'BOLA VOLI INDOOR · Beregu (Pa)', '2026-11-12'), 'Bolavoli Indoor')
cek('voli pasir', pilih('Bola Voli', 'BOLA VOLI PASIR', 'BOLA VOLI PASIR · Beregu (Pi)'), 'Bola Voli Pasir')
cek('sepak bola putra dari penanda (Pa)', pilih('Sepak Bola', 'SEPAK BOLA', 'Beregu (Pa)'), 'Sepak Bola Putra')
cek('sepak bola putri dari penanda (Pi)', pilih('Sepak Bola', 'SEPAK BOLA', 'Beregu (Pi)'), 'Sepak Bola Putri')
cek('grass track', pilih('Balap Motor', 'BALAP MOTOR - GRASSTRACK', 'BALAP MOTOR - GRASSTRACK · Bebek 4T (Pa)', '2026-11-13'), 'Bermotor - Grass Track')
cek('road race motor', pilih('Balap Motor', 'BALAP MOTOR - ROAD RACE', 'BALAP MOTOR - ROAD RACE · Bebek 150 (Pa)'), 'Bermotor Road Race')
cek('mini 4wd', pilih('Balap Motor', 'BALAP MOTOR - MINI 4WD', 'BALAP MOTOR - MINI 4WD · Speed (Terbuka)', '2026-11-13'), 'Mini 4WD')
cek('sepeda road race', pilih('Balap Sepeda', 'BALAP SEPEDA - ROAD RACE', 'BALAP SEPEDA - ROAD RACE · ITT (Pa)', '2026-11-12'), 'Balap Sepeda Road')
cek('sepeda mtb', pilih('Balap Sepeda', 'BALAP SEPEDA - MTB', 'BALAP SEPEDA - MTB · XCO (Pa)', '2026-11-18'), 'Balap Sepeda MTB')
cek('bmx racing', pilih('Balap Sepeda', 'BALAP SEPEDA - BMX', 'BALAP SEPEDA - BMX · BMX Race Elite (Pa)'), 'Balap Sepeda BMX - Racing')
cek('bmx freestyle', pilih('Balap Sepeda', 'BALAP SEPEDA - BMX', 'BALAP SEPEDA - BMX · BMX Freestyle Park (Pa)'), 'Balap Sepeda BMX - Freestyle Park, Flat Land, Trial')
cek('dressage', pilih('Equestrian', 'BERKUDA EQUESTRIAN', 'Dressage Perorangan (Terbuka)', '2026-11-13'), 'Berkuda Dressage')
cek('endurance', pilih('Equestrian', 'BERKUDA EQUESTRIAN', 'Endurance 40 Km (Terbuka)', '2026-11-19'), 'Equestrian - Endurance')
cek('atletik biasa → baris umum', pilih('Atletik', 'ATLETIK', '100 M (Pa)', '2026-11-17'), 'Atletik')
cek('marathon → barisnya sendiri', pilih('Atletik', 'ATLETIK', 'Marathon (Pa)', '2026-11-17'), 'Marathon')
cek('senam artistik', pilih('Senam', 'GIMNASTIK ARTISTIK', 'GIMNASTIK ARTISTIK · Lantai (Pa)', '2026-11-12'), 'Gimnastik Artistik')
cek('senam ritmik', pilih('Senam', 'GIMNASTIK RITMIK', 'GIMNASTIK RITMIK · Pita (Pi)', '2026-11-15'), 'Gimnastik Ritmik')
cek('cabor satu baris', pilih('Angkat Besi', 'ANGKAT BESI', 'Kelas 53 Kg (Pi)'), 'Angkat Besi')
cek('ejaan cabor beda besar-kecil (IBCA MMA vs Ibca Mma)', pilih('IBCA MMA', 'IBCA MMA', 'Kelas - 56 Kg MMA (Pa)', '2026-11-10'), 'IBCA - MMA')
cek('nomor diketik bebas, cabor satu baris', pilih('Angkat Besi', null, '60 kg putra'), 'Angkat Besi')
cek('nomor diketik bebas, cabor banyak baris → yang rentangnya memuat tanggal', pilih('Dayung', null, 'final', '2026-11-16'), 'DBR')
cek('cabor tanpa jadwal', pilih('Terjun Payung', null, 'Ketepatan Mendarat'), null)
cek('upacara tidak pernah dipilih', pilih('', null, 'apa saja'), null)

// ── status target ──
cek('target emas, dapat emas', statusTarget('emas', 'emas'), 'Target emas: tercapai')
cek('target emas, dapat perak', statusTarget('emas', 'perak'), 'Target emas: belum tercapai')
cek('target perunggu, dapat perak (melampaui)', statusTarget('perunggu', 'perak'), 'Target perunggu: tercapai')
cek('target perak, gugur', statusTarget('perak', 'gugur'), 'Target perak: belum tercapai')
cek('target emas, baru lolos', statusTarget('emas', 'lolos'), 'Target emas: masih berjalan')
cek('tanpa target', statusTarget(null, 'emas'), '')

// ── penulisan atlet ──
cek('satu atlet', tulisAtlet(['A']), 'A')
cek('empat atlet ditulis semua', tulisAtlet(['A', 'B', 'C', 'D']), 'A, B, C, D')
cek('tim besar diringkas', tulisAtlet(['A', 'B', 'C', 'D', 'E', 'F']), 'A, B, C, dan 3 lainnya')
cek('rentang tanggal', rentangTanggal('2026-11-07', '2026-11-09'), ['2026-11-07', '2026-11-08', '2026-11-09'])
cek('rentang terbalik kosong', rentangTanggal('2026-11-09', '2026-11-07'), [])

// ── susunan matriks ──
const lap = (o: Partial<LaporanMatriks>): LaporanMatriks => ({
  id: 1, tanggal: '2026-11-07', cabor: 'Angkat Besi', disiplin: 'ANGKAT BESI', nomor_teks: 'Kelas 53 Kg (Pi)', atlet: ['Arsya Dewi Saputra'],
  hasil: 'emas', peringkat: null, nilai_teks: '159 kg', lawan: 'Kota Bandung', jam: null, jam_lapor: '14:20', pelapor_nama: 'Bu Dewi', target: 'emas', ...o,
})
const m = susunMatriks(JADWAL, [
  lap({ id: 1 }),
  lap({ id: 2, nomor_teks: 'Kelas 60 Kg (Pa)', atlet: ['Rinaldi Rustiana'], hasil: 'peringkat', peringkat: 4, nilai_teks: null, lawan: null, jam: '10:05', target: 'emas' }),
  lap({ id: 3, cabor: 'Terjun Payung', disiplin: null, nomor_teks: 'Ketepatan Mendarat', atlet: ['X'], hasil: 'gugur', nilai_teks: null, lawan: null, target: null, pelapor_nama: 'Pak T' }),
  lap({ id: 4, tanggal: '2026-11-08', cabor: 'Hockey', disiplin: 'HOCKEY OUTDOOR', nomor_teks: 'HOCKEY OUTDOOR · Beregu Putra (Pa)', atlet: ['A', 'B', 'C', 'D', 'E'], hasil: 'lolos', nilai_teks: '3-1', lawan: 'Kab. Garut', target: 'perak' }),
], ['2026-11-07'])
const ab = m.filter(b => b.kegiatan === 'Angkat Besi')
cek('dua laporan Angkat Besi, urut jam (jam isian menang atas jam lapor)', ab.map(b => [b.jam, b.nomor]), [['10:05', 'Kelas 60 Kg (Pa)'], ['14:20', 'Kelas 53 Kg (Pi)']])
cek('isi baris laporan', ab[1], {
  no: ab[1].no, tanggal: '2026-11-07', jam: '14:20', klaster: 'WILAYAH I', wilayah_venue: 'BOGOR', kegiatan: 'Angkat Besi',
  nomor: 'Kelas 53 Kg (Pi)', atlet: 'Arsya Dewi Saputra', lawan: 'Kota Bandung', hasil: 'Emas · 159 kg', venue: 'Green Forest Hotel',
  status_target: 'Target emas: tercapai', pic: 'Bu Dewi',
})
cek('peringkat & target meleset', [ab[0].hasil, ab[0].status_target, ab[0].lawan], ['Peringkat 4', 'Target emas: belum tercapai', ''])
cek('kegiatan terjadwal tanpa laporan tetap ada, kolom hasil kosong', m.filter(b => b.kegiatan === 'Hoki Indoor').map(b => [b.nomor, b.hasil, b.pic, b.venue]), [['', '', '', 'Venue Hoki Indoor']])
cek('upacara ikut tampil', m.some(b => b.kegiatan.startsWith('UPACARA PEMBUKAAN')), true)
cek('kegiatan di luar tanggalnya tidak tampil', m.some(b => b.kegiatan === 'DBR'), false)
cek('laporan cabor tanpa jadwal ditaruh di akhir hari', [m[m.length - 1].kegiatan, m[m.length - 1].klaster, m[m.length - 1].pic], ['Terjun Payung', '', 'Pak T'])
cek('laporan hari lain tidak ikut', m.some(b => b.kegiatan.includes('Outdoor') && b.nomor !== ''), false)
cek('nomor urut berurutan dari 1', m.map(b => b.no), m.map((_, i) => i + 1))
cek('urut klaster wilayah dulu', m[0].klaster <= m[1].klaster, true)
const dua = susunMatriks(JADWAL, [lap({ id: 4, tanggal: '2026-11-08', cabor: 'Hockey', disiplin: 'HOCKEY OUTDOOR', nomor_teks: 'HOCKEY OUTDOOR · Beregu Putra (Pa)', atlet: ['A', 'B', 'C', 'D', 'E'], hasil: 'lolos', nilai_teks: '3-1', lawan: 'Kab. Garut', target: 'perak' })], ['2026-11-07', '2026-11-08'])
const ho = dua.find(b => b.nomor.includes('Beregu Putra'))!
cek('beregu: atlet diringkas, status masih berjalan', [ho.tanggal, ho.atlet, ho.hasil, ho.status_target], ['2026-11-08', 'A, B, C, dan 2 lainnya', 'Lolos babak berikutnya · 3-1', 'Target perak: masih berjalan'])
cek('nomor urut menyambung antar hari', dua[dua.length - 1].no, dua.length)
const geser = susunMatriks(JADWAL, [lap({ id: 9, tanggal: '2026-11-20', cabor: 'Angkat Besi' })], ['2026-11-20'])
cek('laporan di luar rentang jadwal cabornya tetap tercatat pada kegiatannya', geser.filter(b => b.nomor).map(b => [b.kegiatan, b.venue]), [['Angkat Besi', 'Green Forest Hotel']])

// ── lembar Excel ──
const lembar = lembarMatriks(m, 'KAB. BANDUNG')
cek('judul di kolom D seperti berkas KONI', [lembar[0][3], lembar[1][3]], ['MATRIX JADWAL HARIAN PORPROV XV 2026', 'KONTINGEN KABUPATEN BANDUNG'])
cek('kepala 13 kolom', [lembar[2], KEPALA_MATRIKS.length], [KEPALA_MATRIKS, 13])
cek('satu baris data per baris matriks', lembar.length, m.length + 3)
cek('baris data 13 kolom', lembar[3].length, 13)
cek('tanggal ditulis hari/bulan/tahun', [lembar[3][1], tanggalIndonesia('2026-10-28'), tanggalIndonesia('bukan tanggal')], ['07/11/2026', '28/10/2026', 'bukan tanggal'])

console.log(`\n${lulus} lulus, ${gagal} gagal`)
if (gagal > 0) process.exit(1)
