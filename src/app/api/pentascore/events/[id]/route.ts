/**
 * PentaScore API — Single event
 * GET    /api/pentascore/events/[id]  → fetch with phases/athletes count
 * PUT    /api/pentascore/events/[id]  → update
 * DELETE /api/pentascore/events/[id]  → delete (cascade)
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await pscDb
    .from('ps_events')
    .select(`
      *, ps_tenants(nama, nama_pendek, slug, color_primary)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // Athletes count
  const { count: athleteCount } = await pscDb
    .from('ps_event_athletes')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)

  return NextResponse.json({ ...data, athlete_count: athleteCount ?? 0 })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const { data: before } = await pscDb
    .from('ps_events').select('*').eq('id', id).single()

  if (!before) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Note: formula_version is locked once event has results - safer to disallow change here
  const allowed = [
    'nama','lokasi','tanggal_mulai','tanggal_selesai',
    'age_group','gender_mode','format_type',
    'has_quali','has_semi','has_final','disciplines',
    'status','notes',
  ]
  const update: any = {}
  for (const k of allowed) if (k in body) update[k] = body[k]

  const { data, error } = await pscDb
    .from('ps_events').update(update).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    tenantId:       before.tenant_id,
    eventId:        id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'update',
    targetTable:    'ps_events',
    targetId:       id,
    oldValues:      before,
    newValues:      update,
  })

  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['superadmin','tenant_admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { data: before } = await pscDb
    .from('ps_events').select('*').eq('id', id).single()
  if (!before) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { error } = await pscDb.from('ps_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    tenantId:       before.tenant_id,
    eventId:        id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'delete',
    targetTable:    'ps_events',
    targetId:       id,
    oldValues:      before,
    reason:         'Event deletion',
  })

  return NextResponse.json({ deleted: true, id })
}
