// src/app/api/dayung/data-awal/route.ts
// Data awal & pengukuran berkala atlet Dayung se-Jabar (PODSI Jabar).
// Wajib sesi admin atau operator Dayung. Tidak menimpa data yang sudah ada:
// tanggal lahir atlet yang sudah tercatat di Data Atlet tetap dari sana.
//   GET    ?kontingen=<nama>  atau  ?situs=1,2,3   → isian, pengukuran, data lokal (tgl lahir, tes biomotorik)
//   POST   { tanggal, baris: [{ situs_id, tgl_lahir?, nilai: { <item>: angka|teks } }] }
//   DELETE ?id=<id pengukuran>

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sesiDayung } from '@/lib/dayung-akses'
import { writeAudit, reqMeta } from '@/lib/audit'
import { PETA_ITEM, bacaNilai, tanggalLahirWajar } from '@/lib/dayung-data-awal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const tanggalSah = (t: any) => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t) && !isNaN(new Date(t + 'T00:00:00Z').getTime())

export async function GET(req: NextRequest) {
  const s = await sesiDayung()
  if (!s) return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 })
  const db = sb()
  const kontingen = req.nextUrl.searchParams.get('kontingen')
  let q = db.from('dayung_jabar_atlet').select('situs_id, atlet_id')
  if (kontingen) q = q.eq('kontingen', kontingen)
  else {
    const ids = (req.nextUrl.searchParams.get('situs') ?? '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 600)
    if (!ids.length) return NextResponse.json({ isian: {}, pengukuran: {}, lokal: {} })
    q = q.in('situs_id', ids)
  }
  const { data: atlet, error } = await q.limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const situs = (atlet ?? []).map(a => a.situs_id)
  const lokalIds = (atlet ?? []).map(a => a.atlet_id).filter(Boolean) as number[]
  if (!situs.length) return NextResponse.json({ isian: {}, pengukuran: {}, lokal: {} })

  const [isi, ukur, lok, tes] = await Promise.all([
    db.from('dayung_atlet_isian').select('situs_id, tgl_lahir, diisi_oleh, updated_at').in('situs_id', situs),
    db.from('dayung_pengukuran').select('id, situs_id, tanggal, item, nilai, satuan, diisi_oleh').in('situs_id', situs).order('tanggal'),
    lokalIds.length ? db.from('atlet').select('id, tgl_lahir').in('id', lokalIds) : Promise.resolve({ data: [] as any[] }),
    lokalIds.length ? db.from('atlet_tes_fisik').select('atlet_id, tanggal_tes, tinggi_badan, berat_badan').in('atlet_id', lokalIds).order('tanggal_tes', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
  ])

  const isian: Record<number, any> = {}
  for (const r of isi.data ?? []) isian[r.situs_id] = r
  const pengukuran: Record<number, any[]> = {}
  for (const r of ukur.data ?? []) (pengukuran[r.situs_id] ??= []).push({ ...r, nilai: Number(r.nilai) })
  const lokal: Record<number, any> = {}
  for (const a of atlet ?? []) {
    if (!a.atlet_id) continue
    const t = (tes.data ?? []).find((x: any) => x.atlet_id === a.atlet_id)
    lokal[a.situs_id] = {
      atlet_id: a.atlet_id,
      tgl_lahir: (lok.data ?? []).find((x: any) => x.id === a.atlet_id)?.tgl_lahir ?? null,
      tes: t ? { tanggal: t.tanggal_tes, tinggi: t.tinggi_badan, berat: t.berat_badan } : null,
    }
  }
  return NextResponse.json({ isian, pengukuran, lokal })
}

export async function POST(req: NextRequest) {
  const s = await sesiDayung()
  if (!s) return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const tanggal = body?.tanggal
  const baris: any[] = Array.isArray(body?.baris) ? body.baris : []
  if (!tanggalSah(tanggal)) return NextResponse.json({ error: 'Tanggal pengukuran tidak sah.' }, { status: 400 })
  if (tanggal > new Date(Date.now() + 86400000).toISOString().slice(0, 10)) return NextResponse.json({ error: 'Tanggal pengukuran tidak boleh di masa depan.' }, { status: 400 })
  if (!baris.length || baris.length > 600) return NextResponse.json({ error: 'Tidak ada isian.' }, { status: 400 })

  const db = sb()
  const ids = Array.from(new Set(baris.map(b => Number(b?.situs_id)).filter(n => Number.isInteger(n) && n > 0)))
  const { data: atlet } = await db.from('dayung_jabar_atlet').select('situs_id, atlet_id').in('situs_id', ids)
  const peta = new Map((atlet ?? []).map(a => [a.situs_id, a]))
  const lokalIds = (atlet ?? []).map(a => a.atlet_id).filter(Boolean) as number[]
  const { data: lok } = lokalIds.length ? await db.from('atlet').select('id, tgl_lahir').in('id', lokalIds) : { data: [] as any[] }
  const tglLokal = new Map((lok ?? []).map((a: any) => [a.id, a.tgl_lahir]))

  const isian: any[] = [], ukur: any[] = [], galat: string[] = []
  let tglDilewati = 0
  for (const b of baris) {
    const id = Number(b?.situs_id)
    const a = peta.get(id)
    if (!a) { galat.push(`atlet ${b?.situs_id} tidak dikenal`); continue }
    if (b.tgl_lahir) {
      if (!tanggalSah(b.tgl_lahir) || !tanggalLahirWajar(b.tgl_lahir)) galat.push(`atlet ${id}: tanggal lahir tidak wajar`)
      else if (a.atlet_id && tglLokal.get(a.atlet_id)) tglDilewati++   // sudah ada di Data Atlet → tidak ditimpa
      else isian.push({ situs_id: id, tgl_lahir: b.tgl_lahir, diisi_oleh: s.username ?? null, updated_at: new Date().toISOString() })
    }
    for (const [item, v] of Object.entries(b.nilai ?? {})) {
      const it = PETA_ITEM.get(item)
      if (!it) { galat.push(`atlet ${id}: ukuran ${item} tidak dikenal`); continue }
      const r = bacaNilai(item, v as any)
      if (r.galat) galat.push(`atlet ${id}: ${it.label} ${r.galat}`)
      else if (r.nilai != null) ukur.push({ situs_id: id, tanggal, item, nilai: r.nilai, satuan: it.satuan, diisi_oleh: s.username ?? null })
    }
  }
  if (galat.length) return NextResponse.json({ error: 'Ada isian yang tidak sah — tidak ada yang disimpan.', galat: galat.slice(0, 30) }, { status: 422 })

  if (isian.length) {
    const { error } = await db.from('dayung_atlet_isian').upsert(isian, { onConflict: 'situs_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (ukur.length) {
    const { error } = await db.from('dayung_pengukuran').upsert(ukur, { onConflict: 'situs_id,tanggal,item' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  await writeAudit({
    action: 'DAYUNG_DATA_AWAL', resource: 'dayung_pengukuran',
    actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
    payload: { tanggal, atlet: ids.length, tgl_lahir: isian.length, ukuran: ukur.length, tgl_lahir_dilewati: tglDilewati, item: Array.from(new Set(ukur.map(u => u.item))) },
    ...reqMeta(req),
  })
  return NextResponse.json({ ok: true, tgl_lahir: isian.length, ukuran: ukur.length, tgl_lahir_dilewati: tglDilewati })
}

export async function DELETE(req: NextRequest) {
  const s = await sesiDayung()
  if (!s) return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 })
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'id tidak sah.' }, { status: 400 })
  const { error } = await sb().from('dayung_pengukuran').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({ action: 'DAYUNG_HAPUS_UKURAN', resource: 'dayung_pengukuran', resource_id: id, actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null, ...reqMeta(req) })
  return NextResponse.json({ ok: true })
}

