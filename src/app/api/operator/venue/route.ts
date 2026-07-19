// src/app/api/operator/venue/route.ts
// J2-5 — CRUD venue lewat server (service key). Wajib sesi. Whitelist kolom. Audit.

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

const FIELDS = ['nama','alamat','kapasitas','is_active','klaster_id']
const pick = (src: any) => { const o: any = {}; for (const k of FIELDS) if (src[k] !== undefined) o[k] = src[k]; return o }
async function need() { const s = await getServerSession(); return s ? { s } : { err: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } }
const meta = (s: any, req: NextRequest, action: string, id: any, sev: any = 'info') => ({
  action, resource: 'venue', resource_id: id, actor_id: s.id != null ? String(s.id) : null,
  actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null, severity: sev, ...reqMeta(req),
})

export async function POST(req: NextRequest) {
  const g = await need(); if (g.err) return g.err
  const row = pick(await req.json().catch(() => ({})))
  if (!row.nama) return NextResponse.json({ error: 'Nama venue wajib.' }, { status: 422 })
  const { data, error } = await sb().from('venue').insert(row).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit(meta(g.s, req, 'CREATE_VENUE', (data as any)?.id))
  return NextResponse.json({ ok: true, id: (data as any)?.id })
}

export async function PATCH(req: NextRequest) {
  const g = await need(); if (g.err) return g.err
  const body = await req.json().catch(() => ({}))
  if (body.id == null) return NextResponse.json({ error: 'id wajib.' }, { status: 400 })
  const updates = pick(body)
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Tidak ada perubahan.' }, { status: 400 })
  const { error } = await sb().from('venue').update(updates).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit(meta(g.s, req, 'UPDATE_VENUE', body.id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const g = await need(); if (g.err) return g.err
  const body = await req.json().catch(() => ({}))
  if (body.id == null) return NextResponse.json({ error: 'id wajib.' }, { status: 400 })
  const { error } = await sb().from('venue').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit(meta(g.s, req, 'DELETE_VENUE', body.id, 'warning'))
  return NextResponse.json({ ok: true })
}
