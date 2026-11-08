// scripts/uji-medali-resmi.ts — daftar medali resmi panitia vs data kita + perunggu semifinal.
// Dijalankan: npm run uji:medali-resmi
// Halaman contoh = salinan asli situs KONI Jabar 8 Nov 2026 (scripts/contoh-situs/).
import { readFileSync } from 'fs'
import { join } from 'path'
import { bacaMedaliKontingen, keteranganMedaliResmi, medaliTerlewat, refMedaliResmi, urlKontingen, type MedaliKita } from '../src/lib/medali-resmi'
import { semifinalPerunggu, tebakHasil, urlLaga } from '../src/lib/konijabar'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap)
  if (ok) lulus++; else { gagal++; console.log(`✗ ${nama}\n   dapat: ${JSON.stringify(dapat)}\n   harap: ${JSON.stringify(harap)}`) }
}

// ── Membaca halaman kontingen ──
const situs = bacaMedaliKontingen(readFileSync(join(__dirname, 'contoh-situs', 'kontingen-kab-bandung-8nov.html'), 'utf8'))
const hitung = (j: string) => situs.filter(m => m.jenis === j).length
cek('7 emas, 7 perak, 17 perunggu (sama dengan angka di halaman)', [hitung('emas'), hitung('perak'), hitung('perunggu')], [7, 7, 17])
const fakri = situs.find(m => m.atlet.includes('Moch Fakri Azriel Ardiansyah'))
cek('perunggu Fakri terbaca lengkap', fakri, { cabor: 'Gulat', jenis: 'perunggu', nomor: 'Bebas - Kelas s/d 57 Kg Putra', laga: fakri?.laga ?? null, atlet: ['Moch Fakri Azriel Ardiansyah'] })
cek('medali tanpa tautan laga → laga null', situs.find(m => m.atlet.includes('Ikbar Gustiana'))?.laga, null)
cek('medali bertautan laga', situs.find(m => m.atlet.includes('Hasan Ruslan'))?.laga, '1174')
cek('tanda video tidak ikut nama nomor', situs.filter(m => m.cabor === 'Judo').map(m => m.nomor), ['kelas -55 Kg Putra', 'Kelas 52-57 Kg Putri'])
cek('beregu: semua nama atlet', situs.find(m => m.cabor === 'Hockey')?.atlet.length, 12)
cek('cabor terbaca', Array.from(new Set(situs.map(m => m.cabor))), ['Gulat', 'Angkat Besi', 'Hockey', 'Muaythai', 'Anggar', 'Judo', 'Akuatik', 'Panahan'])
cek('url kontingen', urlKontingen('Kab. Bandung'), 'https://porprov.konijabar.or.id/kontingen/kab-bandung')

// ── Pembanding ──
const CABOR: Record<string, number> = { gulat: 25, anggar: 52 }
const caborId = (n: string) => CABOR[n.toLowerCase()] ?? null
const L = (o: Partial<MedaliKita> & { id: number }): MedaliKita => ({ cabor_id: 25, hasil: 'perunggu', status: 'disahkan', nomor_teks: '', ref_luar: null, atlet: [], ...o })
const gulat57 = situs.filter(m => m.nomor === 'Bebas - Kelas s/d 57 Kg Putra')
cek('belum ada di data kita → terlewat', medaliTerlewat(gulat57, [L({ id: 1, hasil: 'gugur', nomor_teks: 'Bebas - Kelas s/d 57 Kg (Pa)', atlet: ['Moch Fakri Azriel Ardiansyah'] })], caborId).length, 1)
cek('sudah ada (nomor sama, tulisan Pa) → tidak', medaliTerlewat(gulat57, [L({ id: 1, nomor_teks: 'Bebas - Kelas s/d 57 Kg (Pa)' })], caborId).length, 0)
cek('sudah ada (atlet sama, nomor beda tulisan) → tidak', medaliTerlewat(gulat57, [L({ id: 1, nomor_teks: 'Gaya Bebas 57', atlet: ['MOCH FAKRI AZRIEL ARDIANSYAH'] })], caborId).length, 0)
cek('putri ≠ putra → tetap terlewat', medaliTerlewat(gulat57, [L({ id: 1, nomor_teks: 'Bebas - Kelas s/d 57 Kg (Pi)' })], caborId).length, 1)
cek('medali beda jenis → tetap terlewat', medaliTerlewat(gulat57, [L({ id: 1, hasil: 'perak', nomor_teks: 'Bebas - Kelas s/d 57 Kg (Pa)' })], caborId).length, 1)
cek('laporan ditolak tidak dihitung', medaliTerlewat(gulat57, [L({ id: 1, status: 'ditolak', nomor_teks: 'Bebas - Kelas s/d 57 Kg (Pa)' })], caborId).length, 1)
cek('laporan dari daftar ini sudah pernah dibuat (walau ditolak) → tidak dibuat lagi',
  medaliTerlewat(gulat57, [L({ id: 1, status: 'ditolak', ref_luar: refMedaliResmi(gulat57[0]) })], caborId).length, 0)
cek('menunggu tetap dihitung ada (tidak dobel)', medaliTerlewat(gulat57, [L({ id: 1, status: 'menunggu', nomor_teks: 'Bebas - Kelas s/d 57 Kg (Pa)' })], caborId).length, 0)
cek('cabor lain → tetap terlewat', medaliTerlewat(gulat57, [L({ id: 1, cabor_id: 52, nomor_teks: 'Bebas - Kelas s/d 57 Kg (Pa)' })], caborId).length, 1)
cek('ref medali bertautan laga', refMedaliResmi({ cabor: 'Gulat', jenis: 'perunggu', nomor: 'X', laga: '703', atlet: [] }), 'medali-703-perunggu')
cek('ref medali tanpa laga', refMedaliResmi({ cabor: 'Gulat', jenis: 'emas', nomor: 'Grego - kelas s/d 87 Kg Putra', laga: null, atlet: [] }), 'medali-gulat-grego-kelas-s-d-87-kg-putra-emas')
cek('tautan ref medali → laga', urlLaga('medali-703-perunggu'), 'https://porprov.konijabar.or.id/laga/703')
cek('tautan ref medali tanpa laga → halaman kontingen', urlLaga('medali-gulat-grego-kelas-s-d-87-kg-putra-emas'), 'https://porprov.konijabar.or.id/kontingen/kab-bandung')
cek('keterangan menyebut sumber & atlet', keteranganMedaliResmi(gulat57[0], 'u').startsWith('Perunggu menurut daftar medali resmi Situs KONI Jabar (Gulat · Bebas - Kelas s/d 57 Kg Putra · Moch Fakri Azriel Ardiansyah)'), true)

// ── Perunggu dari kalah semifinal ──
cek('anggar: kalah semifinal = perunggu', tebakHasil('Semifinal', 'KO SF2', 'kalah', 'Anggar').hasil, 'perunggu')
cek('muaythai: kalah semifinal = perunggu', tebakHasil('Semifinal', null, 'kalah', 'Muaythai').hasil, 'perunggu')
cek('anggar: menang semifinal tetap lolos', tebakHasil('Semifinal', 'KO SF2', 'menang', 'Anggar').hasil, 'lolos')
cek('anggar: kalah perempat final tetap gugur', tebakHasil('Perempat final', 'KO QF4', 'kalah', 'Anggar').hasil, 'gugur')
cek('gulat: kalah semifinal tetap gugur (perunggu lewat repechage)', tebakHasil('Semifinal', null, 'kalah', 'Gulat').hasil, 'gugur')
cek('tanpa cabor: perilaku lama', tebakHasil('Semifinal', 'KO SF2', 'kalah').hasil, 'gugur')
cek('anggar: final kalah tetap perak', tebakHasil('Final', 'KO F', 'kalah', 'Anggar').hasil, 'perak')
cek('daftar cabor semifinal-perunggu', ['Anggar', 'Muay Thai', 'Pencak Silat', 'Judo', 'Karate', 'Gulat'].map(semifinalPerunggu), [true, true, true, false, false, false])

console.log(`uji-medali-resmi: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
