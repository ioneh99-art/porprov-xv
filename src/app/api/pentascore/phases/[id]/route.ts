/**
 * PentaScore API — Single phase
 * PUT    /api/pentascore/phases/[id]      → update (incl. lock toggle)
 * DELETE /api/pentascore/phases/[id]      → delete cascade
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const { data: before } = await pscDb
    .from('ps_event_phases').select('*').eq('id', id).single()
  if (!before) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

  // Defense L4: locking
  const update: any = {}
  const allowed = ['phase_label','tanggal','waktu_mulai','expected_size','sort_order']
  for (const k of allowed) if (k in body) update[k] = body[k]

  // Lock/unlock handling
  if ('is_locked' in body) {
    update.is_locked = body.is_locked
    if (body.is_locked) {
      update.locked_at = new Date().toISOString()
      update.locked_by = session.username
    } else {
      // Unlock requires reason
      if (!body.reason) {
        return NextResponse.json({ error: 'Unlock requires reason field' }, { status: 400 })
      }
      update.locked_at = null
      update.locked_by = null
    }
  }

  const { data, error } = await pscDb
    .from('ps_event_phases')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    eventId:        before.event_id,
    phaseId:        id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'is_locked' in body ? (body.is_locked ? 'lock' : 'unlock') : 'update',
    targetTable:    'ps_event_phases',
    targetId:       id,
    oldValues:      before,
    newValues:      update,
    reason:         body.reason,
  })

  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: before } = await pscDb.from('ps_event_phases').select('*').eq('id', id).single()
  if (!before) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

  if (before.is_locked) {
    return NextResponse.json({ error: 'Phase is locked. Unlock first.' }, { status: 423 })
  }

  const { error } = await pscDb.from('ps_event_phases').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    eventId:        before.event_id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'delete',
    targetTable:    'ps_event_phases',
    targetId:       id,
    oldValues:      before,
  })

  return NextResponse.json({ deleted: true })
}
