// Uji bolak-balik: buat template → isi → baca → cocokkan
import * as XLSX from 'xlsx'
import { buatTemplate, TEMPLATES, LEMBAR_DATA, hitungBmi } from '@/lib/gateway/templates'
import { bacaBerkas, cocokkan } from '@/lib/gateway/import'

const DB = [
  { id: 1927, no_ktp: '3204014602070003', nama_lengkap: 'Suci Lestari' },
  { id: 2231, no_ktp: '3204014805080001', nama_lengkap: 'Sucie Lestari Fauziah' },
  { id: 2243, no_ktp: '3207010310000002', nama_lengkap: 'Popi Suci Lestari' },
  { id: 2481, no_ktp: '3204011311110004', nama_lengkap: 'Alya' },
]

let lulus = 0, gagal = 0
const cek = (nama: string, syarat: boolean, ket = '') => {
  if (syarat) { lulus++; console.log(`  ✓ ${nama}`) }
  else { gagal++; console.log(`  ✗ ${nama} ${ket}`) }
}

// ── 1. Template terbentuk & berisi lembar yang benar ──
console.log('\n[1] Pembuatan template')
for (const jenis of ['identitas', 'perlengkapan', 'biomotorik'] as const) {
  const buf = buatTemplate(jenis)
  const wb = XLSX.read(buf, { type: 'buffer' })
  cek(`${jenis}: ada lembar PETUNJUK & DATA`, wb.SheetNames.includes('PETUNJUK') && wb.SheetNames.includes('DATA'))
  cek(`${jenis}: penanda versi di B2 = ${jenis}:v1`, String(wb.Sheets['PETUNJUK']['B2']?.v) === `${jenis}:v1`)
}

// ── 2. Bolak-balik biomotorik ──
console.log('\n[2] Bolak-balik biomotorik')
{
  const def = TEMPLATES.biomotorik
  const H = def.kolom.map(k => k.header)
  const baris = (o: Record<string, any>) => def.kolom.map(k => o[k.key] ?? '')
  const wb = XLSX.read(buatTemplate('biomotorik'), { type: 'buffer' })
  const rows = [
    H,
    baris({ nik: '3204010101070001', nama_lengkap: 'Suci Lestari', tanggal_tes: '2026-10-15', tahap: 4, contoh: 1 }), // baris contoh bawaan → dilewati
    baris({ nik: '3204014602070003', nama_lengkap: 'Suci Lestari', tanggal_tes: '2026-10-15', tahap: 4, berat_badan: 54.5, tinggi_badan: 162, kesimpulan_persen: 72, kesimpulan_kategori: 'Baik', status_tes: 'Hadir' }),
    baris({ nik: '9999999999999999', nama_lengkap: 'Alya', tanggal_tes: '15/10/2026', tahap: 4, status_tes: 'Hadir' }),          // NIK asing → jatuh ke nama persis
    baris({ nik: '', nama_lengkap: 'Suci Lestari Fauzia', tanggal_tes: '2026-10-15', tahap: 4 }),                                  // nama mirip → perlu konfirmasi
    baris({ nik: '123', nama_lengkap: 'Orang Tak Dikenal', tanggal_tes: 'kemarin', tahap: 'empat' }),                              // banyak galat
  ]
  wb.Sheets[LEMBAR_DATA] = XLSX.utils.aoa_to_sheet(rows)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  const h = cocokkan(bacaBerkas(buf, 'biomotorik'), DB)
  cek('versi terbaca & cocok', h.versi_cocok, `(${h.versi_berkas})`)
  cek('baris contoh bawaan dilewati', h.baris.length === 4, `dapat ${h.baris.length}`)
  cek('cocok lewat NIK = 1', h.ringkasan.nik === 1, `dapat ${h.ringkasan.nik}`)
  cek('cocok lewat nama persis = 1', h.ringkasan.nama_persis === 1, `dapat ${h.ringkasan.nama_persis}`)
  // "Suci Lestari Fauzia" setara-kuat dengan "Suci Lestari" DAN "Sucie Lestari Fauziah"
  // → wajib ditandai ambigu, bukan ditebak. Ini kasus nyata di kontingen ini.
  cek('nama setara dua atlet → AMBIGU', h.ringkasan.nama_ambigu === 1, `dapat ${h.ringkasan.nama_ambigu}`)
  cek('tidak ketemu = 1', h.ringkasan.tidak_ketemu === 1, `dapat ${h.ringkasan.tidak_ketemu}`)

  const b0 = h.baris[0]
  cek('BMI dihitung otomatis (54.5kg/162cm = 20.8)', b0.nilai.bmi === 20.8, `dapat ${b0.nilai.bmi}`)
  cek('nama ambigu TIDAK ditautkan otomatis', h.baris[2].atlet_id === null)
  cek('nama ambigu menyodorkan dua kandidat', h.baris[2].kandidat != null && h.baris[2].saingan != null)

  const b1 = h.baris[1]
  cek('tanggal dd/mm/yyyy terbaca', b1.nilai.tanggal_tes === '2026-10-15', `dapat ${b1.nilai.tanggal_tes}`)

  const bg = h.baris[3]
  cek('NIK 3 digit ditandai galat', bg.galat.some(g => g.includes('16 digit')))
  cek('tanggal ngawur ditandai galat', bg.galat.some(g => g.includes('TANGGAL TES')))
  cek('tahap bukan angka ditandai galat', bg.galat.some(g => g.includes('TAHAP')))
}

// ── 3. Aturan pilihan nilai & NIK ganda ──
console.log('\n[3] Aturan nilai')
{
  const def = TEMPLATES.biomotorik
  const H = def.kolom.map(k => k.header)
  const baris = (o: Record<string, any>) => def.kolom.map(k => o[k.key] ?? '')
  const wb = XLSX.read(buatTemplate('biomotorik'), { type: 'buffer' })
  wb.Sheets[LEMBAR_DATA] = XLSX.utils.aoa_to_sheet([
    H,
    baris({ nik: '3204014602070003', nama_lengkap: 'A', tanggal_tes: '2026-10-15', tahap: 4, kesimpulan_kategori: 'Bagus Banget' }),
    baris({ nik: '3204014602070003', nama_lengkap: 'B', tanggal_tes: '2026-10-15', tahap: 4 }),
  ])
  const h = cocokkan(bacaBerkas(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer, 'biomotorik'), DB)
  cek('kategori di luar pilihan ditolak', h.baris[0].galat.some(g => g.includes('KATEGORI')))
  cek('NIK ganda dalam satu berkas ditandai', h.baris[1].galat.some(g => g.includes('ganda')))
}

// ── 4. Hitungan BMI ──
console.log('\n[4] BMI')
cek('null bila data kurang', hitungBmi(null, 162) === null && hitungBmi(54, null) === null)
cek('70kg / 175cm = 22.9', hitungBmi(70, 175) === 22.9, `dapat ${hitungBmi(70, 175)}`)

console.log(`\n───── LULUS ${lulus} · GAGAL ${gagal}\n`)
process.exit(gagal ? 1 : 0)
