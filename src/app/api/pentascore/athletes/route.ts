/**
 * PentaScore API — Athletes collection
 * GET  /api/pentascore/athletes  → list (optional ?tenant_id, ?event_id)
 * POST /api/pentascore/athletes  → create master athlete + optional auto-enroll
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')
  const eventId  = searchParams.get('event_id')
  const limit    = parseInt(searchParams.get('limit') ?? '500', 10)

  if (eventId) {
    // Return enrolled athletes for the event
    const { data, error } = await pscDb
      .from('ps_event_athletes')
      .select('*')
      .eq('event_id', eventId)
      .order('start_number', { ascending: true, nullsFirst: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  let q = pscDb
    .from('ps_athletes')
    .select('*, ps_tenants(nama_pendek, color_primary)')
    .order('nama_lengkap')
    .limit(limit)

  if (tenantId) q = q.eq('tenant_id', tenantId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.nama_lengkap || !body.gender) {
    return NextResponse.json({ error: 'nama_lengkap and gender are required' }, { status: 400 })
  }
  if (!['L','P'].includes(body.gender)) {
    return NextResponse.json({ error: 'gender must be L or P' }, { status: 400 })
  }

  const athletePayload = {
    tenant_id:        body.tenant_id ?? null,
    uipm_id:          body.uipm_id ?? null,
    nama_lengkap:     body.nama_lengkap,
    nama_belakang:    body.nama_belakang ?? null,
    nama_depan:       body.nama_depan ?? null,
    gender:           body.gender,
    tanggal_lahir:    body.tanggal_lahir ?? null,
    negara_code:      body.negara_code ?? 'IDN',
    negara_nama:      body.negara_nama ?? 'Indonesia',
    affiliation_nama: body.affiliation_nama ?? null,
    affiliation_kode: body.affiliation_kode ?? null,
    is_active:        body.is_active ?? true,
    created_by:       session.username,
    notes:            body.notes ?? null,
  }

  const { data, error } = await pscDb
    .from('ps_athletes')
    .insert(athletePayload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    tenantId:       data.tenant_id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'create',
    targetTable:    'ps_athletes',
    targetId:       data.id,
    newValues:      athletePayload,
  })

  // Optional auto-enrollment if event_id provided
  if (body.event_id) {
    const snapshot = {
      event_id:         body.event_id,
      athlete_id:       data.id,
      nama_lengkap:     data.nama_lengkap,
      uipm_id:          data.uipm_id,
      gender:           data.gender,
      tanggal_lahir:    data.tanggal_lahir,
      negara_code:      data.negara_code,
      affiliation_nama: data.affiliation_nama,
      start_number:     body.start_number ?? null,
      enrollment_status:'registered',
      enrolled_by:      session.username,
      source:           'manual',
    }
    await pscDb.from('ps_event_athletes').insert(snapshot)
  }

  return NextResponse.json(data, { status: 201 })
}
