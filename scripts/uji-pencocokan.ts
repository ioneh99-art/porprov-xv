// scripts/uji-pencocokan.ts
// Uji mesin pencocokan nama. Jalankan: npm run uji:pencocokan
//
// Kasusnya meniru pola NYATA dari 828 nama berkas foto di folder pengumpulan
// (nama potongan, derau "Pas Foto"/"Copy of"/tanda kurung, inisial, salah ketik),
// tapi memakai nama contoh — bukan nama atlet asli.

import {
  cocokkanNama, bersihkanNamaBerkas, skorKandungan,
  caborDariFolder, caborDariJalur, apakahFolderStruktural,
} from '@/lib/pencocokan'

let lulus = 0, gagal = 0
const cek = (nama: string, syarat: boolean, ket = '') => {
  if (syarat) { lulus++; console.log(`  ✓ ${nama}`) }
  else { gagal++; console.log(`  ✗ ${nama} ${ket}`) }
}

// Kolam contoh — meniru sebaran nama Indonesia yang sebenarnya
const KOLAM = [
  { id: 1, nama_lengkap: 'Muhammad Jordi Indra Permana' },
  { id: 2, nama_lengkap: 'Reina Putri Najiyyah' },
  { id: 3, nama_lengkap: 'Raihan Syeh Abdillah' },
  { id: 4, nama_lengkap: 'Abdul Latif Hidayat' },
  { id: 5, nama_lengkap: 'Irna Listiana' },
  { id: 6, nama_lengkap: 'Muhammad Akbar Kharisma Wardana' },
  { id: 7, nama_lengkap: 'Fikry Aulya Rahman' },
  { id: 8, nama_lengkap: 'Dea Ginanjar Wisnu Skr' },
  { id: 9, nama_lengkap: 'Moch Fakri Azriel Ardiansyah' },
  { id: 10, nama_lengkap: 'Raissa Nava Shalehah' },
]

console.log('\n[1] Pembersihan derau nama berkas')
cek('tanda kurung dibuang', bersihkanNamaBerkas('Raihan (aa ipsc)') === 'RAIHAN',
    `dapat "${bersihkanNamaBerkas('Raihan (aa ipsc)')}"`)
cek('"Pas Foto" dibuang', bersihkanNamaBerkas('Pas Foto Rizki(1)') === 'RIZKI',
    `dapat "${bersihkanNamaBerkas('Pas Foto Rizki(1)')}"`)
cek('"Copy of" dibuang', bersihkanNamaBerkas('Copy of nizar') === 'NIZAR',
    `dapat "${bersihkanNamaBerkas('Copy of nizar')}"`)
cek('angka lepas dibuang', bersihkanNamaBerkas('Andi 2026') === 'ANDI',
    `dapat "${bersihkanNamaBerkas('Andi 2026')}"`)
cek('nama bersih tidak berubah', bersihkanNamaBerkas('Aldi Septiana') === 'ALDI SEPTIANA')

console.log('\n[2] Nama potongan — inti perbaikannya')
const potongan: Array<[string, number]> = [
  ['M. Jordi ', 1],
  ['reina ', 2],
  ['Raihan (aa ipsc)', 3],
  ['m akbar', 6],
]
for (const [sumber, idHarapan] of potongan) {
  const h = cocokkanNama(sumber, KOLAM, { bersihkan: true })
  cek(`"${sumber.trim()}" → id ${idHarapan}`,
      h.metode === 'mirip' && h.kandidat?.id === idHarapan,
      `dapat ${h.metode} ${h.kandidat?.nama ?? '-'} (${h.skor})`)
}

console.log('\n[3] Salah ketik & spasi hilang')
const ejaan: Array<[string, number]> = [
  ['ABDULLATIFHIDAYAT', 4],
  ['IRNA LISTIANI', 5],
  ['Fikry Aulia Rahman', 7],
  ['M FAKRI AZRIEL ARDIANSYAH', 9],
  ['RAISSA NAVA SALEHAH', 10],
]
for (const [sumber, idHarapan] of ejaan) {
  const h = cocokkanNama(sumber, KOLAM, { bersihkan: true })
  cek(`"${sumber}" → id ${idHarapan}`,
      (h.metode === 'mirip' || h.metode === 'persis') && (h.kandidat?.id ?? h.id) === idHarapan,
      `dapat ${h.metode} ${h.kandidat?.nama ?? h.nama ?? '-'} (${h.skor})`)
}

console.log('\n[4] Beda besar-kecil huruf = cocok PERSIS')
{
  const h = cocokkanNama('DEA GINANJAR WISNU SKR', KOLAM, { bersihkan: true })
  cek('huruf besar semua tetap persis', h.metode === 'persis' && h.id === 8, `dapat ${h.metode}`)
}

console.log('\n[5] Sistem TIDAK menebak sendiri')
{
  const h = cocokkanNama('m akbar', KOLAM, { bersihkan: true })
  cek('nama mirip tidak langsung ditautkan', h.id === null && h.kandidat != null)
  const t = cocokkanNama('Puspa Hanuraeni', KOLAM, { bersihkan: true })
  cek('nama asing ditolak, bukan dipaksakan', t.metode === 'tidak_ketemu',
      `dapat ${t.metode} → ${t.kandidat?.nama ?? '-'} (${t.skor})`)
}

console.log('\n[6] Ambigu wajib ditandai')
{
  const kembar = [
    { id: 21, nama_lengkap: 'Ahmad Fauzan Nugraha' },
    { id: 22, nama_lengkap: 'Ahmad Fauzan Nugroho' },
  ]
  const h = cocokkanNama('Ahmad Fauzan Nugrahu', kembar, { bersihkan: true })
  cek('dua kandidat setara → ambigu', h.metode === 'ambigu' && h.saingan != null,
      `dapat ${h.metode}`)
  cek('ambigu tidak menautkan apa pun', h.id === null)
}

console.log('\n[7] Skor kandungan')
cek('semua kata terwakili = 1', skorKandungan('BUDI SANTOSO', 'BUDI SANTOSO PRATAMA') === 1)
cek('tidak ada yang terwakili = 0', skorKandungan('ZAENAL', 'BUDI SANTOSO') === 0)

console.log('\n[8] Peta nama cabor folder → database')
const CABOR_DB = ['Hockey', 'Shorinji Kempo', 'Equestrian', 'Modern Pentathlon',
                  'Dancesport', 'Esport', 'Biliar', 'Boling', 'Menembak', 'Panahan']
const petaUji: Array<[string, string | null]> = [
  ['HOKI', 'Hockey'],
  ['KEMPO', 'Shorinji Kempo'],
  ['BERKUDA', 'Equestrian'],
  ['PENTHATLON', 'Modern Pentathlon'],
  ['DANSA', 'Dancesport'],
  ['E-SPORTS INDONESIA', 'Esport'],
  ['BILIARD', 'Biliar'],
  ['BOWLING', 'Boling'],
  ['MENEMBAK', 'Menembak'],
  ['CABOR ASING', null],
]
for (const [folder, harapan] of petaUji) {
  const dapat = caborDariFolder(folder, CABOR_DB)
  cek(`"${folder}" → ${harapan ?? 'tidak ada'}`, dapat === harapan, `dapat ${dapat}`)
}

console.log('\n[9] Folder struktural TIDAK boleh dianggap cabor')
// Bug nyata: "ATLET" sempat tercocokkan ke cabor "Atletik". Kalau operator
// memilih satu folder cabor saja, SELURUH fotonya akan salah masuk ke Atletik.
cek('"ATLET" ditolak (bukan Atletik)', caborDariFolder('ATLET', CABOR_DB.concat('Atletik')) === null,
    `dapat ${caborDariFolder('ATLET', CABOR_DB.concat('Atletik'))}`)
cek('"PELATIH DAN OFFICIAL" ditolak', caborDariFolder('PELATIH DAN OFFICIAL', CABOR_DB) === null)
cek('"ATLETIK" tetap diterima', caborDariFolder('ATLETIK', CABOR_DB.concat('Atletik')) === 'Atletik')
cek('penanda folder struktural', apakahFolderStruktural('ATLET') && !apakahFolderStruktural('ATLETIK'))

console.log('\n[10] Cabor dikenali dari jalur, apa pun folder yang dipilih')
const DBJ = CABOR_DB.concat(['Atletik', 'Aeromodelling', 'Gulat', 'Akuatik'])
const jalurUji: Array<[string, string | null]> = [
  ['PENGUMPULAN FOTO/AEROMODELLING/ATLET/Aldi.png', 'Aeromodelling'],
  ['AEROMODELLING/ATLET/Aldi.png', 'Aeromodelling'],
  ['AKUATIK/OWS/ATLET/Diva.jpg', 'Akuatik'],
  ['PENGUMPULAN FOTO/HOKI/ATLET/x.jpg', 'Hockey'],
  ['ATLET/Aldi.png', null],
]
for (const [jalur, harap] of jalurUji) {
  const dapat = caborDariJalur(jalur, DBJ)
  cek(`"${jalur}" → ${harap ?? 'tidak ada'}`, dapat === harap, `dapat ${dapat}`)
}

console.log(`\n───── LULUS ${lulus} · GAGAL ${gagal}\n`)
process.exit(gagal ? 1 : 0)
