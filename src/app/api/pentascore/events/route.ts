/**
 * PentaScore API — Events collection
 * GET  /api/pentascore/events  → list
 * POST /api/pentascore/events  → create
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')

  let q = pscDb
    .from('ps_events')
    .select(`
      id, tenant_id, nama, slug, tanggal_mulai, tanggal_selesai, lokasi,
      age_group, gender_mode, format_type, status,
      has_quali, has_semi, has_final, disciplines, formula_version,
      ps_tenants(nama_pendek, slug, color_primary)
    `)
    .order('tanggal_mulai', { ascending: false })

  if (tenantId) q = q.eq('tenant_id', tenantId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const required = ['tenant_id','nama','slug','tanggal_mulai','tanggal_selesai']
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `${k} is required` }, { status: 400 })
  }

  // Check slug uniqueness within tenant
  const { data: existing } = await pscDb
    .from('ps_events')
    .select('id')
    .eq('tenant_id', body.tenant_id)
    .eq('slug', body.slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: `Slug "${body.slug}" already exists for this tenant` }, { status: 409 })
  }

  const payload = {
    tenant_id:       body.tenant_id,
    nama:            body.nama,
    slug:            body.slug,
    tanggal_mulai:   body.tanggal_mulai,
    tanggal_selesai: body.tanggal_selesai,
    lokasi:          body.lokasi ?? null,
    age_group:       body.age_group ?? 'senior',
    gender_mode:     body.gender_mode ?? 'both',
    format_type:     body.format_type ?? 'individual',
    has_quali:       body.has_quali ?? true,
    has_semi:        body.has_semi ?? false,
    has_final:       body.has_final ?? true,
    disciplines:     body.disciplines ?? ['fencing','swimming','obstacle','laserrun'],
    formula_version: body.formula_version ?? 'uipm-2026-v1',
    status:          body.status ?? 'draft',
    created_by:      session.username,
    notes:           body.notes ?? null,
  }

  const { data, error } = await pscDb
    .from('ps_events')
    .insert(payload)
    .select(`
      id, tenant_id, nama, slug, tanggal_mulai, tanggal_selesai, lokasi,
      age_group, gender_mode, format_type, status,
      has_quali, has_semi, has_final, disciplines, formula_version,
      ps_tenants(nama_pendek, slug, color_primary)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    tenantId:       payload.tenant_id,
    eventId:        data.id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'create',
    targetTable:    'ps_events',
    targetId:       data.id,
    newValues:      payload,
  })

  return NextResponse.json(data, { status: 201 })
}
