// scripts/impor-klasifikasi.ts
// Memasukkan pemilahan cabor + raihan Babak Kualifikasi dari berkas pengurus.
//
// Dua sheet dibaca sekaligus dan saling melengkapi:
//   PER KATEGORI  → sifat pertandingan (Beladiri, Terukur, Penilaian,
//                   Permainan, Beregu). Judul kategori muncul di kolom
//                   pertama sebagai baris tersendiri.
//   PERPRIORITAS  → tingkat prioritas 1-4. Penanda kelompoknya justru muncul
//                   SESUDAH anggotanya, diikuti baris JUMLAH — jadi
//                   kelompoknya ditutup di baris JUMLAH, bukan dibuka.

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { caborDariKlasifikasi } from '../src/lib/jadwal'
import * as fs from 'fs'
import * as path from 'path'

const berkas = process.argv[2]
if (!berkas) { console.error('Sebutkan berkasnya.'); process.exit(1) }
const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const ambil = (k: string) =>
  env.split('\n').find(l => l.startsWith(k + '='))?.slice(k.length + 1).replace(/["\r]/g, '').trim() ?? ''
const sb = createClient(ambil('NEXT_PUBLIC_SUPABASE_URL'), ambil('SUPABASE_SERVICE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const KATEGORI = ['BELADIRI', 'PENILAIAN', 'TERUKUR', 'PERMAINAN', 'BEREGU']

/** Cabor yang tidak tercantum di sheet PER KATEGORI, kategorinya ditetapkan
 *  pengelola. Tanpa ini, impor ulang akan mengosongkannya lagi dan 67 atlet
 *  kembali jatuh ke keranjang "belum berkategori". */
const KATEGORI_PENGELOLA: Record<string, string> = {
  'Bola Basket': 'BEREGU',
  'Rugby':       'BEREGU',
}
const angka = (v: any) => (typeof v === 'number' ? v : Number(String(v ?? '').trim()) || 0)

async function main() {
  let caborDb: string[] = []
  for (let p = 0; ; p++) {
    const { data } = await sb.from('atlet').select('cabor_nama_raw')
      .eq('kontingen_id', 4).range(p * 1000, (p + 1) * 1000 - 1)
    if (!data?.length) break
    caborDb = caborDb.concat(data.map(r => (r.cabor_nama_raw ?? '').trim()).filter(Boolean))
    if (data.length < 1000) break
  }
  caborDb = Array.from(new Set(caborDb))

  const wb = XLSX.readFile(berkas)
  const sel = (nm: string) => XLSX.utils.sheet_to_json<any[]>(wb.Sheets[nm], { header: 1, raw: true, defval: '' })

  // ── PER KATEGORI ──
  // Kuncinya nama cabor HASIL TERJEMAHAN, bukan tulisan mentahnya: kedua sheet
  // mengeja hal yang sama dengan cara berbeda — "KICK BOXING" vs "KICKBOXING",
  // "PACU" vs "BERKUDA PACU", "eSPORT" vs "E SPORT". Dikunci mentah, 25 cabor
  // kehilangan kategorinya tanpa alasan yang sebenarnya.
  const kategoriPer = new Map<string, string>()
  let kat = ''
  for (const r of sel('PER KATEGORI')) {
    const k0 = String(r[0] ?? '').trim().toUpperCase()
    if (KATEGORI.includes(k0)) { kat = k0; continue }
    if (k0 === 'JUMLAH' || k0 === 'TOTAL' || k0.startsWith('NOTE')) continue
    const nama = String(r[1] ?? '').trim()
    if (!nama || !kat) continue
    const kunci = caborDariKlasifikasi(nama, caborDb) ?? nama.toUpperCase()
    if (!kategoriPer.has(kunci)) kategoriPer.set(kunci, kat)
  }

  // ── PERPRIORITAS ──
  const baris: any[] = []
  let kumpulan: any[] = []
  let tingkat = 1
  for (const r of sel('PERPRIORITAS')) {
    const k0 = String(r[0] ?? '').trim().toUpperCase()
    if (k0.startsWith('PRIORITAS')) continue          // penanda, angkanya tidak dipakai
    if (k0 === 'JUMLAH') {                            // kelompok DITUTUP di sini
      kumpulan.forEach(x => x.prioritas = tingkat)
      baris.push(...kumpulan); kumpulan = []; tingkat++
      continue
    }
    if (k0.startsWith('TOTAL') || k0.startsWith('PELUANG')) break
    const nama = String(r[1] ?? '').trim()
    if (!nama || nama.toUpperCase() === 'NAMA CABOR') continue
    const terjemah = caborDariKlasifikasi(nama, caborDb)
    kumpulan.push({
      cabor_berkas: nama,
      cabor_nama_raw: terjemah,
      kategori: null as string | null,   // diisi di bawah, setelah namanya diterjemahkan
      bk_emas: angka(r[2]), bk_perak: angka(r[3]), bk_perunggu: angka(r[4]),
      keterangan: String(r[6] ?? '').trim() || null,
      sumber: path.basename(berkas),
    })
  }
  if (kumpulan.length) { kumpulan.forEach(x => x.prioritas = tingkat); baris.push(...kumpulan) }

  baris.forEach(b => {
    b.kategori = kategoriPer.get(b.cabor_nama_raw ?? '')
      ?? kategoriPer.get(b.cabor_berkas.toUpperCase())
      ?? KATEGORI_PENGELOLA[b.cabor_nama_raw ?? ''] ?? null
    if (!kategoriPer.has(b.cabor_nama_raw ?? '') && KATEGORI_PENGELOLA[b.cabor_nama_raw ?? '']) {
      b.keterangan = [b.keterangan, `Kategori ${b.kategori} ditetapkan pengelola; cabor ini tidak tercantum di sheet PER KATEGORI berkas pengurus.`]
        .filter(Boolean).join(' ')
    }
  })

  const ketemu = baris.filter(b => b.cabor_nama_raw)
  const berkategori = baris.filter(b => b.kategori)
  console.log(`Baris klasifikasi   : ${baris.length}`)
  console.log(`Tertaut ke cabor kita: ${ketemu.length} · unik: ${new Set(ketemu.map(b => b.cabor_nama_raw)).size}`)
  console.log(`Dapat kategori       : ${berkategori.length}`)
  const perTingkat: Record<number, number> = {}
  baris.forEach(b => { perTingkat[b.prioritas] = (perTingkat[b.prioritas] ?? 0) + 1 })
  console.log('Sebaran prioritas    :', perTingkat)
  const emas = baris.reduce((n, b) => n + b.bk_emas, 0)
  const perak = baris.reduce((n, b) => n + b.bk_perak, 0)
  const perunggu = baris.reduce((n, b) => n + b.bk_perunggu, 0)
  console.log(`Total medali BK      : ${emas} emas · ${perak} perak · ${perunggu} perunggu  (berkas menyebut 78/73/112)`)

  const gagal = baris.filter(b => !b.cabor_nama_raw).map(b => b.cabor_berkas)
  if (gagal.length) console.log(`\nBelum tertaut (${gagal.length}): ${gagal.join(', ')}`)
  const tanpaKat = baris.filter(b => !b.kategori).map(b => b.cabor_berkas)
  if (tanpaKat.length) console.log(`\nTanpa kategori (${tanpaKat.length}): ${tanpaKat.join(', ')}`)

  if (process.argv.includes('--simpan')) {
    const { error } = await sb.from('klasifikasi_cabor')
      .upsert(baris, { onConflict: 'cabor_berkas,kategori' })
    if (error) { console.error('\nGagal simpan:', error.message); process.exit(1) }
    console.log(`\nTersimpan: ${baris.length} baris.`)
  } else {
    console.log('\n(pratinjau saja — tambahkan --simpan)')
  }
}
main()
