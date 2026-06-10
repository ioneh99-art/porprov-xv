/**
 * PentaScore API — Event Standings
 *
 * GET /api/pentascore/events/[id]/standings?phase_id=UUID
 *   Returns aggregated live klasemen across all 4 disciplines for a phase.
 *
 * POST /api/pentascore/events/[id]/standings (action: recompute)
 *   Triggers materialization of ps_event_standings from raw results.
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: eventId } = await params
  const { searchParams } = new URL(req.url)
  const phaseId = searchParams.get('phase_id')

  // List all phases for event if no phase_id
  if (!phaseId) {
    const { data: phases } = await pscDb
      .from('ps_event_phases')
      .select('id, phase_type, phase_label, gender, sort_order, is_locked')
      .eq('event_id', eventId)
      .order('sort_order')
    return NextResponse.json({ phases: phases ?? [] })
  }

  const { data: phase } = await pscDb
    .from('ps_event_phases').select('*').eq('id', phaseId).single()
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

  // Compute live standings on-the-fly
  const standings = await computeStandings(eventId, phaseId, phase)
  return NextResponse.json({
    phase,
    standings,
    computed_at: new Date().toISOString(),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: eventId } = await params
  const body = await req.json()
  const phaseId: string = body.phase_id

  if (!phaseId) return NextResponse.json({ error: 'phase_id required' }, { status: 400 })

  const { data: phase } = await pscDb
    .from('ps_event_phases').select('*').eq('id', phaseId).single()
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

  const standings = await computeStandings(eventId, phaseId, phase)

  // Materialize to ps_event_standings (delete existing for phase first, then bulk insert)
  await pscDb.from('ps_event_standings').delete().eq('phase_id', phaseId)
  if (standings.length) {
    const rows = standings.map(s => ({
      phase_id:        phaseId,
      event_athlete_id:s.event_athlete_id,
      fencing_pts:     s.fencing_pts,
      swimming_pts:    s.swimming_pts,
      obstacle_pts:    s.obstacle_pts,
      laserrun_pts:    s.laserrun_pts,
      total_mp_points: s.total_mp_points,
      position:        s.position,
      finish_time:     s.finish_time,
      is_qualified:    s.is_qualified,
    }))
    await pscDb.from('ps_event_standings').insert(rows)
  }

  await writeAudit({
    eventId,
    phaseId,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'compute',
    targetTable:    'ps_event_standings',
    newValues:      { phase_id: phaseId, count: standings.length },
  })

  return NextResponse.json({
    materialized: true,
    count: standings.length,
    standings,
  })
}

// ─────────────────────────────────────────────────────────────────
// Core compute logic
// ─────────────────────────────────────────────────────────────────
async function computeStandings(eventId: string, phaseId: string, phase: any) {
  // For Quali phase: athletes are scoped via ps_group_athletes
  // For Semi/Final: scoped via ps_event_athletes (gender match) - simpler

  let athletesQuery: any[]

  if (phase.phase_type === 'quali') {
    // Get all athletes assigned to groups within this phase
    const { data: groupIds } = await pscDb
      .from('ps_groups').select('id').eq('phase_id', phaseId)
    const ids = (groupIds ?? []).map((g: any) => g.id)
    if (!ids.length) return []
    const { data } = await pscDb
      .from('ps_group_athletes')
      .select(`
        event_athlete_id,
        ps_event_athletes(id, nama_lengkap, uipm_id, gender, negara_code, affiliation_nama, start_number)
      `)
      .in('group_id', ids)
    athletesQuery = data ?? []
  } else {
    // Semi/Final: use enrolled athletes matching gender
    const { data } = await pscDb
      .from('ps_event_athletes')
      .select('id, nama_lengkap, uipm_id, gender, negara_code, affiliation_nama, start_number')
      .eq('event_id', eventId)
      .eq('gender', phase.gender)
    athletesQuery = (data ?? []).map((a: any) => ({
      event_athlete_id: a.id,
      ps_event_athletes: a,
    }))
  }

  // Get fencing results (ranking OR de depending on phase type)
  const eaIds = athletesQuery.map(a => a.event_athlete_id)
  if (!eaIds.length) return []

  let fencingMap: Record<string, number> = {}
  if (phase.phase_type === 'quali') {
    const { data: fc } = await pscDb
      .from('ps_results_fencing_ranking')
      .select('event_athlete_id, mp_points')
      .in('event_athlete_id', eaIds)
    for (const r of fc ?? []) fencingMap[r.event_athlete_id] = r.mp_points
  } else {
    const { data: fc } = await pscDb
      .from('ps_results_fencing_de')
      .select('event_athlete_id, mp_points')
      .eq('phase_id', phaseId)
      .in('event_athlete_id', eaIds)
    for (const r of fc ?? []) fencingMap[r.event_athlete_id] = r.mp_points
  }

  // Get time results
  const { data: timeResults } = await pscDb
    .from('ps_results_time')
    .select('event_athlete_id, discipline, mp_points, time_centis')
    .eq('phase_id', phaseId)
    .in('event_athlete_id', eaIds)

  const swimmingMap: Record<string, number> = {}
  const obstacleMap: Record<string, number> = {}
  const laserrunMap: Record<string, number> = {}
  const laserrunTimeMap: Record<string, number> = {}
  for (const r of timeResults ?? []) {
    if (r.discipline === 'swimming') swimmingMap[r.event_athlete_id] = r.mp_points
    else if (r.discipline === 'obstacle') obstacleMap[r.event_athlete_id] = r.mp_points
    else if (r.discipline === 'laserrun') {
      laserrunMap[r.event_athlete_id] = r.mp_points
      laserrunTimeMap[r.event_athlete_id] = r.time_centis
    }
  }

  // Aggregate
  const rows = athletesQuery.map(a => {
    const ea = a.ps_event_athletes
    const fencing  = fencingMap[a.event_athlete_id]  ?? 0
    const swimming = swimmingMap[a.event_athlete_id] ?? 0
    const obstacle = obstacleMap[a.event_athlete_id] ?? 0
    const laserrun = laserrunMap[a.event_athlete_id] ?? 0
    return {
      event_athlete_id: a.event_athlete_id,
      nama_lengkap:    ea?.nama_lengkap,
      uipm_id:         ea?.uipm_id,
      gender:          ea?.gender,
      negara_code:     ea?.negara_code,
      affiliation_nama:ea?.affiliation_nama,
      start_number:    ea?.start_number,
      fencing_pts:     fencing,
      swimming_pts:    swimming,
      obstacle_pts:    obstacle,
      laserrun_pts:    laserrun,
      total_mp_points: fencing + swimming + obstacle + laserrun,
      finish_time:     laserrunTimeMap[a.event_athlete_id] ?? null,
      is_qualified:    false, // computed below
    }
  })

  // Sort: total DESC, then by laser run time ASC, then by name
  rows.sort((a, b) => {
    if (b.total_mp_points !== a.total_mp_points) return b.total_mp_points - a.total_mp_points
    if (a.finish_time != null && b.finish_time != null) return a.finish_time - b.finish_time
    return (a.nama_lengkap ?? '').localeCompare(b.nama_lengkap ?? '')
  })

  // Assign positions
  const result = rows.map((r, i) => ({ ...r, position: i + 1 }))

  // Quali → top N qualify based on expected_size of NEXT phase (heuristic: 18 for semi, 36 if no semi)
  if (phase.phase_type === 'quali') {
    const { data: nextPhases } = await pscDb
      .from('ps_event_phases')
      .select('phase_type, expected_size')
      .eq('event_id', eventId)
      .neq('id', phaseId)
      .order('sort_order')
    const nextSemi = nextPhases?.find(p => p.phase_type === 'semi')
    const nextFinal = nextPhases?.find(p => p.phase_type === 'final')
    const cutoff = nextSemi?.expected_size ?? nextFinal?.expected_size ?? null
    if (cutoff) {
      // Per phase (group) qualifications need group-level cutoff
      // For now: top X globally across event's qualis
    }
  }

  return result
}
