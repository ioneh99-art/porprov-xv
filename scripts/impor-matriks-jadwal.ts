// scripts/impor-matriks-jadwal.ts
// Memperbarui jadwal_cabor dari berkas "Matriks Jadwal Harian" KONI Kab. Bandung
// (sheet "Matrix Jadwal Harian": satu baris per tanggal × kegiatan × venue).
//
//   npx tsx scripts/impor-matriks-jadwal.ts "<berkas.xlsx>"            → pratinjau
//   npx tsx scripts/impor-matriks-jadwal.ts "<berkas.xlsx>" --simpan   → menyimpan
//
// BUKAN impor ulang dari nol. Baris yang ada diperbarui di tempat (lewat id),
// supaya akomodasi dan kontak panitia yang sudah ditempelkan impor lain tidak
// hilang. Yang diubah hanya: tanggal mulai/selesai, venue, dan — bila kotanya
// memang pindah — tuan rumah. Baris yang tidak ada di matriks dibiarkan.

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { caborDariKlasifikasi, tanggalJadwal } from '../src/lib/jadwal'
import * as fs from 'fs'
import * as path from 'path'

const berkas = process.argv[2]
if (!berkas) { console.error('Sebutkan berkasnya.'); process.exit(1) }
const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const ambil = (k: string) =>
  env.split('\n').find(l => l.startsWith(k + '='))?.slice(k.length + 1).replace(/["\r]/g, '').trim() ?? ''
const sb = createClient(ambil('NEXT_PUBLIC_SUPABASE_URL'), ambil('SUPABASE_SERVICE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const norm = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
const rapi = (s: any) => String(s ?? '').replace(/\s+/g, ' ').trim()
/** Sel venue kadang berisi beberapa tempat, satu per baris. Barisnya dijadikan " / " supaya tidak menyatu. */
const rapiVenue = (s: any) => String(s ?? '').split(/\r?\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' / ')
/** "KOTA DEPOK" dan "DEPOK" adalah kota yang sama; yang dibandingkan intinya. */
const kotaInti = (s: string | null) => norm(s ?? '').replace(/^(KOTA|KAB|KABUPATEN)\s+/, '')

/**
 * Nama kegiatan di matriks → nama baris yang sudah ada di sistem, untuk yang
 * penulisannya berbeda. Beberapa kegiatan matriks bisa menunjuk satu baris
 * (BMX Park/Trial/Flat Land; X Rugby dan Rugby 7s) — rentangnya digabung.
 */
const PADANAN: Record<string, string> = {
  'RENANG':                       'Aquatic - Renang',
  'SEPEDA BMX PARK':              'Balap Sepeda BMX - Freestyle Park, Flat Land, Trial',
  'SEPEDA BMX TRIAL':             'Balap Sepeda BMX - Freestyle Park, Flat Land, Trial',
  'SEPEDA BMX FLAT LAND':         'Balap Sepeda BMX - Freestyle Park, Flat Land, Trial',
  'BMX RACING':                   'Balap Sepeda BMX - Racing',
  'SEPEDA ROAD RACE':             'Balap Sepeda Road',
  'SEPEDA MTB':                   'Balap Sepeda MTB',
  'AEROMODELING':                 'Aerosport - Aeromodeling',
  'EQUESTRIAN DRESSAGE':          'Berkuda Dressage',
  // Nama Dayung sejak berkas 21 Okt 2026. Barisnya dipertahankan (id, akomodasi);
  // namanya diganti terpisah supaya sama dengan tulisan KONI.
  'CANOEING SPRINT SUP':          'Canoeing',
  'ROWING CLASSIC':               'Rowing',
  'ROWING BEACH COASTAL':         'Rowing - Beach',
  'RENANG PERAIRAN TERBUKA OWS':  'Akuatik - Renang Perairan Terbuka',
  'RENANG ARTISTIK':              'Akuatik - Renang Artistik',
  'SKATEBOARD':                   'Sakteboard',
  'X RUGBY':                      'Rugby',
  'RUGBY 7 S':                    'Rugby',
  'UPACARA PEMBUKAAN':            'UPACARA PEMBUKAAN PORPROV XV 2026',
  'UPACARA PENUTUPAN':            'UPACARA PENUTUPAN PORPROV XV 2026',
}

const tgl = (iso: string) => `${Number(iso.slice(8))} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][Number(iso.slice(5, 7)) - 1]}`

async function main() {
  const wb = XLSX.readFile(berkas)
  const ws = wb.Sheets['Matrix Jadwal Harian']
  if (!ws) { console.error('Sheet "Matrix Jadwal Harian" tidak ada.'); process.exit(1) }
  // raw: sel tanggal keluar sebagai nomor seri Excel — lihat catatan di tanggalJadwal().
  const baris = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: '' })
  const iKepala = baris.findIndex(r => rapi(r[1]) === 'Tanggal' && rapi(r[5]).startsWith('Cabor'))
  if (iKepala < 0) { console.error('Baris kepala (No., Tanggal, …, Cabor / Kegiatan) tidak ketemu.'); process.exit(1) }

  type Keg = { nama: string; tanggal: Set<string>; venue: Set<string>; kota: Set<string>; klaster: Set<string> }
  const keg = new Map<string, Keg>()
  let terbaca = 0
  for (const r of baris.slice(iKepala + 1)) {
    const nama = rapi(r[5]); const t = tanggalJadwal(r[1])
    if (!nama || !t) continue
    terbaca++
    const k = keg.get(norm(nama)) ?? { nama, tanggal: new Set(), venue: new Set(), kota: new Set(), klaster: new Set() }
    k.tanggal.add(t); if (rapiVenue(r[10])) k.venue.add(rapiVenue(r[10])); if (rapi(r[4])) k.kota.add(rapi(r[4])); if (rapi(r[3])) k.klaster.add(rapi(r[3]))
    keg.set(norm(nama), k)
  }
  console.log(`Matriks      : ${terbaca} baris harian, ${keg.size} kegiatan`)

  const { data: lama, error } = await sb.from('jadwal_cabor').select('*').order('id')
  if (error) { console.error(error.message); process.exit(1) }
  const perNama = new Map((lama ?? []).map((l: any) => [norm(l.cabor_disiplin), l]))
  console.log(`Di sistem    : ${lama?.length ?? 0} baris`)

  // Kelompokkan kegiatan matriks per baris tujuan.
  const tujuan = new Map<number, Keg[]>()
  const baru: Keg[] = []
  keg.forEach((k, kunci) => {
    const sasaran = perNama.get(kunci) ?? (PADANAN[kunci] ? perNama.get(norm(PADANAN[kunci])) : undefined)
    if (!sasaran) { baru.push(k); return }
    tujuan.set(sasaran.id, [...(tujuan.get(sasaran.id) ?? []), k])
  })

  const ubah: { id: number; nama: string; isi: Record<string, any>; ket: string[] }[] = []
  let sama = 0
  tujuan.forEach((ks, id) => {
    const l = (lama ?? []).find((x: any) => x.id === id)!
    const semuaTgl = ks.flatMap(k => Array.from(k.tanggal)).sort()
    const mulai = semuaTgl[0], selesai = semuaTgl[semuaTgl.length - 1]
    const venue = Array.from(new Set(ks.flatMap(k => Array.from(k.venue)))).join(' | ')
    const kota = Array.from(new Set(ks.flatMap(k => Array.from(k.kota))))
    const klaster = Array.from(new Set(ks.flatMap(k => Array.from(k.klaster))))
    const isi: Record<string, any> = {}; const ket: string[] = []
    if (l.mulai !== mulai || l.selesai !== selesai) {
      isi.mulai = mulai; isi.selesai = selesai
      ket.push(`tanggal ${l.mulai ? tgl(l.mulai) : '?'}–${l.selesai ? tgl(l.selesai) : '?'} → ${tgl(mulai)}–${tgl(selesai)}`)
    }
    // Venue dianggap sama bila tulisan lama memuat tulisan baru atau sebaliknya
    // ("Situ Cipule KAB. KARAWANG" vs "Situ Cipule") — imbuhan kota bukan perubahan.
    const vl = norm(l.venue ?? ''), vb = norm(venue)
    if (venue && !(vl === vb || (vl && vb && (vl.includes(vb) || vb.includes(vl))))) {
      isi.venue = venue; ket.push(`venue "${rapi(l.venue)}" → "${venue}"`)
    }
    if (kota.length === 1 && kotaInti(l.tuan_rumah) !== kotaInti(kota[0])) {
      isi.tuan_rumah = kota[0]; if (klaster.length === 1) isi.wilayah = klaster[0]
      // Kota menginap yang lama tidak berlaku lagi bila pertandingannya pindah kota.
      if (l.akomodasi) isi.akomodasi = null
      ket.push(`kota ${l.tuan_rumah ?? '(kosong)'} → ${kota[0]}${l.akomodasi ? ` (akomodasi "${l.akomodasi}" dikosongkan)` : ''}`)
    }
    if (ks.length > 1 && new Set(ks.map(k => Array.from(k.tanggal).sort().join())).size > 1) {
      const rinci = ks.map(k => { const t = Array.from(k.tanggal).sort(); return `${k.nama} ${tgl(t[0])}–${tgl(t[t.length - 1])}` }).join('; ')
      if (l.catatan !== rinci) { isi.catatan = rinci; ket.push(`rincian: ${rinci}`) }
    }
    if (Object.keys(isi).length === 0) { sama++; return }
    isi.sumber = path.basename(berkas)
    ubah.push({ id, nama: l.cabor_disiplin, isi, ket })
  })

  // Daftar cabor kontingen, untuk menautkan baris baru.
  let caborDb: string[] = []
  for (let p = 0; ; p++) {
    const { data } = await sb.from('atlet').select('cabor_nama_raw').eq('kontingen_id', 4).range(p * 1000, (p + 1) * 1000 - 1)
    if (!data?.length) break
    caborDb = caborDb.concat(data.map(r => (r.cabor_nama_raw ?? '').trim()).filter(Boolean))
    if (data.length < 1000) break
  }
  caborDb = Array.from(new Set(caborDb))
  const tambah = baru.map(k => {
    const t = Array.from(k.tanggal).sort()
    return {
      jenis: /UPACARA/i.test(k.nama) ? 'upacara' : 'pertandingan',
      wilayah: Array.from(k.klaster)[0] ?? null, tuan_rumah: Array.from(k.kota)[0] ?? null,
      cabor_disiplin: k.nama, cabor_nama_raw: caborDariKlasifikasi(k.nama, caborDb),
      mulai: t[0], selesai: t[t.length - 1], venue: Array.from(k.venue).join(' | ') || null, sumber: path.basename(berkas),
    }
  })
  const takDiMatriks = (lama ?? []).filter((l: any) => !tujuan.has(l.id))

  console.log(`\nTidak berubah: ${sama}`)
  console.log(`\nDIPERBARUI (${ubah.length}):`)
  ubah.forEach(u => console.log(`   ${u.nama}\n      ${u.ket.join('\n      ')}`))
  console.log(`\nDITAMBAH (${tambah.length}):`)
  tambah.forEach(t => console.log(`   ${t.cabor_disiplin} · ${tgl(t.mulai)}–${tgl(t.selesai)} · ${t.tuan_rumah} · ${t.venue} → cabor ${t.cabor_nama_raw ?? '(tidak tertaut)'}`))
  console.log(`\nADA DI SISTEM, TIDAK ADA DI MATRIKS — dibiarkan (${takDiMatriks.length}):`)
  takDiMatriks.forEach((l: any) => console.log(`   ${l.cabor_disiplin} · ${l.mulai ? tgl(l.mulai) : '?'}–${l.selesai ? tgl(l.selesai) : '?'} · cabor ${l.cabor_nama_raw ?? '(tidak tertaut)'}`))

  if (!process.argv.includes('--simpan')) { console.log('\n(pratinjau saja — tambahkan --simpan untuk benar-benar menyimpan)'); return }

  const cadangan = path.join(process.cwd(), `_backup_jadwal_cabor_${new Date().toISOString().slice(0, 10)}.json`)
  if (!fs.existsSync(cadangan)) fs.writeFileSync(cadangan, JSON.stringify(lama, null, 1))
  console.log(`\nCadangan baris lama: ${path.basename(cadangan)}`)
  for (const u of ubah) {
    const { error: e } = await sb.from('jadwal_cabor').update({ ...u.isi, updated_at: new Date().toISOString() }).eq('id', u.id)
    if (e) { console.error(`Gagal memperbarui ${u.nama}: ${e.message}`); process.exit(1) }
  }
  if (tambah.length) {
    const { error: e } = await sb.from('jadwal_cabor').insert(tambah)
    if (e) { console.error(`Gagal menambah: ${e.message}`); process.exit(1) }
  }
  console.log(`Tersimpan: ${ubah.length} diperbarui, ${tambah.length} ditambah.`)
}
main()
