// scripts/impor-matriks-jadwal.ts
// Memperbarui jadwal_cabor dari berkas "Matriks Jadwal Harian" KONI Kab. Bandung.
// Aturan pembaruannya ada di src/lib/impor-matriks.ts — sama dengan tombol
// "Unggah Matriks KONI" di halaman Kelola Jadwal.
//
//   npx tsx scripts/impor-matriks-jadwal.ts "<berkas.xlsx>"            → pratinjau
//   npx tsx scripts/impor-matriks-jadwal.ts "<berkas.xlsx>" --simpan   → menyimpan

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { rencanaMatriks, tglSingkat } from '../src/lib/impor-matriks'
import * as fs from 'fs'
import * as path from 'path'

const berkas = process.argv[2]
if (!berkas) { console.error('Sebutkan berkasnya.'); process.exit(1) }
const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const ambil = (k: string) =>
  env.split('\n').find(l => l.startsWith(k + '='))?.slice(k.length + 1).replace(/["\r]/g, '').trim() ?? ''
const sb = createClient(ambil('NEXT_PUBLIC_SUPABASE_URL'), ambil('SUPABASE_SERVICE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  const wb = XLSX.readFile(berkas)
  const ws = wb.Sheets['Matrix Jadwal Harian']
  if (!ws) { console.error('Sheet "Matrix Jadwal Harian" tidak ada.'); process.exit(1) }
  // raw: sel tanggal keluar sebagai nomor seri Excel — lihat catatan di tanggalJadwal().
  const baris = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: '' })

  const { data: lama, error } = await sb.from('jadwal_cabor').select('*').order('id')
  if (error) { console.error(error.message); process.exit(1) }

  // Daftar cabor kontingen, untuk menautkan baris baru.
  let caborDb: string[] = []
  for (let p = 0; ; p++) {
    const { data } = await sb.from('atlet').select('cabor_nama_raw').eq('kontingen_id', 4).range(p * 1000, (p + 1) * 1000 - 1)
    if (!data?.length) break
    caborDb = caborDb.concat(data.map(r => (r.cabor_nama_raw ?? '').trim()).filter(Boolean))
    if (data.length < 1000) break
  }

  const r = rencanaMatriks(baris, lama ?? [], Array.from(new Set(caborDb)), path.basename(berkas))
  console.log(`Matriks      : ${r.baris_harian} baris harian, ${r.kegiatan} kegiatan`)
  console.log(`Di sistem    : ${lama?.length ?? 0} baris`)
  console.log(`\nTidak berubah: ${r.sama}`)
  console.log(`\nDIPERBARUI (${r.ubah.length}):`)
  r.ubah.forEach(u => console.log(`   ${u.nama}\n      ${u.ket.join('\n      ')}`))
  console.log(`\nDITAMBAH (${r.tambah.length}):`)
  r.tambah.forEach(t => console.log(`   ${t.cabor_disiplin} · ${tglSingkat(t.mulai)}–${tglSingkat(t.selesai)} · ${t.tuan_rumah} · ${t.venue} → cabor ${t.cabor_nama_raw ?? '(tidak tertaut)'}`))
  console.log(`\nADA DI SISTEM, TIDAK ADA DI MATRIKS — dibiarkan (${r.tak_di_matriks.length}):`)
  r.tak_di_matriks.forEach(l => console.log(`   ${l.nama} · ${l.mulai ? tglSingkat(l.mulai) : '?'}–${l.selesai ? tglSingkat(l.selesai) : '?'}`))

  if (!process.argv.includes('--simpan')) { console.log('\n(pratinjau saja — tambahkan --simpan untuk benar-benar menyimpan)'); return }

  const cadangan = path.join(process.cwd(), `_backup_jadwal_cabor_${new Date().toISOString().slice(0, 10)}.json`)
  if (!fs.existsSync(cadangan)) fs.writeFileSync(cadangan, JSON.stringify(lama, null, 1))
  console.log(`\nCadangan baris lama: ${path.basename(cadangan)}`)
  for (const u of r.ubah) {
    const { error: e } = await sb.from('jadwal_cabor').update({ ...u.isi, updated_at: new Date().toISOString() }).eq('id', u.id)
    if (e) { console.error(`Gagal memperbarui ${u.nama}: ${e.message}`); process.exit(1) }
  }
  if (r.tambah.length) {
    const { error: e } = await sb.from('jadwal_cabor').insert(r.tambah)
    if (e) { console.error(`Gagal menambah: ${e.message}`); process.exit(1) }
  }
  console.log(`Tersimpan: ${r.ubah.length} diperbarui, ${r.tambah.length} ditambah.`)
}
main()
