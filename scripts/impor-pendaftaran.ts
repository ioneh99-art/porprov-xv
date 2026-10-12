// scripts/impor-pendaftaran.ts
// Memasukkan ekspor klasifikasi_verified panitia (daftar resmi atlet per nomor)
// ke tabel pendaftaran_nomor.
//
//   npx tsx scripts/impor-pendaftaran.ts "<berkas.xlsx>"            → pratinjau
//   npx tsx scripts/impor-pendaftaran.ts "<berkas.xlsx>" --simpan   → menyimpan
//
// NIK di berkas hanya dipakai di memori untuk menemukan atlet_id. Tidak
// dicetak, tidak disimpan ke tabel tujuan.
//
// Impor bersifat MENGGANTI: seluruh baris kontingen yang sama dihapus dulu,
// lalu diisi dari berkas. Berkas ini potret lengkap pendaftaran, jadi baris
// lama yang tidak ada di berkas baru memang sudah tidak berlaku.

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { jkNomor, penandaNomor, petaCaborBerkas, rapikan, uraiAtlet } from '../src/lib/pendaftaran'
import * as fs from 'fs'
import * as path from 'path'

const berkas = process.argv[2]
if (!berkas) { console.error('Sebutkan berkasnya.'); process.exit(1) }
const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const ambil = (k: string) =>
  env.split('\n').find(l => l.startsWith(k + '='))?.slice(k.length + 1).replace(/["\r]/g, '').trim() ?? ''
const sb = createClient(ambil('NEXT_PUBLIC_SUPABASE_URL'), ambil('SUPABASE_SERVICE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

async function semua<T>(buat: (dari: number, sampai: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const hasil: T[] = []
  for (let dari = 0; ; dari += 1000) {
    const { data, error } = await buat(dari, dari + 999)
    if (error) throw new Error(error.message)
    hasil.push(...(data ?? []))
    if (!data || data.length < 1000) return hasil
  }
}

async function main() {
  const wb = XLSX.readFile(berkas)
  const ws = wb.Sheets['Export'] ?? wb.Sheets[wb.SheetNames[0]]
  const baris = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, defval: '' })
  const kepala = (baris[0] ?? []).map(rapikan)
  const wajib = ['Cabor', 'Nomor Pertandingan', 'Disiplin', 'Kontingen', 'Atlet']
  if (wajib.some((k, i) => kepala[i] !== k)) { console.error(`Kepala kolom tidak dikenali: ${kepala.join(' | ')}`); process.exit(1) }

  type Baris = { cabor: string; nomor: string; disiplin: string; kontingen: string; nama: string; jk: 'L' | 'P'; nik: string }
  const isi: Baris[] = []
  const gagalBaca: number[] = []
  baris.slice(1).forEach((r, i) => {
    if (!r.some((c: any) => rapikan(c))) return
    const a = uraiAtlet(r[4])
    if (!a || !rapikan(r[0]) || !rapikan(r[1]) || !rapikan(r[2])) { gagalBaca.push(i + 2); return }
    isi.push({ cabor: rapikan(r[0]), nomor: rapikan(r[1]), disiplin: rapikan(r[2]), kontingen: rapikan(r[3]), nama: a.nama, jk: a.jk, nik: a.nik })
  })
  console.log(`Baris terbaca       : ${isi.length}${gagalBaca.length ? ` · GAGAL dibaca di baris ${gagalBaca.slice(0, 10).join(', ')}` : ''}`)
  if (gagalBaca.length) { console.error('Ada baris yang tidak terbaca. Dihentikan supaya tidak ada pendaftaran yang hilang diam-diam.'); process.exit(1) }

  // Satu berkas = satu kontingen.
  const namaKontingen = Array.from(new Set(isi.map(b => b.kontingen)))
  if (namaKontingen.length !== 1) { console.error(`Berkas memuat ${namaKontingen.length} kontingen: ${namaKontingen.join(', ')}`); process.exit(1) }
  const { data: kontingen } = await sb.from('kontingen').select('id,nama').ilike('nama', namaKontingen[0]).maybeSingle()
  if (!kontingen) { console.error(`Kontingen "${namaKontingen[0]}" tidak ada di sistem.`); process.exit(1) }
  console.log(`Kontingen           : ${kontingen.nama} (id ${kontingen.id})`)

  const atlet = await semua<any>((d, s) => sb.from('atlet').select('id,nama_lengkap,cabor_id,gender,no_ktp')
    .eq('kontingen_id', kontingen.id).order('id').range(d, s))
  const perNik = new Map<string, any>()
  for (const a of atlet) if (a.no_ktp) perNik.set(String(a.no_ktp).trim(), a)

  const peta = petaCaborBerkas(isi.map(b => ({ cabor_berkas: b.cabor, disiplin: b.disiplin, cabor_id: perNik.get(b.nik)?.cabor_id ?? null })))
  const { data: cabor } = await sb.from('cabang_olahraga').select('id,nama')
  const namaCabor = new Map((cabor ?? []).map((c: any) => [c.id, c.nama]))

  const keluar: any[] = []
  const tanpaCabor = new Set<string>(), caborNyasar: string[] = [], jkTakCocok: string[] = []
  const kunciBaris = new Set<string>()
  let kembar = 0
  for (const b of isi) {
    const cabor_id = peta.get(`${b.cabor}|${b.disiplin}`)
    if (cabor_id == null) { tanpaCabor.add(`${b.cabor} / ${b.disiplin}`); continue }
    const a = perNik.get(b.nik)
    if (a && a.cabor_id !== cabor_id) caborNyasar.push(`${b.nama}: berkas ${b.disiplin}, sistem ${namaCabor.get(a.cabor_id)}`)
    const penanda = penandaNomor(b.nomor)
    const wajibJk = jkNomor(penanda)
    if (wajibJk && wajibJk !== b.jk) jkTakCocok.push(`${b.nama} (${b.jk}) di ${b.nomor}`)
    const kunci = `${b.disiplin}|${b.nomor}|${b.nama}|${a?.id ?? 0}`
    if (kunciBaris.has(kunci)) { kembar++; continue }
    kunciBaris.add(kunci)
    keluar.push({
      kontingen_id: kontingen.id, cabor_id, cabor_berkas: b.cabor, disiplin: b.disiplin, nomor: b.nomor, penanda,
      atlet_id: a?.id ?? null, nama_berkas: b.nama, jk_berkas: b.jk, sumber: path.basename(berkas),
    })
  }

  const nikUnik = new Set(isi.map(b => b.nik))
  const ketemu = Array.from(nikUnik).filter(n => perNik.has(n)).length
  console.log(`Atlet di berkas     : ${nikUnik.size} · ada di sistem ${ketemu} · belum ada ${nikUnik.size - ketemu}`)
  console.log(`Cabor/disiplin/nomor: ${new Set(isi.map(b => b.cabor)).size} / ${new Set(isi.map(b => b.disiplin)).size} / ${new Set(isi.map(b => b.disiplin + '|' + b.nomor)).size}`)
  console.log(`Siap disimpan       : ${keluar.length} baris · tertaut ke atlet ${keluar.filter(k => k.atlet_id).length} · tanpa tautan ${keluar.filter(k => !k.atlet_id).length} · kembar dilewati ${kembar}`)
  console.log(`Cabor sistem terisi : ${new Set(keluar.map(k => k.cabor_id)).size}`)
  if (tanpaCabor.size) console.log(`\nTIDAK DISIMPAN — disiplin tanpa satu pun atlet yang dikenal sistem, jadi cabornya tak bisa ditentukan:\n   ${Array.from(tanpaCabor).join('\n   ')}`)
  if (caborNyasar.length) console.log(`\nAtlet yang cabornya di sistem berbeda dari disiplin di berkas (${caborNyasar.length}):\n   ${caborNyasar.slice(0, 15).join('\n   ')}`)
  if (jkTakCocok.length) console.log(`\nJenis kelamin tidak cocok dengan nomornya (${jkTakCocok.length}):\n   ${jkTakCocok.join('\n   ')}`)

  if (!process.argv.includes('--simpan')) { console.log('\n(pratinjau saja — tambahkan --simpan untuk benar-benar menyimpan)'); return }

  const { error: gagalHapus, count: terhapus } = await sb.from('pendaftaran_nomor').delete({ count: 'exact' }).eq('kontingen_id', kontingen.id)
  if (gagalHapus) { console.error('\nGagal mengosongkan data lama:', gagalHapus.message); process.exit(1) }
  for (let i = 0; i < keluar.length; i += 500) {
    const { error } = await sb.from('pendaftaran_nomor').insert(keluar.slice(i, i + 500))
    if (error) { console.error(`\nGagal simpan di baris ${i}:`, error.message); process.exit(1) }
  }
  console.log(`\nTersimpan: ${keluar.length} baris (menggantikan ${terhapus ?? 0} baris lama).`)
}
main()
