import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cabor_id = searchParams.get('cabor_id')

  const { data, error } = await sb()
    .from('jadwal_pertandingan')
    .select(`
      id, tanggal, waktu_mulai, waktu_selesai, fase, status, keterangan,
      nomor_pertandingan(id, nama, gender, cabor_id),
      venue(id, nama)
    `)
    .eq('nomor_pertandingan.cabor_id', cabor_id ? parseInt(cabor_id) : 0)
    .order('tanggal')
    .order('waktu_mulai')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    nomor_id, tanggal, waktu_mulai,
    waktu_selesai, venue_id, fase, keterangan
  } = body

  if (!nomor_id || !tanggal) {
    return NextResponse.json({ error: 'Nomor dan tanggal wajib diisi' }, { status: 400 })
  }

  const { data, error } = await sb()
    .from('jadwal_pertandingan')
    .insert({
      nomor_id: parseInt(nomor_id),
      tanggal,
      waktu_mulai: waktu_mulai || null,
      waktu_selesai: waktu_selesai || null,
      venue_id: venue_id ? parseInt(venue_id) : null,
      fase: fase || 'Penyisihan',
      keterangan: keterangan || null,
      status: 'Terjadwal',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status, waktu_mulai, waktu_selesai, venue_id, fase, keterangan, tanggal } = body

  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

  const updates: any = {}
  if (status) updates.status = status
  if (tanggal) updates.tanggal = tanggal
  if (waktu_mulai !== undefined) updates.waktu_mulai = waktu_mulai
  if (waktu_selesai !== undefined) updates.waktu_selesai = waktu_selesai
  if (venue_id !== undefined) updates.venue_id = venue_id ? parseInt(venue_id) : null
  if (fase) updates.fase = fase
  if (keterangan !== undefined) updates.keterangan = keterangan

  const { error } = await sb()
    .from('jadwal_pertandingan')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

  const { error } = await sb()
    .from('jadwal_pertandingan')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}