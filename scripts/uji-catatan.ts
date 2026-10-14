// scripts/uji-catatan.ts — mengunci aturan catatan lapangan PIC.
// Dijalankan: npm run uji:catatan
import { JENIS_CATATAN, JUDUL_BAGIAN, LABEL_JENIS, periksaCatatan, rapikanTanggapan, tautanWA, urutCatatan } from '../src/lib/catatan'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const galat = (b: any) => { const h = periksaCatatan(b); return 'galat' in h ? h.galat : null }
const isi = (b: any) => { const h = periksaCatatan(b); return 'isi' in h ? h.isi : null }
const dasar = { jenis: 'teknis', isi: 'Matras arena 2 sobek, pertandingan ditunda 30 menit.' }

// ── jenis dan isi wajib ──
cek('tiga jenis, urut format Monev', JENIS_CATATAN, ['aturan', 'teknis', 'nonteknis'])
cek('tiap jenis punya label', JENIS_CATATAN.every(j => !!LABEL_JENIS[j] && !!JUDUL_BAGIAN[j]), true)
cek('jenis kosong ditolak', galat({ ...dasar, jenis: undefined }), 'Pilih jenis catatannya.')
cek('jenis asing ditolak', galat({ ...dasar, jenis: 'protes' }), 'Pilih jenis catatannya.')
cek('isi terlalu pendek ditolak', galat({ ...dasar, isi: 'rusak' }), 'Ceritakan kejadiannya sedikit lebih jelas (minimal 10 huruf).')
cek('isi hanya spasi ditolak', galat({ ...dasar, isi: '            ' }), 'Ceritakan kejadiannya sedikit lebih jelas (minimal 10 huruf).')
cek('isi bukan teks ditolak', galat({ ...dasar, isi: 12345678901 }), 'Ceritakan kejadiannya sedikit lebih jelas (minimal 10 huruf).')
cek('isi dipotong 1000 huruf', isi({ ...dasar, isi: 'a'.repeat(1500) })?.isi.length, 1000)
cek('baris baru dipertahankan, baris kosong berlebih dirapikan', isi({ ...dasar, isi: 'Baris satu   panjang\n\n\n\nBaris dua sudah' })?.isi, 'Baris satu panjang\n\nBaris dua sudah')

// ── mendesak, jam, nomor, atlet ──
cek('mendesak hanya bila true persis', [isi({ ...dasar, mendesak: true })?.mendesak, isi({ ...dasar, mendesak: 'true' })?.mendesak, isi(dasar)?.mendesak], [true, false, false])
cek('jam kosong boleh', isi({ ...dasar, jam: '' })?.jam, null)
cek('jam 9:05 dibakukan', isi({ ...dasar, jam: '9:05' })?.jam, '09:05')
cek('jam salah ditolak', galat({ ...dasar, jam: '25:00' }), 'Jam kejadian tidak dikenali. Tulis seperti 14:30.')
cek('nomor kosong jadi null', isi({ ...dasar, nomor_teks: '   ' })?.nomor_teks, null)
cek('nomor dirapikan satu baris', isi({ ...dasar, nomor_teks: 'Kumite\n  55 kg (Pi)' })?.nomor_teks, 'Kumite 55 kg (Pi)')
cek('atlet boleh kosong', isi(dasar)?.atlet_ids, [])
cek('atlet dibersihkan dan tanpa kembar', isi({ ...dasar, atlet_ids: [5, '5', 7, -1, 0, 'x', 2.5] })?.atlet_ids, [5, 7])
cek('atlet lebih dari 60 ditolak', galat({ ...dasar, atlet_ids: Array.from({ length: 61 }, (_, i) => i + 1) }), 'Terlalu banyak atlet dalam satu catatan (maksimal 60).')
cek('kiriman bukan objek ditolak dengan pesan', galat(null), 'Pilih jenis catatannya.')

// ── tanggapan KONIDA ──
cek('tanggapan dirapikan', rapikanTanggapan('  sudah   diajukan protes  '), 'sudah diajukan protes')
cek('tanggapan bukan teks jadi kosong', rapikanTanggapan(undefined), '')
cek('tanggapan dipotong 500', rapikanTanggapan('b'.repeat(900)).length, 500)

// ── urutan untuk KONIDA ──
const c = (id: number, status: string, mendesak: boolean, created_at: string) => ({ id, status, mendesak, created_at })
cek('mendesak yang baru paling atas, lalu status, lalu terbaru', urutCatatan([
  c(1, 'selesai', true, '2026-11-08T01:00:00Z'),
  c(2, 'baru', false, '2026-11-08T03:00:00Z'),
  c(3, 'baru', true, '2026-11-08T02:00:00Z'),
  c(4, 'ditangani', false, '2026-11-08T05:00:00Z'),
  c(5, 'baru', false, '2026-11-08T04:00:00Z'),
  c(6, 'diabaikan', false, '2026-11-08T06:00:00Z'),
]).map(x => x.id), [3, 5, 2, 4, 1, 6])
cek('mendesak yang sudah ditangani tidak diistimewakan', urutCatatan([c(1, 'ditangani', true, '2026-11-08T01:00:00Z'), c(2, 'baru', false, '2026-11-08T00:00:00Z')]).map(x => x.id), [2, 1])

// ── tautan WhatsApp ──
cek('0812…', tautanWA('0812-3456-7890'), 'https://wa.me/6281234567890')
cek('+62 812…', tautanWA('+62 812 3456 7890'), 'https://wa.me/6281234567890')
cek('812… tanpa awalan', tautanWA('81234567890'), 'https://wa.me/6281234567890')
cek('kosong', tautanWA(null), null)
cek('nomor rumah bukan WA', tautanWA('022-5891234'), null)
cek('terlalu pendek', tautanWA('0812'), null)

console.log(`\nuji-catatan: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
