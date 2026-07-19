// src/app/api/operator/kualifikasi/route.ts
// J2-3 — tulis kualifikasi_atlet lewat server (service key). Wajib sesi operator.
// op: 'upsert' (daftar, onConflict nomor_id,atlet_id) | 'update' (by id / ids / pair).
// Non-admin: nomor yang disentuh harus cabor sendiri. Whitelist kolom. Audit.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ROW_FIELDS = ['nomor_id','atlet_id','kontingen_id','status','catatan','didaftarkan_oleh','dikonfirmasi_oleh','dikonfirmasi_at','heat_number','lane']
const SET_FIELDS = ['status','catatan','dikonfirmasi_oleh','dikonfirmasi_at','didaftarkan_oleh','heat_number','lane']
const pickFrom = (src: any, allow: string[]) => {
  const o: any = {}; for (const k of allow) if (src[k] !== undefined) o[k] = src[k]; return o
}
const isAdmin = (s: any) => ['superadmin','admin','koni_jabar'].includes(s.role) || ['superadmin','koni_jabar'].includes(s.level)

// Pastikan semua nomor_id milik cabor sesi (non-admin). Return null bila OK, else NextResponse error.
async function assertOwnsNomor(db: any, s: any, nomorIds: number[]) {
  if (isAdmin(s) || s.cabor_id == null) return null
  const uniq = Array.from(new Set(nomorIds.filter(v => v != null)))
  if (!uniq.length) return null
  const { data } = await db.from('nomor_pertandingan').select('id,cabor_id').in('id', uniq)
  const bad = (data ?? []).find((n: any) => Number(n.cabor_id) !== Number(s.cabor_id))
  if (bad || (data ?? []).length !== uniq.length)
    return NextResponse.json({ error: 'Ada nomor bukan cabor Anda.' }, { status: 403 })
  return null
}

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const op = body?.op
  const db = sb()

  if (op === 'upsert') {
    const rows: any[] = Array.isArray(body.rows) ? body.rows : []
    if (!rows.length) return NextResponse.json({ error: 'Tidak ada baris.' }, { status: 400 })
    if (rows.length > 2000) return NextResponse.json({ error: 'Maksimal 2000 baris.' }, { status: 413 })
    for (const r of rows) if (r?.nomor_id == null || r?.atlet_id == null)
      return NextResponse.json({ error: 'nomor_id & atlet_id wajib.' }, { status: 422 })
    const own = await assertOwnsNomor(db, s, rows.map(r => r.nomor_id)); if (own) return own
    const clean = rows.map(r => pickFrom(r, ROW_FIELDS))
    const { error } = await db.from('kualifikasi_atlet').upsert(clean, { onConflict: 'nomor_id,atlet_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit({ action: 'KUALIFIKASI_DAFTAR', resource: 'kualifikasi_atlet',
      actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
      payload: { baris: clean.length }, ...reqMeta(req) })
    return NextResponse.json({ ok: true, count: clean.length })
  }

  if (op === 'update') {
    const set = pickFrom(body.set ?? {}, SET_FIELDS)
    if (!Object.keys(set).length) return NextResponse.json({ error: 'set kosong.' }, { status: 400 })
    const m = body.match ?? {}
    let q = db.from('kualifikasi_atlet').update(set)

    if (body.id != null || Array.isArray(body.ids)) {
      const ids = body.ids ?? [body.id]
      const { data: rows } = await db.from('kualifikasi_atlet').select('nomor_id').in('id', ids)
      const own = await assertOwnsNomor(db, s, (rows ?? []).map((r: any) => r.nomor_id)); if (own) return own
      q = q.in('id', ids)
    } else if (m.nomor_id != null || Array.isArray(m.nomor_ids) || m.atlet_id != null) {
      const nomorForCheck = m.nomor_id != null ? [m.nomor_id] : (m.nomor_ids ?? [])
      if (!nomorForCheck.length && !isAdmin(s))
        return NextResponse.json({ error: 'Sasaran wajib menyebut nomor.' }, { status: 400 })
      const own = await assertOwnsNomor(db, s, nomorForCheck); if (own) return own
      if (m.atlet_id != null) q = q.eq('atlet_id', m.atlet_id)
      if (m.nomor_id != null) q = q.eq('nomor_id', m.nomor_id)
      if (Array.isArray(m.nomor_ids)) q = q.in('nomor_id', m.nomor_ids)
    } else {
      return NextResponse.json({ error: 'Sasaran update wajib (id/ids atau match).' }, { status: 400 })
    }
    const { error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit({ action: 'KUALIFIKASI_UPDATE', resource: 'kualifikasi_atlet',
      actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
      payload: { set, target: body.id ?? body.ids ?? m }, ...reqMeta(req) })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'op tidak dikenal.' }, { status: 400 })
}
