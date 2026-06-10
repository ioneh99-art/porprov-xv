/**
 * PentaScore API — Phase Groups
 * GET  /api/pentascore/phases/[id]/groups          → list groups + assigned athletes
 * POST /api/pentascore/phases/[id]/groups          → create group OR auto-distribute
 *      body: { auto: 'snake' | 'sequential', count?: number, source_phase_id?: uuid }
 *      OR:   { group_label: 'A', expected_size: 30 }
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
  const { id: phaseId } = await params

  const { data: groups } = await pscDb
    .from('ps_groups')
    .select(`
      id, phase_id, group_label, expected_size, sort_order,
      ps_group_athletes(
        id, event_athlete_id, position_in_group, qualified_to_next,
        ps_event_athletes(
          id, nama_lengkap, uipm_id, gender, negara_code, affiliation_nama, start_number
        )
      )
    `)
    .eq('phase_id', phaseId)
    .order('sort_order')

  return NextResponse.json(groups ?? [])
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: phaseId } = await params
  const body = await req.json()

  // Fetch phase + event for auto distribution
  const { data: phase } = await pscDb.from('ps_event_phases').select('*').eq('id', phaseId).single()
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

  // Mode: auto-distribute
  if (body.auto) {
    return autoDistribute(phase, body, session)
  }

  // Mode: create single group
  const payload = {
    phase_id:      phaseId,
    group_label:   body.group_label ?? 'A',
    expected_size: body.expected_size ?? null,
    sort_order:    body.sort_order ?? 0,
  }

  const { data, error } = await pscDb.from('ps_groups').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    eventId:        phase.event_id,
    phaseId,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'create',
    targetTable:    'ps_groups',
    targetId:       data.id,
    newValues:      payload,
  })

  return NextResponse.json(data, { status: 201 })
}

// ─────────────────────────────────────────────────────────────────
// AUTO-DISTRIBUTE
// Snake = balanced (1→A, 2→B, 3→C, 4→C, 5→B, 6→A...)
// Sequential = round-robin (1→A, 2→B, 3→C, 4→A, 5→B, 6→C...)
// ─────────────────────────────────────────────────────────────────
async function autoDistribute(phase: any, body: any, session: any) {
  const count: number = body.count ?? 2
  if (count < 1 || count > 8) {
    return NextResponse.json({ error: 'count must be 1-8' }, { status: 400 })
  }
  const mode: 'snake' | 'sequential' = body.auto === 'snake' ? 'snake' : 'sequential'

  // Pull all enrolled athletes for the event filtered by gender
  const { data: enrolled } = await pscDb
    .from('ps_event_athletes')
    .select('id, nama_lengkap, gender, start_number, enrollment_status')
    .eq('event_id', phase.event_id)
    .eq('gender', phase.gender)
    .neq('enrollment_status', 'withdrew')
    .neq('enrollment_status', 'dsq')
    .order('start_number', { ascending: true, nullsFirst: false })

  if (!enrolled?.length) {
    return NextResponse.json({ error: 'No enrolled athletes for this phase gender' }, { status: 400 })
  }

  // Wipe existing groups for this phase first
  const { data: existing } = await pscDb.from('ps_groups').select('id').eq('phase_id', phase.id)
  if (existing?.length) {
    await pscDb.from('ps_groups').delete().eq('phase_id', phase.id)
  }

  // Create N groups
  const groupLabels = ['A','B','C','D','E','F','G','H']
  const groups: any[] = []
  for (let i = 0; i < count; i++) {
    const { data } = await pscDb
      .from('ps_groups')
      .insert({
        phase_id: phase.id,
        group_label: groupLabels[i],
        expected_size: Math.ceil(enrolled.length / count),
        sort_order: i,
      })
      .select()
      .single()
    if (data) groups.push(data)
  }

  // Distribute athletes
  const assignments: any[] = []
  for (let i = 0; i < enrolled.length; i++) {
    const athlete = enrolled[i]
    let groupIdx: number
    if (mode === 'snake') {
      const cyclePos = i % (count * 2)
      groupIdx = cyclePos < count ? cyclePos : (count * 2 - 1 - cyclePos)
    } else {
      groupIdx = i % count
    }
    const group = groups[groupIdx]
    assignments.push({
      group_id: group.id,
      event_athlete_id: athlete.id,
    })
  }

  // Bulk insert assignments
  if (assignments.length) {
    await pscDb.from('ps_group_athletes').insert(assignments)
  }

  await writeAudit({
    eventId:        phase.event_id,
    phaseId:        phase.id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'create',
    targetTable:    'ps_groups',
    newValues:      { auto: mode, count, athletes_assigned: assignments.length },
  })

  return NextResponse.json({
    mode, count,
    groups: groups.map(g => g.group_label),
    athletes_assigned: assignments.length,
  })
}
