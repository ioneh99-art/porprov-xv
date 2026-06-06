// src/app/api/admin/data-gateway/route.ts
// Secure CRUD endpoint for Data Gateway using service key
// Modules: klasemen | cabor | stats | atlet_bulk

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ── GET ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const module = new URL(req.url).searchParams.get('module')

  if (module === 'klasemen') {
    const { data, error } = await sb
      .from('klasemen_medali')
      .select('id, emas, perak, perunggu, total, kontingen_id, kontingen(id, nama)')
      .order('emas', { ascending: false })
      .order('perak', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  if (module === 'cabor') {
    const { data, error } = await sb
      .from('cabang_olahraga')
      .select('id, nama, is_active')
      .order('nama')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  if (module === 'kontingen') {
    const { data, error } = await sb
      .from('kontingen')
      .select('id, nama')
      .order('nama')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  if (module === 'stats') {
    const tables = [
      { key: 'atlet',           label: 'Atlet' },
      { key: 'kontingen',       label: 'Kontingen' },
      { key: 'klasemen_medali', label: 'Klasemen Medali' },
      { key: 'cabang_olahraga', label: 'Cabang Olahraga' },
      { key: 'atlet_tes_fisik', label: 'Tes Fisik' },
    ]
    const results = await Promise.all(
      tables.map(async t => {
        const { count, error } = await sb
          .from(t.key)
          .select('*', { count: 'exact', head: true })
        return { table: t.key, label: t.label, count: count ?? 0, error: error?.message }
      })
    )
    return NextResponse.json(results)
  }

  return NextResponse.json({ error: 'module required: klasemen | cabor | kontingen | stats' }, { status: 400 })
}

// ── PATCH — update rows ───────────────────────────────────
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { module, data } = body

  if (module === 'klasemen') {
    // Bulk upsert — re-calculate total from emas+perak+perunggu
    const rows = (data as any[]).map(r => ({
      id:           r.id,
      kontingen_id: r.kontingen_id,
      emas:         Number(r.emas)     || 0,
      perak:        Number(r.perak)    || 0,
      perunggu:     Number(r.perunggu) || 0,
      total:        (Number(r.emas) || 0) + (Number(r.perak) || 0) + (Number(r.perunggu) || 0),
    }))
    const { error } = await sb.from('klasemen_medali').upsert(rows, { onConflict: 'id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, updated: rows.length })
  }

  if (module === 'cabor') {
    const { id, nama, is_active } = data
    const { error } = await sb.from('cabang_olahraga')
      .update({ nama: nama?.trim(), is_active })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (module === 'atlet_status') {
    // Bulk status update for a list of atlet IDs
    const { ids, status } = data
    const VALID_STATUS = ['Draft','Menunggu Admin','Verified','Ditolak Admin','Posted']
    if (!VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const { data: updated, error } = await sb
      .from('atlet')
      .update({ status_registrasi: status })
      .in('id', ids)
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, updated: updated?.length ?? 0 })
  }

  return NextResponse.json({ error: 'Unknown module' }, { status: 400 })
}

// ── POST — create row ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { module, data } = body

  if (module === 'cabor') {
    const nama = data.nama?.trim()
    if (!nama) return NextResponse.json({ error: 'nama required' }, { status: 400 })
    const { data: row, error } = await sb
      .from('cabang_olahraga')
      .insert({ nama, is_active: true })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, row })
  }

  if (module === 'klasemen_init') {
    // Init a row for a kontingen that doesn't have one yet
    const { kontingen_id } = data
    const { data: row, error } = await sb
      .from('klasemen_medali')
      .insert({ kontingen_id, emas: 0, perak: 0, perunggu: 0, total: 0 })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, row })
  }

  return NextResponse.json({ error: 'Unknown module' }, { status: 400 })
}

// ── DELETE — remove / deactivate ─────────────────────────
export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { module, id } = body

  if (module === 'cabor') {
    // Soft delete — keeps historical data intact
    const { error } = await sb
      .from('cabang_olahraga')
      .update({ is_active: false })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown module' }, { status: 400 })
}
