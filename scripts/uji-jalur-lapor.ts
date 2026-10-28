// scripts/uji-jalur-lapor.ts — aturan jalur kedua (tim KONIDA mengisi hasil tanpa kode PIC).
// Dijalankan: npm run uji:jalur-lapor
import { adminUntukKontingen, akhirSesiKonida, keadaanPic, namaPelaporKonida, urutCaborLangsung, UMUR_SESI_KONIDA_MS } from '../src/lib/jalur-lapor'

let lulus = 0, gagal = 0
const cek = (nama: string, ok: boolean) => {
  if (ok) lulus++
  else { gagal++; console.log(`  GAGAL  ${nama}`) }
}

// ── Siapa boleh memakai jalur KONIDA untuk kontingen 4 ──
cek('KONIDA kontingen 4 boleh', adminUntukKontingen({ role: 'konida', kontingen_id: 4 }, 4))
cek('KONIDA kontingen 4 (teks) boleh', adminUntukKontingen({ role: 'konida', kontingen_id: '4' }, 4))
cek('KONIDA kontingen lain ditolak', !adminUntukKontingen({ role: 'konida', kontingen_id: 7 }, 4))
cek('KONIDA tanpa kontingen ditolak', !adminUntukKontingen({ role: 'konida', kontingen_id: null }, 4))
cek('superadmin boleh', adminUntukKontingen({ role: 'superadmin' }, 4))
cek('level superadmin boleh', adminUntukKontingen({ role: 'x', level: 'superadmin' }, 4))
cek('koni_jabar boleh', adminUntukKontingen({ role: 'koni_jabar' }, 4))
cek('operator cabor ditolak', !adminUntukKontingen({ role: 'operator_cabor', kontingen_id: 4 }, 4))
cek('tanpa sesi dashboard ditolak', !adminUntukKontingen(null, 4))

// ── Nama pelapor ──
cek('nama pelapor dari nama', namaPelaporKonida({ nama: 'Regi', username: 'regi' }) === 'KONIDA · Regi')
cek('nama pelapor dari username', namaPelaporKonida({ username: 'kab.bandung' }) === 'KONIDA · kab.bandung')
cek('nama pelapor cadangan', namaPelaporKonida({}) === 'KONIDA · admin')
cek('nama pelapor dipangkas', namaPelaporKonida({ nama: 'x'.repeat(200) }).length === 'KONIDA · '.length + 60)

// ── Umur sesi: maksimal 12 jam, tidak melewati sesi dashboard ──
const kini = 1_000_000
cek('dashboard masih 8 jam → ikut dashboard', akhirSesiKonida(kini, kini + 8 * 3600_000) === kini + 8 * 3600_000)
cek('dashboard masih 20 jam → dibatasi 12 jam', akhirSesiKonida(kini, kini + 20 * 3600_000) === kini + UMUR_SESI_KONIDA_MS)
cek('exp dashboard tak terbaca → 12 jam', akhirSesiKonida(kini, undefined) === kini + UMUR_SESI_KONIDA_MS)
cek('exp dashboard sudah lewat → 12 jam (sesi tetap diperiksa ulang tiap kiriman)', akhirSesiKonida(kini, kini - 1) === kini + UMUR_SESI_KONIDA_MS)

// ── Keadaan PIC per cabor ──
const akses = [
  { cabor_id: 1, aktif: true, terakhir_dipakai: '2026-10-27T01:00:00Z', nama_pic: 'Asep' },
  { cabor_id: 2, aktif: true, terakhir_dipakai: null, nama_pic: 'Budi' },
  { cabor_id: 3, aktif: false, terakhir_dipakai: '2026-10-20T01:00:00Z', nama_pic: 'Cecep' },
  { cabor_id: 4, aktif: true, terakhir_dipakai: null, nama_pic: 'Dedi' },
  { cabor_id: 4, aktif: true, terakhir_dipakai: '2026-10-27T01:00:00Z', nama_pic: 'Euis' },
]
cek('kode aktif & pernah dipakai = aktif', keadaanPic(akses, 1).keadaan === 'aktif')
cek('kode aktif belum dipakai = belum_dipakai', keadaanPic(akses, 2).keadaan === 'belum_dipakai')
cek('kode dimatikan = tidak_ada', keadaanPic(akses, 3).keadaan === 'tidak_ada')
cek('tanpa kode = tidak_ada', keadaanPic(akses, 9).keadaan === 'tidak_ada')
const k4 = keadaanPic(akses, 4)
cek('dua kode, satu dipakai = aktif, nama yang aktif saja', k4.keadaan === 'aktif' && k4.nama.join() === 'Euis')

// ── Urutan daftar: tanpa PIC di atas ──
const urut = urutCaborLangsung([
  { id: 1, nama: 'Atletik' }, { id: 2, nama: 'Biliar' }, { id: 9, nama: 'Futsal' }, { id: 8, nama: 'Catur' },
], akses)
cek('urutan: tanpa PIC → belum aktif → aktif', urut.map(c => c.nama).join(',') === 'Catur,Futsal,Biliar,Atletik')

console.log(`uji-jalur-lapor: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
