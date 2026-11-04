// scripts/uji-pengisi.ts — "Siapa yang mengisi?" di laporan PIC. Dijalankan: npm run uji:pengisi
import { judulDisiplin, periksaPengisi, teksPengisi, tulisPengisi } from '../src/lib/pengisi'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const galat = (x: any) => 'galat' in x

cek('lengkap', periksaPengisi({ pengisi_nama: '  Budi   Santoso ', pengisi_jabatan: 'Pelatih' }), { pengisi: { nama: 'Budi Santoso', jabatan: 'Pelatih' } })
cek('nama kosong ditolak', galat(periksaPengisi({ pengisi_nama: '', pengisi_jabatan: 'Pelatih' })), true)
cek('nama terlalu pendek ditolak', galat(periksaPengisi({ pengisi_nama: 'Bu', pengisi_jabatan: 'Pelatih' })), true)
cek('jabatan kosong ditolak', galat(periksaPengisi({ pengisi_nama: 'Budi', pengisi_jabatan: '' })), true)
cek('jabatan asing ditolak', galat(periksaPengisi({ pengisi_nama: 'Budi', pengisi_jabatan: 'Presiden' })), true)
cek('Lainnya wajib ditulis', galat(periksaPengisi({ pengisi_nama: 'Budi', pengisi_jabatan: 'Lainnya', pengisi_jabatan_lain: '' })), true)
cek('Lainnya memakai tulisan sendiri', periksaPengisi({ pengisi_nama: 'Budi', pengisi_jabatan: 'Lainnya', pengisi_jabatan_lain: 'Fisioterapis' }), { pengisi: { nama: 'Budi', jabatan: 'Fisioterapis' } })
cek('kiriman bukan objek', galat(periksaPengisi(null)), true)
cek('nama dipotong 80 huruf', (periksaPengisi({ pengisi_nama: 'A'.repeat(200), pengisi_jabatan: 'Atlet' }) as any).pengisi.nama.length, 80)
cek('tulis pengisi', tulisPengisi({ nama: 'Budi', jabatan: 'Pelatih' }), 'Budi (Pelatih)')
cek('teks: orang lain memakai kode', teksPengisi({ pengisi_nama: 'Budi', pengisi_jabatan: 'Pelatih', pelapor_nama: 'Asep' }), 'Budi (Pelatih) · kode PIC Asep')
cek('teks: pemilik kode sendiri', teksPengisi({ pengisi_nama: 'asep ', pengisi_jabatan: 'PIC Cabor', pelapor_nama: 'Asep' }), 'asep (PIC Cabor)')
cek('teks: laporan lama tanpa pengisi', teksPengisi({ pengisi_nama: null, pengisi_jabatan: null, pelapor_nama: 'Asep' }), 'Asep')

cek('judul disiplin', ['AKUATIK - POLO AIR', 'RENANG PERAIRAN TERBUKA', 'DAYUNG CANOEING', 'HOCKEY INDOOR', 'BALAP SEPEDA - BMX'].map(judulDisiplin), ['Polo Air', 'Renang Perairan Terbuka', 'Canoeing', 'Hockey Indoor', 'Bmx'])

console.log(`uji-pengisi: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
