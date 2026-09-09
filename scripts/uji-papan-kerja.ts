// scripts/uji-papan-kerja.ts — mengunci hitungan Papan Pekerjaan & Keberangkatan.
// Dijalankan: npm run uji:papan
import {
  hariLagi, apakahMendesak, AMBANG_MENDESAK_HARI,
  kelompokkanRombongan, caborTakDikenali,
} from '../src/lib/papan-kerja'
import { KATEGORI_CABOR, warnaKategori, urutKategori, TANPA_KATEGORI } from '../src/lib/kategori-cabor'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

// ── hariLagi: zona waktu tidak boleh menggeser tanggal ──
const kini = new Date(2026, 8, 9)                 // 9 September 2026, waktu setempat
cek('hari ini',        hariLagi('2026-09-09', kini), 0)
cek('besok',           hariLagi('2026-09-10', kini), 1)
cek('kemarin',         hariLagi('2026-09-08', kini), -1)
cek('pertandingan I',  hariLagi('2026-10-28', kini), 49)
cek('pembukaan',       hariLagi('2026-11-07', kini), 59)
cek('penutupan',       hariLagi('2026-11-20', kini), 72)
cek('null',            hariLagi(null, kini), null)
cek('bukan tanggal',   hariLagi('11 November', kini), null)
// Sore hari tidak boleh mengubah jawaban — inilah cacat toISOString yang dihindari.
cek('sore hari sama',  hariLagi('2026-11-07', new Date(2026, 8, 9, 23, 30)), 59)
cek('pagi buta sama',  hariLagi('2026-11-07', new Date(2026, 8, 9, 0, 5)),  59)

// ── ambang mendesak ──
cek('ambangnya 45',    AMBANG_MENDESAK_HARI, 45)
cek('tepat di ambang', apakahMendesak('2026-10-24', kini), true)   // 45 hari
cek('lewat ambang',    apakahMendesak('2026-10-25', kini), false)  // 46 hari
cek('hari ini masuk',  apakahMendesak('2026-09-09', kini), true)
cek('sudah lewat',     apakahMendesak('2026-09-08', kini), false)  // negatif, bukan mendesak
cek('tanpa tanggal',   apakahMendesak(null, kini), false)

// ── rombongan per kota ──
const jadwal = [
  { cabor_nama_raw: 'Dayung', tuan_rumah: 'KARAWANG', akomodasi: 'Kab. KARAWANG', mulai: '2026-11-04', selesai: '2026-11-09' },
  { cabor_nama_raw: 'Dayung', tuan_rumah: 'KARAWANG', akomodasi: 'Kab. KARAWANG', mulai: '2026-11-15', selesai: '2026-11-19' },
  { cabor_nama_raw: 'Akuatik', tuan_rumah: 'KARAWANG', akomodasi: 'Kab. KARAWANG', mulai: '2026-11-10', selesai: '2026-11-14' },
  { cabor_nama_raw: 'Futsal', tuan_rumah: 'BEKASI', akomodasi: null, mulai: '2026-10-28', selesai: '2026-11-08' },
  // Upacara dan cabor bukan milik kita tidak boleh ikut terhitung.
  { cabor_nama_raw: null, tuan_rumah: 'BEKASI', akomodasi: null, mulai: '2026-11-07', selesai: '2026-11-07' },
]
const rom = kelompokkanRombongan(jadwal)
cek('jumlah rombongan', rom.length, 2)
cek('urut dari yang berangkat dulu', rom.map(r => r.kota), ['BEKASI', 'Kab. KARAWANG'])
cek('cabor tidak kembar', rom[1].cabor, ['Dayung', 'Akuatik'])
cek('rentang digabung',  [rom[1].mulai, rom[1].selesai], ['2026-11-04', '2026-11-19'])
cek('akomodasi menang atas tuan rumah', rom[1].kota, 'Kab. KARAWANG')
cek('tanpa akomodasi pakai tuan rumah', rom[0].kota, 'BEKASI')
cek('rombongan kosong', kelompokkanRombongan([]), [])

// ── cabor yang namanya tidak dikenali ──
const rujukan = ['Dayung', 'Akuatik', 'Futsal']
cek('semua dikenal',   caborTakDikenali(['Dayung', 'Futsal'], rujukan), [])
cek('beda huruf besar', caborTakDikenali(['DAYUNG', 'dayung'], rujukan), [])
cek('ada spasi lebih', caborTakDikenali([' Dayung '], rujukan), [])
cek('salah ketik terdeteksi', caborTakDikenali(['Dayng', 'Futsal'], rujukan), ['Dayng'])
cek('kosong diabaikan', caborTakDikenali(['', null, '  '], rujukan), [])
cek('tidak kembar',     caborTakDikenali(['Kabaddi', 'Kabaddi'], rujukan), ['Kabaddi'])

// ── kategori cabor ──
cek('lima kategori',  KATEGORI_CABOR.length, 5)
cek('beladiri duluan', KATEGORI_CABOR[0], 'BELADIRI')
cek('warna beladiri', warnaKategori('BELADIRI'), '#ef4444')
cek('warna tak dikenal', warnaKategori('ENTAH'), '#64748b')
cek('warna null',     warnaKategori(null), '#64748b')
cek('urutan resmi',   ['BEREGU','BELADIRI'].sort(urutKategori), ['BELADIRI','BEREGU'])
cek('tak dikenal di belakang', ['ENTAH','TERUKUR'].sort(urutKategori), ['TERUKUR','ENTAH'])
cek('label tanpa kategori', TANPA_KATEGORI, 'Belum berkategori')

console.log(`\nLULUS ${lulus} · GAGAL ${gagal}`)
process.exit(gagal ? 1 : 0)
