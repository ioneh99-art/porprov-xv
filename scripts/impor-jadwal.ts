// scripts/impor-jadwal.ts
// Memasukkan jadwal PORPROV XV dari berkas panitia ke tabel jadwal_cabor.
// Dijalankan sekali: npx tsx scripts/impor-jadwal.ts <berkas.xlsx>
//
// Bukan lewat Data Gateway karena ini bukan data atlet dan bukan pekerjaan
// berulang tim IT — jadwal terbit sekali lalu sesekali direvisi panitia.

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { caborDariJadwal, tanggalJadwal } from '../src/lib/jadwal'
import * as fs from 'fs'
import * as path from 'path'

const berkas = process.argv[2]
if (!berkas) { console.error('Sebutkan berkasnya.'); process.exit(1) }

// .env.local dibaca manual — skrip ini di luar Next.
const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const ambil = (k: string) =>
  env.split('\n').find(l => l.startsWith(k + '='))?.slice(k.length + 1).replace(/["\r]/g, '').trim() ?? ''

const sb = createClient(ambil('NEXT_PUBLIC_SUPABASE_URL'), ambil('SUPABASE_SERVICE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  // Daftar cabor yang benar-benar ada — jawaban pencocokan selalu dari sini.
  let caborDb: string[] = []
  for (let p = 0; ; p++) {
    const { data } = await sb.from('atlet').select('cabor_nama_raw')
      .eq('kontingen_id', 4).range(p * 1000, (p + 1) * 1000 - 1)
    if (!data?.length) break
    caborDb = caborDb.concat(data.map(r => (r.cabor_nama_raw ?? '').trim()).filter(Boolean))
    if (data.length < 1000) break
  }
  caborDb = Array.from(new Set(caborDb))
  console.log(`Cabor Kab. Bandung di sistem: ${caborDb.length}`)

  // Dibaca apa adanya: sel tanggal keluar sebagai nomor seri Excel, yang
  // diterjemahkan tanpa menyentuh zona waktu. cellDates justru menggeser
  // tanggalnya mundur sehari di zona Asia/Jakarta.
  const wb = XLSX.readFile(berkas)
  const ws = wb.Sheets['AKOMODASI']
  if (!ws) { console.error('Sheet AKOMODASI tidak ada.'); process.exit(1) }
  const baris = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: '' })

  let wilayah = '', tuanRumah = ''
  const keluar: any[] = []
  for (const r of baris) {
    const kol  = (i: number) => (typeof r[i] === 'number' ? r[i] : String(r[i] ?? '').trim())
    const teks = (i: number) => (typeof r[i] === 'number' ? '' : String(r[i] ?? '').trim())
    if (teks(2).toUpperCase().startsWith('WILAYAH')) { wilayah = teks(2); continue }
    if (teks(0) === 'No.') { tuanRumah = teks(2); continue }
    const nama = teks(3).replace(/\s+/g, ' ')
    if (!nama || !kol(2)) continue

    const upacara = nama.toUpperCase().includes('UPACARA')
    const rentang = kol(2)
    const m = typeof rentang === 'string'
      ? /^(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})$/.exec(rentang) : null
    const mulai   = tanggalJadwal(m ? m[1] : (rentang as any))
    const selesai = tanggalJadwal(m ? m[2] : (rentang as any))

    keluar.push({
      jenis: upacara ? 'upacara' : 'pertandingan',
      wilayah: wilayah || null, tuan_rumah: tuanRumah || null,
      cabor_disiplin: nama,
      cabor_nama_raw: upacara ? null : caborDariJadwal(nama, caborDb),
      mulai, selesai, venue: kol(4) || null,
      sumber: path.basename(berkas),
    })
  }

  const tanding = keluar.filter(k => k.jenis === 'pertandingan')
  const ketemu  = tanding.filter(k => k.cabor_nama_raw)
  console.log(`Baris jadwal   : ${keluar.length} (${tanding.length} pertandingan, ${keluar.length - tanding.length} upacara)`)
  console.log(`Tertaut ke cabor kita: ${ketemu.length} · tidak tertaut: ${tanding.length - ketemu.length}`)
  console.log(`Cabor kita yang punya jadwal: ${new Set(ketemu.map(k => k.cabor_nama_raw)).size} dari ${caborDb.length}`)

  const belumPunya = caborDb.filter(c => !ketemu.some(k => k.cabor_nama_raw === c))
  if (belumPunya.length) console.log(`\nCabor punya atlet TAPI tanpa jadwal: ${belumPunya.join(', ')}`)
  const takTertaut = tanding.filter(k => !k.cabor_nama_raw).map(k => k.cabor_disiplin)
  if (takTertaut.length) console.log(`\nJadwal yang bukan cabor kita (${takTertaut.length}): ${takTertaut.join(', ')}`)

  if (process.argv.includes('--simpan')) {
    const { error, count } = await sb.from('jadwal_cabor')
      .upsert(keluar, { onConflict: 'cabor_disiplin,mulai,venue', count: 'exact', ignoreDuplicates: false })
    if (error) { console.error('\nGagal simpan:', error.message); process.exit(1) }
    console.log(`\nTersimpan: ${count ?? keluar.length} baris.`)
  } else {
    console.log('\n(pratinjau saja — tambahkan --simpan untuk benar-benar menyimpan)')
  }
}
main()
