// src/app/api/konida/jadwal-kelola/route.ts
// Kelola jadwal_cabor dari dashboard: lihat, ubah, tambah, hapus. Setiap
// perubahan dicatat di audit_logs (JADWAL_*) lengkap dengan isi sebelumnya,
// supaya bisa dikembalikan. Halaman publik disegarkan sesudahnya.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { writeAudit, reqMeta } from '@/lib/audit'
import { KOLOM_JADWAL, KONTINGEN_JADWAL, ambilPengelolaJadwal, periksaIsiJadwal } from '@/lib/jadwal-kelola'
import { ambilSemua } from '@/lib/lapor-sesi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } })

const segarkanPublik = () => { try { revalidatePath('/publik/kabbandung') } catch { /* cukup menunggu satu menit */ } }

const jejak = (req: NextRequest, p: { sesi: any }, action: string, resource_id: number | string | null, payload: any, severity: 'info' | 'warning' = 'info') =>
  writeAudit({
    action, resource: 'jadwal_cabor', resource_id, actor_id: p.sesi.id ?? null, actor_email: p.sesi.username ?? null,
    actor_role: p.sesi.role ?? null, kontingen_id: KONTINGEN_JADWAL, payload, severity, ...reqMeta(req),
  })

const pesanDb = (e: { code?: string; message: string }) =>
  e.code === '23505' ? 'Kegiatan dengan nama, tanggal mulai, dan venue yang sama sudah ada.' : e.message

export async function GET() {
  const p = await ambilPengelolaJadwal()
  if ('error' in p) return NextResponse.json({ error: p.error }, { status: p.status })
  const sb = db()
  const [{ data, error }, daftar] = await Promise.all([
    sb.from('jadwal_cabor').select(KOLOM_JADWAL).order('mulai', { nullsFirst: false }).order('cabor_disiplin'),
    ambilSemua<{ cabor_id: number }>((d, s) => sb.from('pendaftaran_nomor').select('cabor_id').eq('kontingen_id', KONTINGEN_JADWAL).order('id').range(d, s)).catch(() => []),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const idCabor = Array.from(new Set(daftar.map(d => d.cabor_id)))
  const { data: cabor } = idCabor.length ? await sb.from('cabang_olahraga').select('nama').in('id', idCabor) : { data: [] as any[] }
  return NextResponse.json({ jadwal: data ?? [], cabor_kontingen: (cabor ?? []).map((c: any) => c.nama).sort() })
}

export async function POST(req: NextRequest) {
  const p = await ambilPengelolaJadwal()
  if ('error' in p) return NextResponse.json({ error: p.error }, { status: p.status })
  const cek = periksaIsiJadwal(await req.json().catch(() => null), false)
  if ('error' in cek) return NextResponse.json({ error: cek.error }, { status: 400 })
  const { data, error } = await db().from('jadwal_cabor')
    .insert({ ...cek.isi, sumber: `Kelola Jadwal (${p.nama})` }).select(KOLOM_JADWAL).single()
  if (error) return NextResponse.json({ error: pesanDb(error) }, { status: 400 })
  await jejak(req, p, 'JADWAL_TAMBAH', (data as any).id, { sesudah: data })
  segarkanPublik()
  return NextResponse.json({ ok: true, baris: data })
}

export async function PATCH(req: NextRequest) {
  const p = await ambilPengelolaJadwal()
  if ('error' in p) return NextResponse.json({ error: p.error }, { status: p.status })
  const body = await req.json().catch(() => null)
  const id = Number(body?.id)
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Baris jadwal tidak dikenali.' }, { status: 400 })
  const sb = db()
  const { data: lama } = await sb.from('jadwal_cabor').select(KOLOM_JADWAL).eq('id', id).maybeSingle()
  if (!lama) return NextResponse.json({ error: 'Baris jadwal tidak ditemukan.' }, { status: 404 })
  const { id: _abaikan, ...isian } = body
  // Tanggal selesai dihitung dari pasangan mulai–selesai; bila hanya satu yang dikirim, pasangannya diambil dari baris lama.
  if ('mulai' in isian && !('selesai' in isian)) isian.selesai = (lama as any).selesai
  if ('selesai' in isian && !('mulai' in isian)) isian.mulai = (lama as any).mulai
  const cek = periksaIsiJadwal(isian, true)
  if ('error' in cek) return NextResponse.json({ error: cek.error }, { status: 400 })
  const { data, error } = await sb.from('jadwal_cabor')
    .update({ ...cek.isi, updated_at: new Date().toISOString() }).eq('id', id).select(KOLOM_JADWAL).single()
  if (error) return NextResponse.json({ error: pesanDb(error) }, { status: 400 })
  const sebelum = Object.fromEntries(Object.keys(cek.isi).map(k => [k, (lama as any)[k]]))
  await jejak(req, p, 'JADWAL_UBAH', id, { kegiatan: (lama as any).cabor_disiplin, sebelum, sesudah: cek.isi })
  segarkanPublik()
  return NextResponse.json({ ok: true, baris: data })
}

export async function DELETE(req: NextRequest) {
  const p = await ambilPengelolaJadwal()
  if ('error' in p) return NextResponse.json({ error: p.error }, { status: p.status })
  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Baris jadwal tidak dikenali.' }, { status: 400 })
  const sb = db()
  const { data: lama } = await sb.from('jadwal_cabor').select('*').eq('id', id).maybeSingle()
  if (!lama) return NextResponse.json({ error: 'Baris jadwal tidak ditemukan.' }, { status: 404 })
  const { error } = await sb.from('jadwal_cabor').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // Isi lengkap disimpan di jejak supaya baris bisa dikembalikan bila salah hapus.
  await jejak(req, p, 'JADWAL_HAPUS', id, { baris: lama }, 'warning')
  segarkanPublik()
  return NextResponse.json({ ok: true })
}
