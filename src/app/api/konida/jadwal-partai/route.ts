// src/app/api/konida/jadwal-partai/route.ts
// KONIDA melihat, membetulkan, menambah, dan menghapus jadwal partai kontingennya.
// Atlet dipilih oleh PIC cabor; dari sini atlet tidak diubah.

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { periksaPartai, urutPartai } from '@/lib/jadwal-partai'
import { KOLOM_PARTAI, segarkanPublik } from '@/lib/partai-server'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const jejak = (req: NextRequest, a: { sesi: any; kontingen_id: number; nama: string }, action: string, id: number, payload: any, severity: 'info' | 'warning' = 'info') =>
  writeAudit({
    action, resource: 'jadwal_partai', resource_id: id, actor_id: a.sesi.id ?? null, actor_email: a.sesi.username ?? a.nama,
    actor_role: a.sesi.role ?? null, kontingen_id: a.kontingen_id, payload, severity, ...reqMeta(req),
  })

const tanpaAtlet = (isi: any) => { const { atlet_ids: _a, ...lain } = isi; return lain }

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()
  const { data, error } = await db.from('jadwal_partai').select(KOLOM_PARTAI).eq('kontingen_id', a.kontingen_id).limit(3000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const partai = urutPartai((data ?? []) as any[])
  const idAtlet = Array.from(new Set(partai.flatMap((p: any) => p.atlet_ids as number[])))
  const idCabor = Array.from(new Set(partai.map((p: any) => p.cabor_id as number)))
  const [{ data: atlet }, { data: cabor }, daftar] = await Promise.all([
    idAtlet.length ? db.from('atlet').select('id,nama_lengkap').eq('kontingen_id', a.kontingen_id).in('id', idAtlet) : Promise.resolve({ data: [] as any[] }),
    db.from('cabang_olahraga').select('id,nama').order('nama'),
    // Supabase memotong jawaban di 1.000 baris; pendaftaran Kab. Bandung 1.860.
    ambilSemua<{ cabor_id: number }>((d, s) => db.from('pendaftaran_nomor').select('cabor_id').eq('kontingen_id', a.kontingen_id).order('id').range(d, s)).catch(() => []),
  ])
  const caborKontingen = new Set([...daftar.map(d => d.cabor_id), ...idCabor])
  return NextResponse.json({
    partai,
    atlet: Object.fromEntries((atlet ?? []).map((x: any) => [x.id, x.nama_lengkap])),
    cabor: (cabor ?? []).filter((c: any) => caborKontingen.has(c.id)).map((c: any) => ({ id: c.id, nama: c.nama })),
  })
}

export async function POST(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const mentah = await req.json().catch(() => null)
  const caborId = Number(mentah?.cabor_id)
  if (!Number.isInteger(caborId) || caborId <= 0) return NextResponse.json({ error: 'Pilih cabornya.' }, { status: 400 })
  const cek = periksaPartai(mentah, false)
  if ('galat' in cek) return NextResponse.json({ error: cek.galat }, { status: 422 })
  const db = dbLapor()
  const { data: c } = await db.from('cabang_olahraga').select('id').eq('id', caborId).maybeSingle()
  if (!c) return NextResponse.json({ error: 'Cabor tidak dikenali.' }, { status: 400 })
  const { data, error } = await db.from('jadwal_partai').insert({
    ...tanpaAtlet(cek.isi), kontingen_id: a.kontingen_id, cabor_id: caborId, sumber: 'konida', dibuat_oleh: a.nama, diubah_oleh: a.nama,
  }).select(KOLOM_PARTAI).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await jejak(req, a, 'JADWAL_PARTAI_TAMBAH', (data as any).id, { sesudah: data })
  segarkanPublik()
  return NextResponse.json({ ok: true, partai: data })
}

export async function PATCH(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const mentah = await req.json().catch(() => null)
  const id = Number(mentah?.id)
  const db = dbLapor()
  const { data: lama } = await db.from('jadwal_partai').select(KOLOM_PARTAI).eq('id', id).eq('kontingen_id', a.kontingen_id).maybeSingle()
  if (!lama) return NextResponse.json({ error: 'Jadwal partai tidak ditemukan.' }, { status: 404 })
  const { id: _id, cabor_id: _c, atlet_ids: _a, ...isian } = mentah
  const cek = periksaPartai(isian, true)
  if ('galat' in cek) return NextResponse.json({ error: cek.galat }, { status: 422 })
  // Nomor diketik ulang oleh admin: tautan ke daftar resmi dilepas supaya tidak menyesatkan.
  const isi: any = { ...cek.isi }
  if ('nomor_teks' in isi && isi.nomor_teks !== (lama as any).nomor_teks) { isi.disiplin = null; isi.nomor_resmi = null }
  const { data, error } = await db.from('jadwal_partai')
    .update({ ...isi, diubah_oleh: a.nama, updated_at: new Date().toISOString() }).eq('id', id).select(KOLOM_PARTAI).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const sebelum = Object.fromEntries(Object.keys(isi).map(k => [k, (lama as any)[k] ?? null]))
  await jejak(req, a, 'JADWAL_PARTAI_UBAH', id, { nomor: (lama as any).nomor_teks, sebelum, sesudah: isi })
  segarkanPublik()
  return NextResponse.json({ ok: true, partai: data })
}

export async function DELETE(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const id = Number(new URL(req.url).searchParams.get('id'))
  const db = dbLapor()
  const { data: lama } = await db.from('jadwal_partai').select('*').eq('id', id).eq('kontingen_id', a.kontingen_id).maybeSingle()
  if (!lama) return NextResponse.json({ error: 'Jadwal partai tidak ditemukan.' }, { status: 404 })
  const { error } = await db.from('jadwal_partai').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await jejak(req, a, 'JADWAL_PARTAI_HAPUS', id, { baris: lama }, 'warning')
  segarkanPublik()
  return NextResponse.json({ ok: true })
}
