// src/app/api/operator/prestasi/route.ts
// CRUD riwayat_prestasi untuk operator cabor

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const getSb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  { auth: { persistSession: false } }
)

function getSession() {
  try {
    const val = cookies().get('porprov_session')?.value
    return val ? JSON.parse(val) : null
  } catch { return null }
}

// GET — ambil semua prestasi untuk cabor operator ini
export async function GET() {
  try {
    const sess = getSession()
    if (!sess || !sess.cabor_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sb = getSb()

    const { data: atlets } = await sb
      .from('atlet')
      .select('id')
      .eq('cabor_id', parseInt(sess.cabor_id))

    const ids = (atlets ?? []).map((a: any) => a.id)
    if (ids.length === 0) return NextResponse.json({ data: [] })

    const { data, error } = await sb
      .from('riwayat_prestasi')
      .select('*')
      .in('atlet_id', ids)
      .order('tahun', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — tambah satu record prestasi
export async function POST(req: NextRequest) {
  try {
    const sess = getSession()
    if (!sess || !sess.cabor_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sb = getSb()
    const body = await req.json()

    // Verify atlet belongs to this cabor
    const { data: atlet } = await sb
      .from('atlet')
      .select('id')
      .eq('id', body.atlet_id)
      .eq('cabor_id', parseInt(sess.cabor_id))
      .single()
    if (!atlet) return NextResponse.json({ error: 'Atlet tidak ditemukan atau bukan cabor ini' }, { status: 403 })

    const { data, error } = await sb
      .from('riwayat_prestasi')
      .insert({
        atlet_id:      body.atlet_id,
        event:         body.event,
        tahun:         parseInt(body.tahun),
        lokasi:        body.lokasi || '',
        nomor_tanding: body.nomor_tanding || '',
        hasil:         body.hasil,
        catatan:       body.catatan || '',
        level_event:   body.level_event,
        is_demo:       false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — hapus record
export async function DELETE(req: NextRequest) {
  try {
    const sess = getSession()
    if (!sess || !sess.cabor_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sb = getSb()
    const { id } = await req.json()

    // Verify record belongs to cabor via atlet
    const { data: record } = await sb
      .from('riwayat_prestasi')
      .select('atlet_id')
      .eq('id', id)
      .single()
    if (!record) return NextResponse.json({ error: 'Record tidak ditemukan' }, { status: 404 })

    const { data: atlet } = await sb
      .from('atlet')
      .select('id')
      .eq('id', record.atlet_id)
      .eq('cabor_id', parseInt(sess.cabor_id))
      .single()
    if (!atlet) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 })

    const { error } = await sb.from('riwayat_prestasi').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
