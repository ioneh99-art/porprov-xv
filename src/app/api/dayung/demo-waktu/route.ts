// src/app/api/dayung/demo-waktu/route.ts
// MODE DEMO Input Waktu Dayung (PODSI Jabar): simpan / kosongkan catatan waktu peragaan.
// Wajib sesi admin atau operator Dayung. Tidak menyentuh hasil resmi.
//   POST   { laga_ref, baris: [{ urutan, waktu_detik, status }] }  → ganti isian satu laga
//   DELETE ?laga_ref=…  → kosongkan satu laga · tanpa parameter → kosongkan semua

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sesiDayung } from '@/lib/dayung-akses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const STATUS = ['ok', 'DNS', 'DNF', 'DSQ']

const bolehTulis = sesiDayung

export async function POST(req: NextRequest) {
  const s = await bolehTulis()
  if (!s) return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const lagaRef = Number(body?.laga_ref)
  const baris: any[] = Array.isArray(body?.baris) ? body.baris : []
  if (!lagaRef || baris.length === 0 || baris.length > 30) return NextResponse.json({ error: 'Isian tidak lengkap.' }, { status: 400 })
  const bersih = []
  for (const b of baris) {
    const urutan = Number(b?.urutan)
    const status = STATUS.includes(b?.status) ? b.status : 'ok'
    const w = b?.waktu_detik == null || b.waktu_detik === '' ? null : Number(b.waktu_detik)
    if (!Number.isInteger(urutan) || urutan < 1 || (w != null && (!Number.isFinite(w) || w <= 0 || w > 36000)))
      return NextResponse.json({ error: 'Ada waktu yang tidak sah.' }, { status: 422 })
    bersih.push({ laga_ref: lagaRef, urutan, waktu_detik: w, status, diisi_oleh: s.username ?? null, updated_at: new Date().toISOString() })
  }
  const db = sb()
  const { error: e1 } = await db.from('dayung_demo_waktu').delete().eq('laga_ref', lagaRef)
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  const isi = bersih.filter(b => b.waktu_detik != null || b.status !== 'ok')
  if (isi.length) {
    const { error } = await db.from('dayung_demo_waktu').insert(isi)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, count: isi.length })
}

export async function DELETE(req: NextRequest) {
  const s = await bolehTulis()
  if (!s) return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 })
  const ref = Number(req.nextUrl.searchParams.get('laga_ref'))
  const q = sb().from('dayung_demo_waktu').delete()
  const { error } = ref ? await q.eq('laga_ref', ref) : await q.gte('laga_ref', 0)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
