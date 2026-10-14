// scripts/uji-laporan-cabor.ts — mengunci penyusunan laporan monitoring per cabor.
// Dijalankan: npm run uji:laporan-cabor
import {
  aman, htmlLaporanCabor, jadwalUntukCabor, namaKontingenBiasa, namaKontingenResmi, penandatangan, periodeLaporan, rentangPanjang, tanggalPanjang, urutHasil,
  type BahanLaporanCabor, type CatatanLaporan, type HasilLaporan,
} from '../src/lib/laporan-cabor'
import type { BarisJadwal } from '../src/lib/matriks'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const ada = (nama: string, teks: string, potongan: string, harap = true) => cek(nama, teks.includes(potongan), harap)

const j = (cabor_disiplin: string, cabor_nama_raw: string | null, mulai: string, selesai: string, tuan_rumah = 'KARAWANG', venue = 'Situ Cipule', jenis = 'pertandingan'): BarisJadwal =>
  ({ cabor_disiplin, cabor_nama_raw, jenis, wilayah: 'WILAYAH II', tuan_rumah, mulai, selesai, venue })
const JADWAL = [
  j('Rowing', 'Dayung', '2026-11-10', '2026-11-14'),
  j('Canoeing', 'Dayung', '2026-11-04', '2026-11-09'),
  j('Canoeing - Slalom', 'DAYUNG', '2026-11-04', '2026-11-09', 'KAB. BANDUNG', 'Sungai Cisangkuy'),
  j('IBCA - MMA', 'Ibca Mma', '2026-11-10', '2026-11-12', 'BEKASI', 'GOR'),
  j('Atletik', 'Atletik', '2026-11-10', '2026-11-17'),
  j('UPACARA PEMBUKAAN', null, '2026-11-07', '2026-11-07', 'BEKASI', 'Stadion', 'upacara'),
]

// ── jadwal ──
cek('jadwal Dayung: tiga kegiatan, urut tanggal lalu nama', jadwalUntukCabor(JADWAL, ['Dayung']).map(x => x.cabor_disiplin), ['Canoeing', 'Canoeing - Slalom', 'Rowing'])
cek('beda huruf besar dan tanda baca tetap cocok', jadwalUntukCabor(JADWAL, ['IBCA MMA']).map(x => x.cabor_disiplin), ['IBCA - MMA'])
cek('upacara dan cabor lain tidak ikut', jadwalUntukCabor(JADWAL, ['Upacara Pembukaan', 'Bulutangkis']).length, 0)
cek('nama keluarga cabor ikut dicari', jadwalUntukCabor(JADWAL, ['Dayung - Canoe', 'Dayung']).length, 3)

// ── tanggal ──
cek('tanggal panjang', tanggalPanjang('2026-11-04'), '4 November 2026')
cek('rentang sebulan', rentangPanjang('2026-11-04', '2026-11-09'), '4–9 November 2026')
cek('rentang lintas bulan', rentangPanjang('2026-10-30', '2026-11-08'), '30 Oktober – 8 November 2026')
cek('rentang lintas tahun', rentangPanjang('2026-12-30', '2027-01-02'), '30 Desember 2026 – 2 Januari 2027')
cek('sehari', rentangPanjang('2026-11-17', '2026-11-17'), '17 November 2026')
cek('tanpa tanggal', rentangPanjang(null, null), '-')
cek('nama kontingen resmi', [namaKontingenResmi('Kab. Bandung'), namaKontingenResmi('KAB. BANDUNG'), namaKontingenResmi('Kota Bandung')], ['KABUPATEN BANDUNG', 'KABUPATEN BANDUNG', 'KOTA BANDUNG'])
cek('nama kontingen biasa (di database tertulis kapital)', [namaKontingenBiasa('KAB. BANDUNG'), namaKontingenBiasa('KAB. BANDUNG BARAT'), namaKontingenBiasa('Kota Cimahi')], ['Kabupaten Bandung', 'Kabupaten Bandung Barat', 'Kota Cimahi'])

// ── bahan contoh ──
const h = (id: number, nomor_teks: string, hasil: string, o: Partial<HasilLaporan> = {}): HasilLaporan => ({
  id, tanggal: '2026-11-05', jam: null, nomor_teks, atlet: ['Herlin Aprilin Lali'], hasil, peringkat: null, nilai_teks: null, lawan: null,
  target: null, pelapor_nama: 'Iwan', diputus_oleh: 'konida_kabbandung', ada_foto: false, ...o,
})
const c = (id: number, jenis: CatatanLaporan['jenis'], isi: string, o: Partial<CatatanLaporan> = {}): CatatanLaporan => ({
  id, jenis, mendesak: false, tanggal: '2026-11-06', jam: '10:15', nomor_teks: null, atlet: [], isi, status: 'baru', tanggapan: null,
  pelapor_nama: 'Iwan', ditangani_oleh: null, ada_foto: false, ...o,
})
const BAHAN: BahanLaporanCabor = {
  kontingen: 'KAB. BANDUNG', cabor: 'Dayung',   // seperti tertulis di tabel kontingen
  jadwal: jadwalUntukCabor(JADWAL, ['Dayung']),
  nomor: [
    { disiplin: 'DAYUNG CANOEING', nomor: 'Canoeing - C - 1 200 M (Pi)', atlet: ['HERLIN APRILIN LALI'] },
    { disiplin: 'DAYUNG ROWING', nomor: 'Rowing M1X (Pa)', atlet: ['ADAM FIRDAUS'] },
  ],
  jumlah_atlet: 2, pic: ['Iwan'],
  hasil: [
    h(1, 'DAYUNG CANOEING · Canoeing - C - 1 200 M (Pi)', 'emas', { target: 'emas', ada_foto: true, jam: '09:30', lawan: 'Kota Bekasi', nilai_teks: '4:02.11' }),
    h(2, 'DAYUNG ROWING · Rowing M1X (Pa)', 'perak', { target: 'emas', tanggal: '2026-11-11', diputus_oleh: 'admin_dua' }),
    h(3, 'DAYUNG ROWING · Rowing M2X (Pa)', 'peringkat', { peringkat: 5 }),
    h(4, 'DAYUNG CANOEING · Canoeing - K - 1 500 M (Pa)', 'lolos', { target: 'perunggu' }),
  ],
  catatan: [
    c(10, 'aturan', 'Jadwal final dimajukan 2 jam <script>alert(1)</script> tanpa pemberitahuan.\nPelatih sudah protes.', { mendesak: true, status: 'ditangani', tanggapan: 'Protes resmi diajukan', ditangani_oleh: 'konida_kabbandung', nomor_teks: 'Canoeing C-1 200 M (Pi)', atlet: ['Herlin Aprilin Lali'] }),
    c(11, 'nonteknis', 'Bus jemputan terlambat satu jam ke venue.', { ada_foto: true }),
  ],
  dibuat: '2026-11-12',
}

cek('periode laporan dari hasil dan catatan', periodeLaporan(BAHAN), { dari: '2026-11-05', sampai: '2026-11-11' })
cek('periode kosong', periodeLaporan({ hasil: [], catatan: [] }), null)
cek('urut hasil: nomor (angka wajar), tanggal, jam', urutHasil([
  { id: 1, nomor_teks: 'Kelas 10 kg', tanggal: '2026-11-05', jam: null },
  { id: 2, nomor_teks: 'Kelas 9 kg', tanggal: '2026-11-06', jam: '08:00' },
  { id: 3, nomor_teks: 'Kelas 9 kg', tanggal: '2026-11-06', jam: '07:00' },
  { id: 4, nomor_teks: 'Kelas 9 kg', tanggal: '2026-11-05', jam: null },
]).map(x => x.id), [4, 3, 2, 1])
cek('penandatangan: PIC lalu pengesah, tanpa kembar', penandatangan(BAHAN), [
  { peran: 'PIC Cabor (pelapor)', nama: 'Iwan' },
  { peran: 'KONIDA Kabupaten Bandung (pengesah)', nama: 'konida_kabbandung' },
  { peran: 'KONIDA Kabupaten Bandung (pengesah)', nama: 'admin_dua' },
])
cek('penandatangan kosong tetap punya baris isian', penandatangan({ kontingen: 'KAB. BANDUNG', pic: [], hasil: [], catatan: [] }).map(p => p.nama), ['', ''])

// ── HTML cetak ──
const cetak = htmlLaporanCabor(BAHAN, { untuk: 'cetak', logo: 'https://x.test/logo.png', alamatFoto: (jenis, id) => `https://x.test/${jenis}/${id}`, cetakOtomatis: true })
const urutan = ['I. INFORMASI UMUM', 'II. HASIL PERTANDINGAN', 'III. KESESUAIAN', 'IV. PERMASALAHAN TEKNIS', 'V. LAIN-LAIN', 'VI. PENGESAHAN', 'VII. LAMPIRAN']
cek('tujuh bagian, urut', urutan.map(k => cetak.indexOf(k)).every((n, i, xs) => n > 0 && (i === 0 || n > xs[i - 1])), true)
ada('kepala memuat kontingen resmi', cetak, 'KONTINGEN KABUPATEN BANDUNG')
ada('tuan rumah tanpa kembar', cetak, 'KARAWANG, KAB. BANDUNG')
ada('waktu per kegiatan bila lebih dari satu', cetak, 'Canoeing - Slalom: 4–9 November 2026')
ada('disiplin ditulis di label nomor bila lebih dari satu disiplin', cetak, 'DAYUNG ROWING · Rowing M1X (Pa)')
ada('rekap medali: peringkat dihitung laga, lolos tidak', cetak, '1 emas, 1 perak, 0 perunggu</b> (total 2) dari 3 nomor')
ada('capaian target: "belum tercapai" tidak terhitung tercapai', cetak, 'dari 3 nomor yang diikuti atlet bertarget, <b>1 tercapai</b>, 1 belum tercapai, 1 masih berjalan')
ada('isian berbahaya dinetralkan', cetak, '&lt;script&gt;alert(1)&lt;/script&gt;')
cek('tidak ada skrip dari isian pengguna', cetak.split('<script>').length - 1, 1)
ada('baris baru jadi <br>', cetak, 'pemberitahuan.<br>Pelatih sudah protes.')
ada('catatan mendesak ditandai', cetak, '<b>MENDESAK</b>')
ada('tindak lanjut dan penanggap', cetak, 'Sedang ditangani<br>Protes resmi diajukan')
ada('bagian teknis kosong', cetak.slice(cetak.indexOf('IV. PERMASALAHAN'), cetak.indexOf('V. LAIN-LAIN')), 'Tidak ada catatan.')
ada('catatan non-teknis masuk bagian V', cetak.slice(cetak.indexOf('V. LAIN-LAIN'), cetak.indexOf('VI. PENGESAHAN')), 'Bus jemputan terlambat')
ada('foto hasil memakai alamat dari pemanggil', cetak, 'src="https://x.test/hasil/1"')
ada('foto catatan memakai alamat dari pemanggil', cetak, 'src="https://x.test/catatan/11"')
ada('logo', cetak, 'src="https://x.test/logo.png"')
ada('hasil per nomor memuat lawan, catatan angka, status target', cetak, '<td>Kota Bekasi</td><td>Emas · 4:02.11</td><td>Target emas: tercapai</td>')
ada('jam ikut di kolom waktu', cetak, '05/11/2026 09:30')
ada('kaki halaman di @page', cetak, '@bottom-left{content:"Laporan Monitoring Cabor Dayung · Kontingen Kabupaten Bandung · PORPROV XV Jawa Barat 2026"')
ada('cetak otomatis menunggu gambar', cetak, 'window.onload=function(){window.print()}')
ada('Arial 12 spasi 1,5 sesuai format', cetak, 'font-family:Arial,sans-serif;font-size:12pt;line-height:1.5')

// ── nama cabor berbahaya di kaki halaman CSS ──
const nakal = htmlLaporanCabor({ ...BAHAN, cabor: 'Da"yung\\} body{display:none' }, { untuk: 'cetak' })
ada('tanda kutip di nama cabor tidak memutus CSS', nakal, 'Da\\"yung\\\\} body{display:none')

// ── HTML Word ──
const word = htmlLaporanCabor(BAHAN, { untuk: 'word', logo: 'https://x.test/logo.png', alamatFoto: () => 'https://x.test/f', cetakOtomatis: true })
cek('Word diawali BOM supaya huruf tidak rusak', word.charCodeAt(0), 0xfeff)
ada('Word memakai bagian halaman A4', word, '@page WordSection1{size:21.0cm 29.7cm')
cek('Word tanpa gambar', word.includes('<img'), false)
cek('Word tanpa skrip', word.includes('<script'), false)
ada('Word menyebut jumlah foto yang tidak ikut', word, 'Terdapat 2 foto bukti di sistem')

// ── keadaan kosong ──
const kosong = htmlLaporanCabor({ ...BAHAN, jadwal: [], nomor: [], hasil: [], catatan: [], pic: [] }, { untuk: 'cetak' })
ada('tanpa jadwal', kosong, 'Cabor ini belum ada di jadwal.')
ada('tanpa daftar resmi', kosong, 'Belum ada daftar resmi pendaftaran untuk cabor ini')
ada('tanpa hasil', kosong, 'Belum ada hasil pertandingan yang disahkan.')
ada('tanpa foto', kosong, 'Belum ada foto bukti.')
ada('tanpa PIC', kosong, 'Belum ada PIC')
ada('tanpa laporan', kosong, 'Belum ada laporan')

cek('aman() menetralkan kelima tanda', aman(`<a href="x" onclick='y'>&</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;')

console.log(`\nuji-laporan-cabor: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
