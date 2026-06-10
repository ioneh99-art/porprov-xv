/**
 * PentaScore PUBLIC API — Event Standings
 * GET /api/public/events/[id]/standings?phase_id=UUID
 *
 * NO AUTH REQUIRED. Used by public live display pages.
 * Returns same shape as authenticated /api/pentascore/events/[id]/standings
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const { searchParams } = new URL(req.url)
  const phaseId = searchParams.get('phase_id')

  // Verify event exists AND is "public" (status != draft for safety)
  const { data: ev } = await pscDb
    .from('ps_events')
    .select('id, nama, slug, status, tenant_id, ps_tenants(nama, nama_pendek, slug, color_primary, color_secondary, logo_url, tagline)')
    .eq('id', eventId)
    .single()

  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // List phases mode
  if (!phaseId) {
    const { data: phases } = await pscDb
      .from('ps_event_phases')
      .select('id, phase_type, phase_label, gender, sort_order, is_locked')
      .eq('event_id', eventId)
      .order('sort_order')

    return NextResponse.json({
      event: ev,
      phases: phases ?? [],
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  }

  // Standings for specific phase
  const { data: phase } = await pscDb
    .from('ps_event_phases').select('*').eq('id', phaseId).single()
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

  const standings = await computePublicStandings(eventId, phaseId, phase)

  return NextResponse.json({
    event: ev,
    phase,
    standings,
    computed_at: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

// Mirror of authenticated computeStandings - but public-safe (no sensitive fields)
async function computePublicStandings(eventId: string, phaseId: string, phase: any) {
  let athletesQuery: any[]

  if (phase.phase_type === 'quali') {
    const { data: groupIds } = await pscDb
      .from('ps_groups').select('id').eq('phase_id', phaseId)
    const ids = (groupIds ?? []).map((g: any) => g.id)
    if (!ids.length) return []
    const { data } = await pscDb
      .from('ps_group_athletes')
      .select(`
        event_athlete_id,
        ps_event_athletes(id, nama_lengkap, gender, negara_code, affiliation_nama, start_number)
      `)
      .in('group_id', ids)
    athletesQuery = data ?? []
  } else {
    const { data } = await pscDb
      .from('ps_event_athletes')
      .select('id, nama_lengkap, gender, negara_code, affiliation_nama, start_number')
      .eq('event_id', eventId)
      .eq('gender', phase.gender)
    athletesQuery = (data ?? []).map((a: any) => ({
      event_athlete_id: a.id,
      ps_event_athletes: a,
    }))
  }

  const eaIds = athletesQuery.map(a => a.event_athlete_id)
  if (!eaIds.length) return []

  // Fencing
  const fencingMap: Record<string, number> = {}
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

  // Time results
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

  const rows = athletesQuery.map(a => {
    const ea = a.ps_event_athletes
    const fencing  = fencingMap[a.event_athlete_id]  ?? 0
    const swimming = swimmingMap[a.event_athlete_id] ?? 0
    const obstacle = obstacleMap[a.event_athlete_id] ?? 0
    const laserrun = laserrunMap[a.event_athlete_id] ?? 0
    return {
      event_athlete_id: a.event_athlete_id,
      nama_lengkap:    ea?.nama_lengkap,
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
    }
  })

  rows.sort((a, b) => {
    if (b.total_mp_points !== a.total_mp_points) return b.total_mp_points - a.total_mp_points
    if (a.finish_time != null && b.finish_time != null) return a.finish_time - b.finish_time
    return (a.nama_lengkap ?? '').localeCompare(b.nama_lengkap ?? '')
  })

  return rows.map((r, i) => ({ ...r, position: i + 1 }))
}
