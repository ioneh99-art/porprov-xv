// scripts/olah-arsip-konijabar.ts — olah arsip halaman situs panitia PORPROV XV menjadi
// tabel porprov15_* (kontingen, venue, cabor, disiplin, nomor, medali, atlet, laga, peserta).
//
//   npx tsx scripts/olah-arsip-konijabar.ts [tanggal-arsip]            → baca & periksa saja
//   npx tsx scripts/olah-arsip-konijabar.ts [tanggal-arsip] --tulis    → simpan ke database
//
// Sumber: data/arsip-konijabar/<tanggal>/ (dibuat scripts/arsip-konijabar.ts). Tidak menghubungi situs.
// Pemeriksaan silang: medali per kontingen hasil olahan podium vs klasemen resmi halaman awal.
// Aman diulang (upsert; medali & peserta laga diganti per nomor/laga).

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { gunzipSync } from 'zlib'
import { createClient } from '@supabase/supabase-js'
import { baku, cocokCabor } from '../src/lib/konijabar'
import {
  bacaAtletPenuh, bacaCabor, bacaDaftarCabor, bacaDaftarKontingen, bacaKlasemenMedali, bacaKontingen,
  bacaLagaPenuh, bacaNomor, bacaRingkasanAcara, bacaVenue, genderDari, idAkhir,
  type AtletRinci, type LagaRinci, type NomorRinci, type CaborRinci,
} from '../src/lib/arsip-konijabar'

function muatEnv() {
  if (!existsSync('.env.local')) return
  for (const b of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = b.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const argTanggal = process.argv.slice(2).find(a => /^\d{4}-\d{2}-\d{2}$/.test(a))
const tulis = process.argv.includes('--tulis')
const akarArsip = join('data', 'arsip-konijabar')
const tanggal = argTanggal ?? readdirSync(akarArsip).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().pop()!
const AKAR = join(akarArsip, tanggal)

const baca = (rel: string) => { const f = join(AKAR, rel); return existsSync(f) ? gunzipSync(readFileSync(f)).toString('utf8') : null }
const daftarBerkas = (dir: string) => existsSync(join(AKAR, dir)) ? readdirSync(join(AKAR, dir)).filter(f => f.endsWith('.html.gz') && f !== 'index.html.gz') : []
const potong = <T,>(xs: T[], k = 500) => Array.from({ length: Math.ceil(xs.length / k) }, (_, i) => xs.slice(i * k, i * k + k))

;(async () => {
  muatEnv()
  const mulai = new Date()
  console.log(`Arsip ${tanggal} (${AKAR})`)

  // 1. Klasemen & ringkasan acara (halaman awal)
  const awal = baca('index.html.gz') ?? ''
  const klasemen = bacaKlasemenMedali(awal)
  const ringkas = bacaRingkasanAcara(awal)
  console.log(`1. Klasemen: ${klasemen.length} kontingen · nomor berjuara ${ringkas.nomorBerjuara}/${ringkas.nomorTotal} · medali ${ringkas.emas}/${ringkas.perak}/${ringkas.perunggu}`)

  // 2. Kontingen
  const daftarK = bacaDaftarKontingen(baca('kontingen/index.html.gz') ?? '')
  const kontingen = new Map<number, any>()
  for (const k of daftarK) {
    const r = bacaKontingen(baca(`kontingen/${k.slug}.html.gz`) ?? '')
    const t = klasemen.find(x => x.slug === k.slug)
    const id = k.situsId ?? r?.situsId ?? t?.situsId
    if (!id) { console.log(`  ! kontingen tanpa id: ${k.slug}`); continue }
    kontingen.set(id, {
      situs_id: id, slug: k.slug, nama: k.nama, peringkat: t?.peringkat ?? r?.peringkat ?? k.peringkat,
      emas: t?.emas ?? r?.emas ?? 0, perak: t?.perak ?? r?.perak ?? 0, perunggu: t?.perunggu ?? r?.perunggu ?? 0,
      total: t?.total ?? 0, jumlah_atlet: r?.atlet ?? null, jumlah_laga: r?.laga ?? null, jumlah_menang: r?.menang ?? null,
    })
  }
  const kontingenPerSlug = new Map(Array.from(kontingen.values()).map(k => [k.slug, k.situs_id as number]))
  const kontingenPerNama = new Map(Array.from(kontingen.values()).map(k => [baku(k.nama), k.situs_id as number]))
  const idKontingen = (slug?: string | null, nama?: string | null) => (slug && kontingenPerSlug.get(slug)) || (nama && kontingenPerNama.get(baku(nama))) || null
  console.log(`2. Kontingen: ${kontingen.size}`)

  // 3. Venue
  const venue = bacaVenue(baca('klaster/index.html.gz') ?? '')
  const idVenue = new Set(venue.map(v => v.situsId))
  console.log(`3. Venue: ${venue.length}`)

  // 4. Cabor, disiplin, daftar nomor
  const daftarC = bacaDaftarCabor(baca('cabor/index.html.gz') ?? '')
  const cabor = new Map<number, any>(), caborPerSlug = new Map<string, number>()
  const disiplin = new Map<number, any>()
  const nomorDiCabor = new Map<number, { caborId: number; disiplinId: number | null; disiplin: string | null; slug: string; nama: string }>()
  for (const f of daftarBerkas('cabor')) {
    const slug = f.replace('.html.gz', '')
    const c: CaborRinci | null = bacaCabor(baca(`cabor/${f}`) ?? '')
    if (!c?.situsId) { console.log(`  ! cabor tanpa id: ${slug}`); continue }
    const d = daftarC.find(x => x.slug === slug)
    cabor.set(c.situsId, { situs_id: c.situsId, slug, nama: c.nama, jumlah_nomor: c.jumlahNomor ?? d?.nomor ?? null, jumlah_atlet: c.jumlahAtlet, rentang: c.rentang ?? d?.rentang ?? null })
    caborPerSlug.set(slug, c.situsId)
    for (const ds of c.disiplin) {
      if (!ds.situsId) continue
      if (disiplin.has(ds.situsId) && disiplin.get(ds.situsId).cabor_situs_id !== c.situsId) console.log(`  ! id disiplin ${ds.situsId} dipakai dua cabor`)
      disiplin.set(ds.situsId, { situs_id: ds.situsId, cabor_situs_id: c.situsId, nama: ds.nama, jadwal: ds.jadwal.map(j => ({ rentang: j.rentang, venue_situs_id: j.venueSitusId, venue: j.venue })) })
    }
    for (const n of c.nomor) if (n.situsId) nomorDiCabor.set(n.situsId, { caborId: c.situsId, disiplinId: n.disiplinSitusId, disiplin: c.disiplin.find(x => x.situsId === n.disiplinSitusId)?.nama ?? null, slug: n.slug, nama: n.nama })
  }
  console.log(`4. Cabor: ${cabor.size}/${daftarC.length} · disiplin ${disiplin.size} · nomor di halaman cabor ${nomorDiCabor.size}`)

  // 5. Nomor & podium
  const nomor = new Map<number, any>()
  const medali: any[] = []
  for (const f of daftarBerkas('nomor')) {
    const slug = f.replace('.html.gz', '')
    const n: NomorRinci | null = bacaNomor(baca(`nomor/${f}`) ?? '')
    const id = n?.situsId ?? idAkhir(slug)
    if (!n || !id) { console.log(`  ! nomor tak terbaca: ${slug}`); continue }
    const dc = nomorDiCabor.get(id)
    nomor.set(id, {
      situs_id: id, slug, cabor_situs_id: dc?.caborId ?? (n.caborSlug ? caborPerSlug.get(n.caborSlug) ?? null : null),
      disiplin_situs_id: dc?.disiplinId ?? null, disiplin: dc?.disiplin ?? n.kicker, nama: dc?.nama ?? n.nama,
      gender: genderDari(n.nama), status: n.status, selesai: n.selesai, rentang: n.rentang,
      venue_situs_id: n.venueSitusId && idVenue.has(n.venueSitusId) ? n.venueSitusId : null,
      jumlah_laga: n.jumlahLaga, jumlah_peserta: n.jumlahPeserta,
    })
    for (const p of n.podium) medali.push({
      nomor_situs_id: id, urutan: p.urutan, medali: p.medali, kontingen_situs_id: idKontingen(p.kontingenSlug, p.kontingen), kontingen: p.kontingen,
      laga_ref: p.lagaRef, atlet_situs_ids: p.atlet.map(a => a.situsId).filter(Boolean), atlet_nama: p.atlet.map(a => a.nama),
    })
  }
  // Nomor yang hanya ada di halaman cabor (belum punya halaman sendiri)
  for (const [id, dc] of Array.from(nomorDiCabor.entries())) if (!nomor.has(id))
    nomor.set(id, { situs_id: id, slug: dc.slug, cabor_situs_id: dc.caborId, disiplin_situs_id: dc.disiplinId, disiplin: dc.disiplin, nama: dc.nama, gender: genderDari(dc.nama), status: null, selesai: false, rentang: null, venue_situs_id: null, jumlah_laga: null, jumlah_peserta: null })
  console.log(`5. Nomor: ${nomor.size} · podium ${medali.length} baris (${medali.filter(m => m.medali === 'emas').length} emas, ${medali.filter(m => m.medali === 'perak').length} perak, ${medali.filter(m => m.medali === 'perunggu').length} perunggu)`)

  // 6. Pemeriksaan silang medali vs klasemen resmi
  const hitung = new Map<number, { e: number; p: number; g: number }>()
  for (const m of medali) {
    if (!m.kontingen_situs_id) continue
    const r = hitung.get(m.kontingen_situs_id) ?? { e: 0, p: 0, g: 0 }
    if (m.medali === 'emas') r.e++; else if (m.medali === 'perak') r.p++; else r.g++
    hitung.set(m.kontingen_situs_id, r)
  }
  const beda = Array.from(kontingen.values()).map(k => ({ k, h: hitung.get(k.situs_id) ?? { e: 0, p: 0, g: 0 } }))
    .filter(({ k, h }) => h.e !== k.emas || h.p !== k.perak || h.g !== k.perunggu)
  console.log(`6. Silang medali podium vs klasemen resmi: ${beda.length ? `${beda.length} kontingen beda` : 'SEMUA COCOK'}`)
  beda.slice(0, 10).forEach(({ k, h }) => console.log(`   ${k.nama}: podium ${h.e}/${h.p}/${h.g} · klasemen ${k.emas}/${k.perak}/${k.perunggu}`))
  const tanpaKontingen = medali.filter(m => !m.kontingen_situs_id)
  if (tanpaKontingen.length) console.log(`   ${tanpaKontingen.length} medali tanpa kontingen dikenal: ${Array.from(new Set(tanpaKontingen.map(m => m.kontingen))).slice(0, 5).join(', ')}`)

  // 7. Atlet
  const atletRinci = new Map<number, { slug: string; r: AtletRinci }>()
  let n7 = 0
  for (const f of daftarBerkas('atlet')) {
    const slug = f.replace('.html.gz', '')
    const id = idAkhir(slug)
    const r = bacaAtletPenuh(baca(`atlet/${f}`) ?? '')
    if (id && r) atletRinci.set(id, { slug, r })
    if (++n7 % 2000 === 0) console.log(`   … ${n7} halaman atlet`)
  }
  console.log(`7. Atlet: ${atletRinci.size}`)

  // 8. Laga & peserta (awak dilengkapi dari halaman atlet)
  const laga: LagaRinci[] = []
  for (const f of daftarBerkas('laga')) {
    const ref = Number(f.replace('.html.gz', ''))
    const l = bacaLagaPenuh(baca(`laga/${f}`) ?? '', ref)
    if (l) laga.push(l)
  }
  const atletPerLaga = new Map<number, number[]>()
  atletRinci.forEach(({ r }, id) => r.lagaRefs.forEach(ref => atletPerLaga.set(ref, [...(atletPerLaga.get(ref) ?? []), id])))
  let awakDilengkapi = 0
  const peserta = laga.flatMap(l => l.peserta.map(p => {
    const ids = new Set<number>(p.atlet.map(a => a.situsId).filter((x): x is number => !!x))
    const sebelum = ids.size
    for (const id of atletPerLaga.get(l.ref) ?? []) {
      const a = atletRinci.get(id)!.r
      if ((a.kontingenSlug && a.kontingenSlug === p.kontingenSlug) || baku(a.kontingen) === baku(p.kontingen)) ids.add(id)
    }
    if (ids.size > sebelum) awakDilengkapi++
    const daftar = Array.from(ids)
    return {
      laga_ref: l.ref, urutan: p.urutan, sisi: p.sisi, kontingen_situs_id: idKontingen(p.kontingenSlug, p.kontingen), kontingen: p.kontingen,
      menang: p.menang, skor: p.skor, peringkat: p.peringkat, medali: p.medali, nilai: p.nilai, nilai_angka: p.nilaiAngka,
      atlet_situs_ids: daftar, atlet_nama: daftar.map(id => atletRinci.get(id)?.r.nama ?? p.atlet.find(a => a.situsId === id)?.nama ?? String(id)),
    }
  }))
  const bentuk = { duel: laga.filter(l => l.bentuk === 'duel').length, peringkat: laga.filter(l => l.bentuk === 'peringkat').length, kosong: laga.filter(l => l.bentuk === 'kosong').length }
  console.log(`8. Laga: ${laga.length} (duel ${bentuk.duel}, peringkat ${bentuk.peringkat}, tanpa peserta ${bentuk.kosong}) · peserta ${peserta.length} · awak dilengkapi dari halaman atlet ${awakDilengkapi}`)

  // 9. Tautan ke data kita
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
  const [{ data: kontKita }, { data: caborKita }] = await Promise.all([
    db.from('kontingen').select('id, nama'), db.from('cabang_olahraga').select('id, nama'),
  ])
  for (const k of Array.from(kontingen.values())) k.kontingen_id = (kontKita ?? []).find(x => baku(x.nama) === baku(k.nama))?.id ?? null
  // Nama situs yang ditulis lain di cabang_olahraga kita (hanya untuk arsip ini).
  const PADANAN: Record<string, string> = { 'baseball': 'perbasasi baseball', 'softball': 'perbasasi softball', 'soft tennis': 'soft tenis', 'terbang layang': 'aerosport terbang layang' }
  for (const c of Array.from(cabor.values()))
    c.cabor_id = cocokCabor(c.nama, caborKita ?? []) ?? (caborKita ?? []).find(x => baku(x.nama) === PADANAN[baku(c.nama)])?.id ?? null
  const kabBandungSitus = kontingenPerSlug.get('kab-bandung')
  const lokal: any[] = []
  for (let p = 0; ; p++) {
    const { data } = await db.from('atlet').select('id, nama_lengkap, status_registrasi').eq('kontingen_id', 4).range(p * 1000, p * 1000 + 999)
    if (!data?.length) break
    lokal.push(...data)
    if (data.length < 1000) break
  }
  const lokalPerNama = new Map<string, { id: number; sah: boolean }[]>()
  lokal.forEach(a => lokalPerNama.set(baku(a.nama_lengkap), [...(lokalPerNama.get(baku(a.nama_lengkap)) ?? []), { id: a.id, sah: ['Verified', 'Posted'].includes(a.status_registrasi) }]))
  // Nama kembar di data kita (mis. baris Draft ganda): pakai satu-satunya yang Verified/Posted.
  const pilihLokal = (c: { id: number; sah: boolean }[]) => c.length === 1 ? c[0].id : c.filter(x => x.sah).length === 1 ? c.find(x => x.sah)!.id : null
  const lagaPerAtlet = new Map<number, number>()
  peserta.forEach(p => p.atlet_situs_ids.forEach(id => lagaPerAtlet.set(id, (lagaPerAtlet.get(id) ?? 0) + 1)))
  const atlet = Array.from(atletRinci.entries()).map(([id, { slug, r }]) => {
    const kid = idKontingen(r.kontingenSlug, r.kontingen)
    const calon = kid && kid === kabBandungSitus ? lokalPerNama.get(baku(r.nama)) ?? [] : []
    return {
      situs_id: id, slug, nama: r.nama, kontingen_situs_id: kid, kontingen: r.kontingen,
      cabor_situs_id: r.caborSlug ? caborPerSlug.get(r.caborSlug) ?? null : null, cabor: r.cabor, disiplin: r.disiplin, gender: r.gender,
      emas: r.emas, perak: r.perak, perunggu: r.perunggu, jumlah_laga: lagaPerAtlet.get(id) ?? r.lagaRefs.length,
      atlet_id: pilihLokal(calon),
    }
  })
  console.log(`9. Tautan: kontingen ${Array.from(kontingen.values()).filter(k => k.kontingen_id).length}/${kontingen.size} · cabor ${Array.from(cabor.values()).filter(c => c.cabor_id).length}/${cabor.size} · atlet Kab. Bandung ${atlet.filter(a => a.atlet_id).length}/${atlet.filter(a => a.kontingen_situs_id === kabBandungSitus).length}`)

  const ringkasan = {
    klasemen: klasemen.length, kontingen: kontingen.size, venue: venue.length, cabor: cabor.size, disiplin: disiplin.size,
    nomor: nomor.size, medali: medali.length, atlet: atlet.length, laga: laga.length, peserta: peserta.length,
    acara: ringkas, medali_beda_klasemen: beda.map(({ k, h }) => ({ kontingen: k.nama, podium: [h.e, h.p, h.g], klasemen: [k.emas, k.perak, k.perunggu] })),
  }
  if (!tulis) { console.log('\n(baca & periksa saja — tambahkan --tulis untuk menyimpan)'); return }

  // 10. Tulis (urut mengikuti tautan antartabel)
  const upsert = async (t: string, rows: any[], onConflict: string) => {
    for (const b of potong(rows)) { const { error } = await db.from(t).upsert(b, { onConflict }); if (error) throw new Error(`${t}: ${error.message}`) }
  }
  const sekarang = new Date().toISOString()
  await upsert('porprov15_kontingen', Array.from(kontingen.values()).map(k => ({ ...k, dibaca_at: sekarang })), 'situs_id')
  await upsert('porprov15_venue', venue.map(v => ({
    situs_id: v.situsId, nama: v.nama, klaster: v.klaster, cabor: v.cabor,
    lat: v.lokasi[0]?.lat ?? null, lng: v.lokasi[0]?.lng ?? null, alamat: v.lokasi[0]?.alamat ?? null, lokasi: v.lokasi,
  })), 'situs_id')
  await upsert('porprov15_cabor', Array.from(cabor.values()).map(c => ({ ...c, dibaca_at: sekarang })), 'situs_id')
  await upsert('porprov15_disiplin', Array.from(disiplin.values()), 'situs_id')
  const idDisiplin = new Set(disiplin.keys())
  await upsert('porprov15_nomor', Array.from(nomor.values()).map(n => ({ ...n, disiplin_situs_id: n.disiplin_situs_id && idDisiplin.has(n.disiplin_situs_id) ? n.disiplin_situs_id : null, dibaca_at: sekarang })), 'situs_id')
  for (const b of potong(Array.from(nomor.keys()))) { const { error } = await db.from('porprov15_medali').delete().in('nomor_situs_id', b); if (error) throw error }
  for (const b of potong(medali)) { const { error } = await db.from('porprov15_medali').insert(b); if (error) throw new Error(`medali: ${error.message}`) }
  await upsert('porprov15_atlet', atlet.map(a => ({ ...a, dibaca_at: sekarang })), 'situs_id')
  const idNomor = new Set(nomor.keys()), idCabor = new Set(cabor.keys())
  await upsert('porprov15_laga', laga.map(l => ({
    ref: l.ref, nomor_situs_id: l.nomorSitusId && idNomor.has(l.nomorSitusId) ? l.nomorSitusId : null,
    cabor_situs_id: l.caborSitusId && idCabor.has(l.caborSitusId) ? l.caborSitusId : null,
    tanggal: l.tanggal, jam: l.jam, cabor: l.cabor, disiplin: l.disiplin, nomor: l.nomor, gender: l.gender, babak: l.babak, kode: l.kode,
    venue: l.venue, klaster: l.klaster, status: l.status, selesai: l.selesai, perebutan_medali: l.perebutanMedali, bentuk: l.bentuk, video: l.video,
    dibaca_at: sekarang,
  })), 'ref')
  for (const b of potong(laga.map(l => l.ref))) { const { error } = await db.from('porprov15_laga_peserta').delete().in('laga_ref', b); if (error) throw error }
  for (const b of potong(peserta)) { const { error } = await db.from('porprov15_laga_peserta').insert(b); if (error) throw new Error(`peserta: ${error.message}`) }
  await db.from('porprov15_sinkron').insert({ arsip: tanggal, mulai: mulai.toISOString(), selesai: new Date().toISOString(), ringkas: ringkasan })
  console.log(`\n✓ Tersimpan: ${kontingen.size} kontingen, ${venue.length} venue, ${cabor.size} cabor, ${disiplin.size} disiplin, ${nomor.size} nomor, ${medali.length} medali, ${atlet.length} atlet, ${laga.length} laga, ${peserta.length} peserta.`)
})().catch(e => { console.error('✗', e?.message ?? e); process.exit(1) })
