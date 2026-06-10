/**
 * PentaScore API — Tenants collection
 * GET  /api/pentascore/tenants  → list tenants
 * POST /api/pentascore/tenants  → create tenant
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await pscDb
    .from('ps_tenants')
    .select('*')
    .order('nama')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.slug || !body.nama) {
    return NextResponse.json({ error: 'slug and nama are required' }, { status: 400 })
  }

  // Check slug uniqueness
  const { data: existing } = await pscDb
    .from('ps_tenants')
    .select('id')
    .eq('slug', body.slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: `Slug "${body.slug}" already exists` }, { status: 409 })
  }

  const payload = {
    slug:            body.slug,
    nama:            body.nama,
    nama_pendek:     body.nama_pendek ?? null,
    tipe:            body.tipe ?? 'federasi',
    level:           body.level ?? 'regional',
    color_primary:   body.color_primary ?? '#F59E0B',
    color_secondary: body.color_secondary ?? '#1F2937',
    tagline:         body.tagline ?? null,
    email_kontak:    body.email_kontak ?? null,
    telepon:         body.telepon ?? null,
    alamat:          body.alamat ?? null,
    is_active:       body.is_active ?? true,
    created_by:      session.username,
    notes:           body.notes ?? null,
  }

  const { data, error } = await pscDb
    .from('ps_tenants')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    tenantId:       data.id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'create',
    targetTable:    'ps_tenants',
    targetId:       data.id,
    newValues:      payload,
  })

  return NextResponse.json(data, { status: 201 })
}
