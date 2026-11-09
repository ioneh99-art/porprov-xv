// scripts/tarik-dayung-jabar.ts — tarik data Dayung se-Jawa Barat dari situs panitia PORPROV XV.
//
//   npx tsx scripts/tarik-dayung-jabar.ts           → baca & ringkas saja, tidak menulis
//   npx tsx scripts/tarik-dayung-jabar.ts --tulis   → simpan ke tabel dayung_jabar_*
//
// Urutan: daftar atlet Dayung (/atlet?cabor=9, semua halaman) → halaman tiap atlet
// (disiplin, medali, laga yang diikuti) → jadwal Dayung per hari → halaman tiap laga
// (peserta, peringkat, waktu, medali). Awak perahu dilengkapi dari halaman atlet,
// karena halaman laga hanya menulis 3 nama pertama.
// Jeda antar permintaan supaya tidak membebani situs panitia. Aman diulang.

import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { baku } from '../src/lib/konijabar'
import {
  CABOR_DAYUNG_SITUS, SITUS, TANGGAL_DAYUNG, bacaAtlet, bacaDaftarAtlet, bacaLagaDayung, bacaRefJadwal,
  cocokKontingen, klasemenDayung, type AtletDaftar, type AtletRinci, type LagaDayung,
} from '../src/lib/dayung-jabar'

const JEDA_MS = 450
const UA = 'Mozilla/5.0 (compatible; sinkron-dayung-jabar/1.0)'
const CABOR_DAYUNG_LOKAL = 147

function muatEnv() {
  if (!existsSync('.env.local')) return
  for (const b of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = b.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const tidur = (ms: number) => new Promise(r => setTimeout(r, ms))
let jumlahMinta = 0
async function ambil(path: string): Promise<string | null> {
  for (let coba = 1; coba <= 3; coba++) {
    await tidur(JEDA_MS)
    jumlahMinta++
    try {
      const r = await fetch(SITUS + path, { headers: { 'User-Agent': UA } })
      if (r.ok) return await r.text()
      if (r.status === 404) return null
    } catch { /* coba lagi */ }
    await tidur(1500 * coba)
  }
  console.log(`  ! gagal mengambil ${path}`)
  return null
}

function tanggalAntara(a: string, b: string): string[] {
  const hasil: string[] = []
  for (let d = new Date(a + 'T00:00:00Z'); d <= new Date(b + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) hasil.push(d.toISOString().slice(0, 10))
  return hasil
}

;(async () => {
  const tulis = process.argv.includes('--tulis')
  muatEnv()
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
  const mulai = new Date()

  // 1. Daftar atlet
  const daftar: AtletDaftar[] = []
  const hal1 = await ambil(`/atlet?cabor=${CABOR_DAYUNG_SITUS}`)
  if (!hal1) { console.log('✗ Daftar atlet tidak terbaca.'); process.exit(1) }
  const d1 = bacaDaftarAtlet(hal1)
  daftar.push(...d1.atlet)
  for (let hal = 2; hal <= (d1.halTotal ?? 1); hal++) {
    const h = await ambil(`/atlet?cabor=${CABOR_DAYUNG_SITUS}&hal=${hal}`)
    if (h) daftar.push(...bacaDaftarAtlet(h).atlet)
  }
  const unik = new Map(daftar.map(a => [a.situsId, a]))
  console.log(`1. Daftar atlet: ${unik.size} dari ${d1.total} (situs), ${d1.halTotal} halaman`)
  if (d1.total && unik.size !== d1.total) console.log(`  ! jumlah tidak sama dengan yang tertulis di situs`)

  // 2. Halaman tiap atlet
  const rinci = new Map<number, AtletRinci>()
  let n = 0
  for (const a of Array.from(unik.values())) {
    const h = await ambil(`/atlet/${a.slug}`)
    const r = h ? bacaAtlet(h) : null
    if (r) rinci.set(a.situsId, r)
    if (++n % 50 === 0) console.log(`   … ${n}/${unik.size} atlet`)
  }
  console.log(`2. Halaman atlet terbaca: ${rinci.size}/${unik.size}`)

  // 3. Laga: dari jadwal per hari + dari halaman atlet
  const refs = new Set<number>()
  for (const tgl of tanggalAntara(TANGGAL_DAYUNG.mulai, TANGGAL_DAYUNG.selesai)) {
    const h = await ambil(`/jadwal?tgl=${tgl}&cabor=${CABOR_DAYUNG_SITUS}`)
    if (h) bacaRefJadwal(h).forEach(r => refs.add(r))
  }
  rinci.forEach(r => r.lagaRefs.forEach(x => refs.add(x)))
  const laga: LagaDayung[] = []
  for (const ref of Array.from(refs).sort((a, b) => a - b)) {
    const h = await ambil(`/laga/${ref}`)
    const l = h ? bacaLagaDayung(h, ref) : null
    if (l) laga.push(l)
  }
  console.log(`3. Laga Dayung: ${laga.length} (selesai ${laga.filter(l => l.selesai).length})`)

  // 4. Lengkapi awak perahu: atlet yang halamannya menyebut laga ini dan kontingennya sama
  const atletPerLaga = new Map<number, number[]>()
  rinci.forEach((r, id) => r.lagaRefs.forEach(ref => atletPerLaga.set(ref, [...(atletPerLaga.get(ref) ?? []), id])))
  const namaAtlet = (id: number) => unik.get(id)?.nama ?? rinci.get(id)?.nama ?? String(id)
  const kontingenAtlet = (id: number) => unik.get(id)?.kontingen ?? rinci.get(id)?.kontingen ?? ''
  let awakTakLengkap = 0
  const peserta = laga.flatMap(l => l.peserta.map(p => {
    const ids = new Set<number>(p.atlet.map(x => x.situsId).filter((x): x is number => !!x))
    for (const id of atletPerLaga.get(l.ref) ?? []) if (baku(kontingenAtlet(id)) === baku(p.kontingen)) ids.add(id)
    const harap = p.atlet.length + p.atletLebih
    if (ids.size < harap) awakTakLengkap++
    const daftarId = Array.from(ids)
    return { laga: l, p, ids: daftarId, nama: daftarId.map(namaAtlet) }
  }))
  console.log(`4. Peserta (perahu): ${peserta.length}; awak belum lengkap: ${awakTakLengkap}`)

  // 5. Kontingen & tautan ke atlet lokal
  const { data: kont } = await db.from('kontingen').select('id, nama')
  const kontingen = kont ?? []
  const namaKont = new Set(Array.from(unik.values()).map(a => a.kontingen))
  const takCocok = Array.from(namaKont).filter(k => !cocokKontingen(k, kontingen))
  console.log(`5. Kontingen: ${namaKont.size}; tidak cocok dengan tabel kontingen: ${takCocok.length ? takCocok.join(', ') : '-'}`)
  const { data: lokal } = await db.from('atlet').select('id, nama_lengkap, kontingen_id').eq('cabor_id', CABOR_DAYUNG_LOKAL)
  const lokalPerKunci = new Map<string, number>()
  for (const a of lokal ?? []) lokalPerKunci.set(`${a.kontingen_id}|${baku(a.nama_lengkap)}`, a.id)

  const barisAtlet = Array.from(unik.values()).map(a => {
    const r = rinci.get(a.situsId)
    const kid = cocokKontingen(a.kontingen, kontingen)
    return {
      situs_id: a.situsId, slug: a.slug, nama: a.nama, kontingen: a.kontingen, kontingen_id: kid,
      gender: a.gender ?? r?.gender ?? null, disiplin: r?.disiplin ?? null,
      emas: r?.emas ?? 0, perak: r?.perak ?? 0, perunggu: r?.perunggu ?? 0,
      atlet_id: kid ? lokalPerKunci.get(`${kid}|${baku(a.nama)}`) ?? null : null,
      dibaca_at: new Date().toISOString(),
    }
  })
  const tertaut = barisAtlet.filter(a => a.atlet_id).length
  console.log(`   tertaut ke atlet lokal (nama + kontingen sama): ${tertaut}`)

  // Ringkasan
  const perDisiplin: Record<string, number> = {}
  barisAtlet.forEach(a => { perDisiplin[a.disiplin ?? '-'] = (perDisiplin[a.disiplin ?? '-'] ?? 0) + 1 })
  const perKontingen: Record<string, number> = {}
  barisAtlet.forEach(a => { perKontingen[a.kontingen] = (perKontingen[a.kontingen] ?? 0) + 1 })
  const klasemen = klasemenDayung(laga)
  console.log('   per disiplin:', perDisiplin)
  console.log('   per kontingen:', Object.entries(perKontingen).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '))
  console.log('   klasemen medali:', klasemen.slice(0, 8).map(r => `${r.kontingen} ${r.emas}/${r.perak}/${r.perunggu}`).join(' · '))
  console.log(`   permintaan ke situs: ${jumlahMinta}`)

  if (!tulis) { console.log('\n(uji saja — tambahkan --tulis untuk menyimpan)'); return }

  // 6. Tulis
  const potong = <T,>(xs: T[], k = 200) => Array.from({ length: Math.ceil(xs.length / k) }, (_, i) => xs.slice(i * k, i * k + k))
  for (const b of potong(barisAtlet)) {
    const { error } = await db.from('dayung_jabar_atlet').upsert(b, { onConflict: 'situs_id' })
    if (error) throw error
  }
  const barisLaga = laga.map(l => ({
    ref: l.ref, tanggal: l.tanggal, jam: l.jam, disiplin: l.disiplin, nomor: l.nomor, gender: l.gender,
    babak: l.babak, kode: l.kode, venue: l.venue, status: l.status, selesai: l.selesai,
    perebutan_medali: l.perebutanMedali, dibaca_at: new Date().toISOString(),
  }))
  for (const b of potong(barisLaga)) {
    const { error } = await db.from('dayung_jabar_laga').upsert(b, { onConflict: 'ref' })
    if (error) throw error
  }
  const refLaga = laga.map(l => l.ref)
  for (const b of potong(refLaga)) {
    const { error } = await db.from('dayung_jabar_peserta').delete().in('laga_ref', b)
    if (error) throw error
  }
  const barisPeserta = peserta.map(({ laga: l, p, ids, nama }) => ({
    laga_ref: l.ref, urutan: p.urutan, kontingen: p.kontingen, kontingen_id: cocokKontingen(p.kontingen, kontingen),
    peringkat: p.peringkat, medali: p.medali, waktu: p.waktu, waktu_detik: p.waktuDetik,
    atlet_situs_ids: ids, atlet_nama: nama,
  }))
  for (const b of potong(barisPeserta)) {
    const { error } = await db.from('dayung_jabar_peserta').insert(b)
    if (error) throw error
  }
  await db.from('dayung_jabar_sinkron').insert({
    mulai: mulai.toISOString(), selesai: new Date().toISOString(),
    ringkas: { atlet: barisAtlet.length, laga: laga.length, peserta: barisPeserta.length, tertaut, permintaan: jumlahMinta, kontingen_tak_cocok: takCocok },
  })
  console.log(`\n✓ Tersimpan: ${barisAtlet.length} atlet, ${laga.length} laga, ${barisPeserta.length} peserta.`)
})().catch(e => { console.error('✗', e?.message ?? e); process.exit(1) })
