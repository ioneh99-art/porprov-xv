// src/app/api/superadmin/fase/route.ts
// P1f — kelola fase_kompetisi (kunci waktu per tahap). Dijaga middleware /api/superadmin/*
// + cek superadmin. Audit.

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
const FIELDS = ['event_id', 'tipe', 'nama', 'tanggal_buka', 'tanggal_tutup', 'is_active']
const pick = (src: any) => { const o: any = {}; for (const k of FIELDS) if (src[k] !== undefined) o[k] = (src[k] === '' ? null : src[k]); return o }
async function needSuper() {
  const s = await getServerSession()
  if (!s) return { err: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (s.level !== 'superadmin' && s.role !== 'superadmin') return { err: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { s }
}

export async function GET() {
  const g = await needSuper(); if (g.err) return g.err
  const { data, error } = await sb().from('fase_kompetisi').select('*').order('tanggal_buka', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const g = await needSuper(); if (g.err) return g.err
  const body = await req.json().catch(() => ({}))
  if (!body.tipe) return NextResponse.json({ error: 'tipe wajib' }, { status: 400 })
  const row = pick(body)
  const db = sb()
  const res = body.id
    ? await db.from('fase_kompetisi').update(row).eq('id', body.id).select().single()
    : await db.from('fase_kompetisi').insert(row).select().single()
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 })
  await writeAudit({ action: body.id ? 'UPDATE_FASE' : 'CREATE_FASE', resource: 'fase_kompetisi', resource_id: (res.data as any)?.id,
    actor_id: g.s.id != null ? String(g.s.id) : null, actor_email: g.s.username ?? null, actor_role: g.s.role ?? g.s.level ?? null,
    payload: { tipe: body.tipe }, severity: 'warning', ...reqMeta(req) })
  return NextResponse.json({ ok: true, data: res.data })
}

export async function DELETE(req: NextRequest) {
  const g = await needSuper(); if (g.err) return g.err
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  const { error } = await sb().from('fase_kompetisi').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({ action: 'DELETE_FASE', resource: 'fase_kompetisi', resource_id: body.id,
    actor_id: g.s.id != null ? String(g.s.id) : null, actor_email: g.s.username ?? null, actor_role: g.s.role ?? g.s.level ?? null,
    severity: 'warning', ...reqMeta(req) })
  return NextResponse.json({ ok: true })
}
