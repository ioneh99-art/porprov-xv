// src/app/api/admin/data-gateway/route.ts
// Endpoint Data Gateway (kunci layanan). Modul: klasemen | cabor | kontingen | stats | atlet_status
//
// Penjagaan (diperbaiki 2026-09-08):
//   BACA  — cukup login.
//   TULIS — dua lapis, karena sebelumnya penjaganya hanya "sudah login atau belum"
//           dan penulisannya TIDAK dibatasi kontingen pemanggil:
//             · atlet_status mengubah status registrasi hanya berdasarkan daftar id,
//               sehingga satu akun mana pun bisa menolak atlet kontingen lain;
//             · klasemen menerima kontingen_id dari kiriman peramban apa adanya,
//               sehingga perolehan medali kontingen mana pun bisa ditulis ulang;
//             · cabor mengubah daftar cabang olahraga secara GLOBAL.
//           Ketiganya kini dibatasi: cabor & klasemen hanya superadmin, sedangkan
//           atlet_status wajib berada dalam kontingen pemanggil.

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/guard'
import { writeAudit, reqMeta } from '@/lib/audit'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

/** Modul yang menyentuh data lintas kontingen — superadmin saja. */
const MODUL_SUPERADMIN = ['klasemen', 'klasemen_init', 'cabor']
const isSuperadmin = (s: any) => s?.level === 'superadmin' || s?.role === 'superadmin'

function tolakBilaBukanSuperadmin(s: any, modul: string | null) {
  if (modul && MODUL_SUPERADMIN.includes(modul) && !isSuperadmin(s)) {
    return NextResponse.json(
      { error: 'Modul ini mengubah data lintas kontingen — hanya superadmin.' }, { status: 403 })
  }
  return null
}

// ── GET ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const _g = await requireRole(); if (_g instanceof NextResponse) return _g
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
  const _g = await requireRole(); if (_g instanceof NextResponse) return _g
  const sesi = _g as any
  const body = await req.json()
  const { module, data } = body

  const _tolak = tolakBilaBukanSuperadmin(sesi, module)
  if (_tolak) return _tolak

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
    // Batasi ke kontingen pemanggil. Tanpa ini satu akun mana pun bisa
    // mengubah status atlet kontingen lain hanya dengan mengirim daftar id.
    let q = sb.from('atlet').update({ status_registrasi: status }).in('id', ids)
    if (!isSuperadmin(sesi)) {
      if (sesi?.kontingen_id == null) {
        return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })
      }
      q = q.eq('kontingen_id', sesi.kontingen_id)
    }
    const { data: updated, error } = await q.select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const ditolak = ids.length - (updated?.length ?? 0)
    await writeAudit({
      action: 'GATEWAY_UBAH_STATUS_ATLET', resource: 'atlet', resource_id: null,
      actor_id: sesi?.id != null ? String(sesi.id) : null,
      actor_email: sesi?.username ?? sesi?.nama ?? null,
      actor_role: sesi?.role ?? sesi?.level ?? null,
      kontingen_id: sesi?.kontingen_id ?? null,
      payload: { status, diminta: ids.length, terubah: updated?.length ?? 0, di_luar_kontingen: ditolak },
      severity: 'warning', ...reqMeta(req),
    })
    return NextResponse.json({
      ok: true, updated: updated?.length ?? 0,
      dilewati_di_luar_kontingen: ditolak > 0 ? ditolak : undefined,
    })
  }

  return NextResponse.json({ error: 'Unknown module' }, { status: 400 })
}

// ── POST — create row ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const _g = await requireRole(); if (_g instanceof NextResponse) return _g
  const sesi = _g as any
  const body = await req.json()
  const { module, data } = body

  const _tolak = tolakBilaBukanSuperadmin(sesi, module)
  if (_tolak) return _tolak

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
  const _g = await requireRole(); if (_g instanceof NextResponse) return _g
  const sesi = _g as any
  const body = await req.json()
  const { module, id } = body

  const _tolak = tolakBilaBukanSuperadmin(sesi, module)
  if (_tolak) return _tolak

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
