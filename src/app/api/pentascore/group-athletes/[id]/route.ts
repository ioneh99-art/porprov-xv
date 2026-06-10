/**
 * PentaScore API — Move athlete between groups (manual reorder)
 *
 * PUT /api/pentascore/group-athletes/[id]
 *   body: { target_group_id?: UUID, position_in_group?: number }
 *
 * Used by DnD UI to:
 *   - Transfer atlet ke group lain dalam same phase
 *   - Reorder dalam group (position_in_group)
 *
 * DELETE /api/pentascore/group-athletes/[id]  → remove from group (unassign)
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

  // Fetch current assignment + phase to validate
  const { data: before } = await pscDb
    .from('ps_group_athletes')
    .select('*, ps_groups(phase_id, ps_event_phases(event_id, is_locked))')
    .eq('id', id)
    .single()

  if (!before) return NextResponse.json({ error: 'Group athlete not found' }, { status: 404 })
  if (before.ps_groups?.ps_event_phases?.is_locked) {
    return NextResponse.json({ error: 'Phase is locked' }, { status: 423 })
  }

  const update: any = {}

  // Move to different group (must be in same phase)
  if (body.target_group_id && body.target_group_id !== before.group_id) {
    const { data: targetGroup } = await pscDb
      .from('ps_groups').select('phase_id').eq('id', body.target_group_id).single()
    if (!targetGroup) return NextResponse.json({ error: 'Target group not found' }, { status: 404 })
    if (targetGroup.phase_id !== before.ps_groups.phase_id) {
      return NextResponse.json({ error: 'Cannot move between different phases' }, { status: 400 })
    }
    update.group_id = body.target_group_id
  }

  if (body.position_in_group != null) {
    update.position_in_group = parseInt(body.position_in_group, 10)
  }

  const { data, error } = await pscDb
    .from('ps_group_athletes')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    eventId:       before.ps_groups?.ps_event_phases?.event_id,
    phaseId:       before.ps_groups?.phase_id,
    actorUsername: session.username,
    actorRole:     session.role,
    actionType:    'update',
    targetTable:   'ps_group_athletes',
    targetId:      id,
    oldValues:     { group_id: before.group_id, position_in_group: before.position_in_group },
    newValues:     update,
    reason:        body.reason ?? 'manual drag-and-drop reorder',
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

  const { data: before } = await pscDb
    .from('ps_group_athletes')
    .select('*, ps_groups(phase_id, ps_event_phases(event_id, is_locked))')
    .eq('id', id)
    .single()

  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (before.ps_groups?.ps_event_phases?.is_locked) {
    return NextResponse.json({ error: 'Phase is locked' }, { status: 423 })
  }

  const { error } = await pscDb.from('ps_group_athletes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    eventId:       before.ps_groups?.ps_event_phases?.event_id,
    phaseId:       before.ps_groups?.phase_id,
    actorUsername: session.username,
    actorRole:     session.role,
    actionType:    'delete',
    targetTable:   'ps_group_athletes',
    targetId:      id,
    oldValues:     before,
  })

  return NextResponse.json({ deleted: true })
}
