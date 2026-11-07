// scripts/uji-jalur-cepat.ts — Jalur Cepat medali (Superadministrator) ↔ validasi PIC. Dijalankan: npm run uji:jalur-cepat
import {
  ALASAN_VALIDASI, atletSejalan, bolehJalurCepat, cocokJalurCepat, laporanPicSudahAda, lengkapiDariPic, tandaValidasi,
  type BarisCepat,
} from '../src/lib/jalur-cepat'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

const C = (o: Partial<BarisCepat> & { id: number }): BarisCepat => ({
  cabor_id: 165, nomor_teks: 'Bebas - Kelas s/d 52 Kg (Pa)', hasil: 'emas', atlet_ids: [10], tanggal: '2026-11-07',
  status: 'disahkan', validasi: 'menunggu_pic', ...o,
})
const P = (o: Partial<{ cabor_id: number; nomor_teks: string; hasil: string; atlet_ids: number[]; tanggal: string }> = {}) => ({
  cabor_id: 165, nomor_teks: 'Bebas - Kelas s/d 52 Kg (Pa)', hasil: 'emas', atlet_ids: [10], tanggal: '2026-11-07', ...o,
})

// --- siapa yang boleh ---
cek('superadmin boleh', bolehJalurCepat({ role: 'superadmin' }), true)
cek('konida tidak boleh', bolehJalurCepat({ role: 'konida', level: 'level3' }), false)
cek('koni_jabar tidak boleh', bolehJalurCepat({ role: 'koni_jabar', level: 'koni_jabar' }), false)
cek('tanpa sesi tidak boleh', bolehJalurCepat(null), false)

// --- cocok ---
cek('cocok: sama persis', cocokJalurCepat(P(), [C({ id: 1 })]), { jenis: 'cocok', id: 1 })
cek('cocok: tulisan nomor beda (Putra/Pa, awalan disiplin)', cocokJalurCepat(P({ nomor_teks: 'GULAT · Bebas - Kelas s/d 52 Kg Putra' }), [C({ id: 1 })]), { jenis: 'cocok', id: 1 })
cek('cocok: PIC melapor sehari kemudian', cocokJalurCepat(P({ tanggal: '2026-11-08' }), [C({ id: 1 })]), { jenis: 'cocok', id: 1 })
cek('cocok: beregu tanpa nama atlet di jalur cepat', cocokJalurCepat(P({ atlet_ids: [1, 2, 3] }), [C({ id: 1, atlet_ids: [] })]), { jenis: 'cocok', id: 1 })
cek('cocok: beregu sebagian nama sama', cocokJalurCepat(P({ atlet_ids: [1, 2, 3] }), [C({ id: 1, atlet_ids: [3, 4] })]), { jenis: 'cocok', id: 1 })

// --- bukan urusan ---
cek('tidak ada jalur cepat', cocokJalurCepat(P(), []), null)
cek('nomor lain', cocokJalurCepat(P({ nomor_teks: 'Bebas - Kelas s/d 62 Kg (Pa)' }), [C({ id: 1 })]), null)
cek('putri ≠ putra', cocokJalurCepat(P({ nomor_teks: 'Bebas - Kelas s/d 52 Kg (Pi)' }), [C({ id: 1 })]), null)
cek('cabor lain', cocokJalurCepat(P({ cabor_id: 999 }), [C({ id: 1 })]), null)
cek('tanggal terlalu jauh (3 hari)', cocokJalurCepat(P({ tanggal: '2026-11-10' }), [C({ id: 1 })]), null)
cek('hasil belum final (lolos) tidak dicocokkan', cocokJalurCepat(P({ hasil: 'lolos' }), [C({ id: 1 })]), null)
cek('jalur cepat yang sudah tervalidasi tidak dipakai lagi', cocokJalurCepat(P(), [C({ id: 1, validasi: 'tervalidasi' })]), null)
cek('baris biasa (bukan jalur cepat) diabaikan', cocokJalurCepat(P(), [C({ id: 1, validasi: null })]), null)
cek('jalur cepat yang dibatalkan (menunggu) diabaikan', cocokJalurCepat(P(), [C({ id: 1, status: 'menunggu' })]), null)

// --- bentrok ---
cek('bentrok: medali beda', cocokJalurCepat(P({ hasil: 'perak' }), [C({ id: 1 })]),
  { jenis: 'bentrok', id: 1, alasan: 'Superadministrator mencatat Emas, PIC melapor Perak' })
cek('bentrok: atlet beda', cocokJalurCepat(P({ atlet_ids: [99] }), [C({ id: 1 })]),
  { jenis: 'bentrok', id: 1, alasan: 'Medali sama, tetapi atletnya berbeda' })
cek('bentrok: PIC tanpa medali (peringkat 4)', cocokJalurCepat(P({ hasil: 'peringkat' }), [C({ id: 1, hasil: 'perunggu' })])?.jenis, 'bentrok')
cek('dua perunggu satu nomor: yang atletnya cocok', cocokJalurCepat(P({ hasil: 'perunggu', atlet_ids: [20] }),
  [C({ id: 1, hasil: 'perunggu', atlet_ids: [10] }), C({ id: 2, hasil: 'perunggu', atlet_ids: [20] })]), { jenis: 'cocok', id: 2 })

// --- sebelum jalur cepat: PIC sudah melapor ---
const ada = [
  { id: 7, cabor_id: 165, nomor_teks: 'Bebas - Kelas s/d 52 Kg Putra', hasil: 'emas', tanggal: '2026-11-07', status: 'menunggu', ref_luar: null },
  { id: 8, cabor_id: 165, nomor_teks: 'Bebas - Kelas s/d 70 Kg (Pa)', hasil: 'emas', tanggal: '2026-11-07', status: 'menunggu', ref_luar: '1500' },
  { id: 9, cabor_id: 165, nomor_teks: 'Bebas - Kelas s/d 86 Kg (Pa)', hasil: 'lolos', tanggal: '2026-11-07', status: 'disahkan', ref_luar: null },
]
cek('PIC sudah melapor nomor ini', laporanPicSudahAda({ cabor_id: 165, nomor_teks: 'Bebas - Kelas s/d 52 Kg (Pa)', tanggal: '2026-11-07' }, ada)?.id, 7)
cek('data situs bukan laporan PIC', laporanPicSudahAda({ cabor_id: 165, nomor_teks: 'Bebas - Kelas s/d 70 Kg (Pa)', tanggal: '2026-11-07' }, ada), null)
cek('laporan belum final tidak menghalangi', laporanPicSudahAda({ cabor_id: 165, nomor_teks: 'Bebas - Kelas s/d 86 Kg (Pa)', tanggal: '2026-11-07' }, ada), null)
cek('laporan PIC yang ditolak tidak menghalangi', laporanPicSudahAda({ cabor_id: 165, nomor_teks: 'Bebas - Kelas s/d 52 Kg (Pa)', tanggal: '2026-11-07' }, [{ ...ada[0], status: 'ditolak' }]), null)

// --- pelengkap ---
cek('lengkapi: hanya isian yang kosong', lengkapiDariPic({ foto_path: null, nilai_teks: '8-0', lawan: '' }, { foto_path: 'a.jpg', nilai_teks: '9-0', lawan: 'Kota Bekasi', jam: null }),
  { foto_path: 'a.jpg', lawan: 'Kota Bekasi' })
cek('atlet sejalan: kosong', atletSejalan([], [1]), true)
cek('atlet sejalan: beda', atletSejalan([1], [2]), false)
cek('alasan validasi', ALASAN_VALIDASI(12), 'Menjadi validasi medali jalur cepat #12 (tidak dihitung dua kali)')
cek('tanda: menunggu', tandaValidasi('menunggu_pic')?.teks, '⏳ Menunggu PIC')
cek('tanda: tervalidasi dengan nama', tandaValidasi('tervalidasi', 'PIC Gulat')?.teks, '✓ Tervalidasi · PIC Gulat')
cek('tanda: laporan biasa', tandaValidasi(null), null)

console.log(`uji-jalur-cepat: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
