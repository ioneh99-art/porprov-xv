// src/app/api/superadmin/tenants/route.ts
// J2-2 — tulis tenants (create/update/delete) lewat server. Dijaga middleware
// /api/superadmin/* + cek role superadmin di sini (defense in depth). Audit kritis.
// tenants menyimpan level/plan/is_active — perubahan dari browser anon berbahaya.

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

const FIELDS = [
  'kontingen_id','nama','nama_pendek','color_primary','color_secondary','color_accent',
  'logo_url','tagline','login_slug','login_title','login_subtitle','login_hero_text',
  'login_theme','login_layout','dashboard_type','level','login_stats','login_venues',
  'plan_id','is_active',
]
function pick(src: any) {
  const out: any = {}
  for (const k of FIELDS) if (src[k] !== undefined) out[k] = src[k]
  return out
}

async function requireSuperadmin() {
  const s = await getServerSession()
  if (!s) return { err: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (s.level !== 'superadmin' && s.role !== 'superadmin')
    return { err: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { s }
}

export async function GET() {
  const g = await requireSuperadmin(); if (g.err) return g.err
  const { data, error } = await sb().from('tenants').select('*').order('nama')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const g = await requireSuperadmin(); if (g.err) return g.err
  const body = await req.json().catch(() => ({}))
  if (!body.id || !body.nama) return NextResponse.json({ error: 'id & nama wajib' }, { status: 400 })
  const row = { id: String(body.id), ...pick(body) }
  const { data, error } = await sb().from('tenants').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({
    action: 'CREATE_TENANT', resource: 'tenants', resource_id: row.id,
    actor_id: g.s.id != null ? String(g.s.id) : null, actor_email: g.s.username ?? null,
    actor_role: g.s.role ?? g.s.level ?? null,
    payload: { nama: body.nama, level: body.level, plan_id: body.plan_id }, severity: 'critical', ...reqMeta(req),
  })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: NextRequest) {
  const g = await requireSuperadmin(); if (g.err) return g.err
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  const updates = pick(body)
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })
  const { error } = await sb().from('tenants').update(updates).eq('id', String(body.id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({
    action: 'UPDATE_TENANT', resource: 'tenants', resource_id: String(body.id),
    actor_id: g.s.id != null ? String(g.s.id) : null, actor_email: g.s.username ?? null,
    actor_role: g.s.role ?? g.s.level ?? null,
    payload: updates,
    // level/plan/is_active = sensitif
    severity: ('level' in updates || 'plan_id' in updates || 'is_active' in updates) ? 'critical' : 'info',
    ...reqMeta(req),
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const g = await requireSuperadmin(); if (g.err) return g.err
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  const { error } = await sb().from('tenants').delete().eq('id', String(body.id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({
    action: 'DELETE_TENANT', resource: 'tenants', resource_id: String(body.id),
    actor_id: g.s.id != null ? String(g.s.id) : null, actor_email: g.s.username ?? null,
    actor_role: g.s.role ?? g.s.level ?? null, severity: 'critical', ...reqMeta(req),
  })
  return NextResponse.json({ ok: true })
}
