/**
 * PentaScore API — Single group
 * PUT    /api/pentascore/groups/[id]  → update label/size
 * DELETE /api/pentascore/groups/[id]  → delete (athletes go back to unassigned)
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

  const { data: before } = await pscDb.from('ps_groups').select('*, ps_event_phases(event_id)').eq('id', id).single()
  if (!before) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const update: any = {}
  if ('group_label' in body)   update.group_label   = body.group_label
  if ('expected_size' in body) update.expected_size = body.expected_size
  if ('sort_order' in body)    update.sort_order    = body.sort_order

  const { data, error } = await pscDb.from('ps_groups').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    eventId:       before.ps_event_phases?.event_id,
    phaseId:       before.phase_id,
    actorUsername: session.username,
    actorRole:     session.role,
    actionType:    'update',
    targetTable:   'ps_groups',
    targetId:      id,
    oldValues:     before,
    newValues:     update,
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

  const { data: before } = await pscDb.from('ps_groups').select('*, ps_event_phases(event_id)').eq('id', id).single()
  if (!before) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const { error } = await pscDb.from('ps_groups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    eventId:       before.ps_event_phases?.event_id,
    phaseId:       before.phase_id,
    actorUsername: session.username,
    actorRole:     session.role,
    actionType:    'delete',
    targetTable:   'ps_groups',
    targetId:      id,
    oldValues:     before,
  })

  return NextResponse.json({ deleted: true })
}
