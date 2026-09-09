// scripts/impor-panpel.ts
// Kontak panitia pelaksana per cabor, dari berkas panitia provinsi.
// Sheet "Panpel": kolom pengurus cabang dan nomor urut hanya diisi pada baris
// pertama tiap kelompok, jadi nilainya harus dibawa turun ke baris berikutnya.

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

/** Nomor HP di berkas kehilangan angka nol depannya karena tersimpan sebagai
 *  angka. "81357771973" sebenarnya "081357771973". */
function rapikanHp(v: any): string | null {
  const s = String(v ?? '').replace(/[^0-9+]/g, '')
  if (!s) return null
  if (s.startsWith('+')) return s
  if (s.startsWith('62')) return '0' + s.slice(2)
  return s.startsWith('0') ? s : '0' + s
}

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
  const baris = XLSX.utils.sheet_to_json<any[]>(wb.Sheets['Panpel'], { header: 1, raw: true, defval: '' })

  let pengurus = ''
  const keluar: any[] = []
  for (let i = 2; i < baris.length; i++) {
    const r = baris[i] ?? []
    const t = (n: number) => String(r[n] ?? '').trim()
    if (t(1)) pengurus = t(1)          // dibawa turun ke baris berikutnya
    const disiplin = t(3)
    if (!disiplin || disiplin.toLowerCase().startsWith('cabang')) continue
    keluar.push({
      pengurus_cabang: pengurus || null,
      cabor_disiplin: disiplin,
      cabor_nama_raw: caborDariKlasifikasi(disiplin, caborDb),
      td_nama: t(4) || null,          td_hp: rapikanHp(r[5]),
      ketua_nama: t(6) || null,       ketua_assignment: t(7) || null, ketua_hp: rapikanHp(r[8]),
      sekretaris_nama: t(9) || null,  sekretaris_hp: rapikanHp(r[10]),
      bendahara_nama: t(11) || null,  bendahara_hp: rapikanHp(r[12]),
      sumber: path.basename(berkas),
    })
  }

  // Baris kembar dalam berkas itu sendiri — kunci uniknya nama disiplin.
  const unik = new Map<string, any>()
  keluar.forEach(k => { if (!unik.has(k.cabor_disiplin)) unik.set(k.cabor_disiplin, k) })
  const akhir = Array.from(unik.values())

  const ketemu = akhir.filter(k => k.cabor_nama_raw)
  console.log(`Baris panpel   : ${akhir.length} (dari ${keluar.length} sebelum saring kembar)`)
  console.log(`Tertaut cabor kita: ${ketemu.length} · cabor unik: ${new Set(ketemu.map(k => k.cabor_nama_raw)).size}`)
  console.log(`Punya nomor TD    : ${akhir.filter(k => k.td_hp).length}`)
  console.log(`Punya nomor Ketua : ${akhir.filter(k => k.ketua_hp).length}`)
  const tak = akhir.filter(k => !k.cabor_nama_raw).map(k => k.cabor_disiplin)
  if (tak.length) console.log(`\nBukan cabor kita (${tak.length}): ${tak.join(', ')}`)

  if (process.argv.includes('--simpan')) {
    const { error } = await sb.from('kontak_panpel').upsert(akhir, { onConflict: 'cabor_disiplin' })
    if (error) { console.error('Gagal simpan:', error.message); process.exit(1) }
    console.log(`\nTersimpan: ${akhir.length} baris.`)
  } else console.log('\n(pratinjau saja — tambahkan --simpan)')
}
main()
