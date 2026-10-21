// scripts/uji-jadwal-partai.ts — mengunci aturan jadwal per partai.
// Dijalankan: npm run uji:jadwal-partai
import { partaiTampil, partaiUntukLapor, periksaPartai, tanggalPartaiSah, tulisLaga, urutPartai, type Partai } from '../src/lib/jadwal-partai'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const galat = (r: any) => ('galat' in r ? r.galat : null)

// ── isian lengkap ──
const ok = periksaPartai({ tanggal: '2026-10-28', jam: '9:05', nomor_teks: '  Beregu  Putra ', babak: 'Grup A', atlet_ids: [3, 3, 7], lawan: 'Kota Cirebon', venue: 'GOR Bang Yan Voli' }, false)
cek('jam dirapikan', 'isi' in ok && ok.isi.jam, '09:05')
cek('spasi dirapikan', 'isi' in ok && ok.isi.nomor_teks, 'Beregu Putra')
cek('atlet kembar dibuang', 'isi' in ok && ok.isi.atlet_ids, [3, 7])
cek('status bawaan terjadwal', 'isi' in ok && ok.isi.status, 'terjadwal')
cek('kosong-kosong jadi null', 'isi' in periksaPartai({ tanggal: '2026-11-08', nomor_teks: 'Final', lawan: '  ' }, false) && (periksaPartai({ tanggal: '2026-11-08', nomor_teks: 'Final', lawan: '  ' }, false) as any).isi.lawan, null)

// ── isian salah ──
cek('tanpa tanggal', galat(periksaPartai({ nomor_teks: 'X' }, false)), 'Tanggal pertandingan belum diisi atau di luar masa PORPROV.')
cek('tahun salah', galat(periksaPartai({ tanggal: '2062-11-08', nomor_teks: 'X' }, false)) !== null, true)
cek('tanpa nomor', galat(periksaPartai({ tanggal: '2026-11-08' }, false)), 'Nomor pertandingan belum diisi.')
cek('jam ngawur', galat(periksaPartai({ tanggal: '2026-11-08', nomor_teks: 'X', jam: '25:00' }, false)) !== null, true)
cek('status ngawur', galat(periksaPartai({ tanggal: '2026-11-08', nomor_teks: 'X', status: 'menang' }, false)), 'Status partai tidak dikenali.')
cek('atlet bukan angka', galat(periksaPartai({ tanggal: '2026-11-08', nomor_teks: 'X', atlet_ids: ['a'] }, false)), 'Daftar atlet tidak terbaca.')
cek('isian bukan objek', galat(periksaPartai(null, false)), 'Isian tidak terbaca.')

// ── parsial ──
cek('parsial: hanya status', (periksaPartai({ status: 'ditunda' }, true) as any).isi, { status: 'ditunda' })
cek('parsial: kosong ditolak', galat(periksaPartai({}, true)), 'Tidak ada yang diubah.')
cek('parsial: jam dihapus', (periksaPartai({ jam: '' }, true) as any).isi, { jam: null })
cek('batas tanggal', [tanggalPartaiSah('2026-10-01'), tanggalPartaiSah('2026-09-30'), tanggalPartaiSah('2026-12-31')], [true, false, true])

// ── urutan & tampil ──
let id = 0
const p = (tanggal: string, jam: string | null, nomor: string, status: Partai['status'] = 'terjadwal') =>
  ({ id: ++id, tanggal, jam, nomor_teks: nomor, status, lawan: null as string | null })
const D = [p('2026-11-08', null, 'B'), p('2026-11-08', '13:00', 'C'), p('2026-11-08', '09:00', 'D'), p('2026-11-07', '15:00', 'A'), p('2026-11-10', '08:00', 'E', 'batal'), p('2026-11-11', '08:00', 'F')]
cek('urut tanggal, jam, tanpa jam di belakang', urutPartai(D).map(x => x.nomor_teks), ['A', 'D', 'C', 'B', 'E', 'F'])
cek('tampil hari ini', partaiTampil(D, '2026-11-08')?.partai.map(x => x.nomor_teks), ['D', 'C', 'B'])
cek('tampil: hari kosong → berikutnya, batal dilewati', partaiTampil(D, '2026-11-09'), { tanggal: '2026-11-11', hari_ini: false, partai: [D[5]] })
cek('tampil: semua lewat → null', partaiTampil(D, '2026-12-01'), null)
const L = [p('2026-11-07', '10:00', 'X'), p('2026-11-08', '09:00', 'Y'), p('2026-11-08', '10:00', 'Z', 'selesai'), p('2026-11-06', '09:00', 'W')]
cek('untuk lapor: kemarin + hari ini, belum selesai', partaiUntukLapor(L, '2026-11-08').map(x => x.nomor_teks), ['X', 'Y'])
cek('tulis laga', [tulisLaga({ nomor_teks: 'Futsal Putra', lawan: 'Kota Cirebon' }), tulisLaga({ nomor_teks: 'Final', lawan: null })], ['Futsal Putra vs Kota Cirebon', 'Final'])

console.log(`uji-jadwal-partai: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
