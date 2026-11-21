// scripts/salin-dayung-dari-porprov15.ts — isi ulang tabel aplikasi Dayung Jabar (PODSI)
// dari data lengkap PORPROV XV (porprov15_*, hasil olah arsip situs panitia).
//
//   npx tsx scripts/salin-dayung-dari-porprov15.ts           → hitung & periksa saja
//   npx tsx scripts/salin-dayung-dari-porprov15.ts --tulis   → simpan ke dayung_jabar_*
//
// Nomor ID atlet & laga di dayung_jabar_* = ID situs panitia, sama dengan porprov15_*,
// jadi data awal (dayung_atlet_isian), pengukuran, dan demo waktu tetap tersambung.
// Hanya upsert atlet & laga; peserta diganti per laga. Menggantikan tarik-dayung-jabar.ts
// (situs sudah final setelah penutupan 20 Nov 2026).

import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { baku } from '../src/lib/konijabar'
import { detikDari } from '../src/lib/dayung-jabar'

if (existsSync('.env.local'))
  for (const b of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = b.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }

const CABOR_DAYUNG_LOKAL = 147
const potong = <T,>(xs: T[], k = 500) => Array.from({ length: Math.ceil(xs.length / k) }, (_, i) => xs.slice(i * k, i * k + k))

async function semua<T>(q: (dari: number, ke: number) => any): Promise<T[]> {
  const hasil: T[] = []
  for (let p = 0; ; p++) {
    const { data, error } = await q(p * 1000, p * 1000 + 999)
    if (error) throw error
    hasil.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return hasil
}

;(async () => {
  const tulis = process.argv.includes('--tulis')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
  const { data: cab } = await db.from('porprov15_cabor').select('situs_id').eq('slug', 'dayung').single()
  if (!cab) { console.log('✗ Cabor Dayung belum ada di porprov15_cabor — olah arsip dulu.'); process.exit(1) }
  const { data: kon } = await db.from('porprov15_kontingen').select('situs_id, kontingen_id')
  const kontKita = new Map((kon ?? []).map(k => [k.situs_id, k.kontingen_id]))

  const atlet = await semua<any>((a, b) => db.from('porprov15_atlet').select('*').eq('cabor_situs_id', cab.situs_id).order('situs_id').range(a, b))
  const laga = await semua<any>((a, b) => db.from('porprov15_laga').select('*').eq('cabor_situs_id', cab.situs_id).order('ref').range(a, b))
  const peserta: any[] = []
  for (const b of potong(laga.map(l => l.ref), 200)) {
    const { data, error } = await db.from('porprov15_laga_peserta').select('*').in('laga_ref', b)
    if (error) throw error
    peserta.push(...(data ?? []))
  }
  const { data: nomor } = await db.from('porprov15_nomor').select('situs_id, nama').eq('cabor_situs_id', cab.situs_id)
  const nomorBerlaga = new Set(laga.map(l => l.nomor_situs_id))
  console.log(`Dayung: ${atlet.length} atlet · ${laga.length} laga (selesai ${laga.filter(l => l.selesai).length}) · ${peserta.length} perahu · ${nomor?.length} nomor (${(nomor ?? []).filter(n => !nomorBerlaga.has(n.situs_id)).length} tanpa halaman laga)`)

  // Tautan ke atlet Dayung lokal (contoh Kab. Bandung): kontingen + nama sama, cabor 147
  const lokal = await semua<any>((a, b) => db.from('atlet').select('id, nama_lengkap, kontingen_id').eq('cabor_id', CABOR_DAYUNG_LOKAL).range(a, b))
  const lokalPerKunci = new Map(lokal.map(a => [`${a.kontingen_id}|${baku(a.nama_lengkap)}`, a.id]))

  const barisAtlet = atlet.map(a => {
    const kid = a.kontingen_situs_id ? kontKita.get(a.kontingen_situs_id) ?? null : null
    return {
      situs_id: a.situs_id, slug: a.slug, nama: a.nama, kontingen: a.kontingen, kontingen_id: kid,
      gender: a.gender, disiplin: a.disiplin, emas: a.emas, perak: a.perak, perunggu: a.perunggu,
      atlet_id: kid ? lokalPerKunci.get(`${kid}|${baku(a.nama)}`) ?? null : null,
      dibaca_at: a.dibaca_at,
    }
  })
  const barisLaga = laga.map(l => ({
    ref: l.ref, tanggal: l.tanggal, jam: l.jam, disiplin: l.disiplin, nomor: l.nomor, gender: l.gender,
    babak: l.babak, kode: l.kode, venue: l.venue, status: l.status, selesai: l.selesai,
    perebutan_medali: l.perebutan_medali, dibaca_at: l.dibaca_at,
  }))
  const barisPeserta = peserta.map(p => ({
    laga_ref: p.laga_ref, urutan: p.urutan, kontingen: p.kontingen,
    kontingen_id: p.kontingen_situs_id ? kontKita.get(p.kontingen_situs_id) ?? null : null,
    peringkat: p.peringkat, medali: p.medali, waktu: p.nilai, waktu_detik: detikDari(p.nilai) ?? (p.nilai_angka != null ? Number(p.nilai_angka) : null),
    atlet_situs_ids: p.atlet_situs_ids, atlet_nama: p.atlet_nama,
  }))
  const medali = { e: barisPeserta.filter(p => p.medali === 'emas').length, p: barisPeserta.filter(p => p.medali === 'perak').length, g: barisPeserta.filter(p => p.medali === 'perunggu').length }
  console.log(`Medali dari laga: ${medali.e}/${medali.p}/${medali.g} · tertaut atlet lokal: ${barisAtlet.filter(a => a.atlet_id).length}`)
  if (!tulis) { console.log('\n(periksa saja — tambahkan --tulis untuk menyimpan)'); return }

  for (const b of potong(barisAtlet)) { const { error } = await db.from('dayung_jabar_atlet').upsert(b, { onConflict: 'situs_id' }); if (error) throw error }
  // Atlet lama yang tidak ada lagi di daftar resmi panitia dikeluarkan — kecuali yang sudah punya
  // isian data awal/pengukuran (dibiarkan agar isian PODSI tidak ikut terhapus).
  const idBaru = new Set(barisAtlet.map(a => a.situs_id))
  const lama = await semua<any>((a, b) => db.from('dayung_jabar_atlet').select('situs_id, nama').order('situs_id').range(a, b))
  const usang = lama.filter(a => !idBaru.has(a.situs_id)).map(a => a.situs_id)
  if (usang.length) {
    const [{ data: isi }, { data: ukur }] = await Promise.all([
      db.from('dayung_atlet_isian').select('situs_id').in('situs_id', usang),
      db.from('dayung_pengukuran').select('situs_id').in('situs_id', usang),
    ])
    const dijaga = new Set([...(isi ?? []), ...(ukur ?? [])].map((x: any) => x.situs_id))
    const hapus = usang.filter(id => !dijaga.has(id))
    if (hapus.length) { const { error } = await db.from('dayung_jabar_atlet').delete().in('situs_id', hapus); if (error) throw error }
    console.log(`Atlet lama tidak ada di daftar resmi: ${usang.length} (dikeluarkan ${hapus.length}, dijaga karena ada isian ${usang.length - hapus.length})`)
  }
  for (const b of potong(barisLaga)) { const { error } = await db.from('dayung_jabar_laga').upsert(b, { onConflict: 'ref' }); if (error) throw error }
  for (const b of potong(barisLaga.map(l => l.ref))) { const { error } = await db.from('dayung_jabar_peserta').delete().in('laga_ref', b); if (error) throw error }
  for (const b of potong(barisPeserta)) { const { error } = await db.from('dayung_jabar_peserta').insert(b); if (error) throw error }
  await db.from('dayung_jabar_sinkron').insert({
    mulai: new Date().toISOString(), selesai: new Date().toISOString(),
    ringkas: { sumber: 'porprov15 (arsip situs panitia)', atlet: barisAtlet.length, laga: barisLaga.length, peserta: barisPeserta.length, medali },
  })
  console.log(`\n✓ Dayung Jabar diperbarui: ${barisAtlet.length} atlet, ${barisLaga.length} laga, ${barisPeserta.length} perahu.`)
})().catch(e => { console.error('✗', e?.message ?? e); process.exit(1) })
