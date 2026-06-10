/**
 * PentaScore API — Time-based Discipline Results (Swimming/Obstacle/LaserRun)
 *
 * POST /api/pentascore/results/time
 *   body: {
 *     phase_id: UUID,
 *     discipline: 'swimming' | 'obstacle' | 'laserrun',
 *     results: [{ event_athlete_id, time_centis?, time_str?, penalty_points?, status? }]
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'
import {
  swimmingPts, obstaclePts, laserRunPts,
  timeStrToCentis,
  PENTASCORE_VERSION,
} from '@/lib/sport-plugins/pentathlon/pentascore_v1'

export const dynamic = 'force-dynamic'

const DISCIPLINE_FUNCS = {
  swimming: swimmingPts,
  obstacle: obstaclePts,
  laserrun: laserRunPts,
} as const

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { phase_id, discipline, results } = body
  if (!phase_id || !discipline || !Array.isArray(results)) {
    return NextResponse.json({ error: 'phase_id, discipline, results[] required' }, { status: 400 })
  }
  if (!(discipline in DISCIPLINE_FUNCS)) {
    return NextResponse.json({ error: 'discipline must be swimming|obstacle|laserrun' }, { status: 400 })
  }

  const { data: phase } = await pscDb
    .from('ps_event_phases').select('*').eq('id', phase_id).single()
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })
  if (phase.is_locked) return NextResponse.json({ error: 'Phase is locked' }, { status: 423 })

  const calc = DISCIPLINE_FUNCS[discipline as keyof typeof DISCIPLINE_FUNCS]
  const out: any[] = []
  const errors: any[] = []

  for (const r of results) {
    try {
      // Time input: prefer time_centis (integer), fallback to time_str ('MM:SS.cc')
      let centis: number | null = null
      if (r.time_centis != null && r.time_centis !== '') {
        centis = parseInt(r.time_centis, 10)
        if (isNaN(centis) || centis < 0) throw new Error('Invalid time_centis')
      } else if (r.time_str) {
        try { centis = timeStrToCentis(r.time_str) }
        catch (e: any) { throw new Error(`Invalid time_str: ${e.message}`) }
      }

      const status = r.status ?? 'completed'
      const penalty = parseInt(r.penalty_points ?? 0, 10) || 0

      // Compute MP points
      let mpPoints = 0
      if (status === 'completed' && centis != null) {
        mpPoints = Math.max(0, calc(centis) - penalty)
      }

      const payload = {
        phase_id,
        event_athlete_id: r.event_athlete_id,
        discipline,
        time_centis:      centis,
        status,
        penalty_points:   penalty,
        mp_points:        mpPoints,
        computed_by:      session.username,
        formula_version:  PENTASCORE_VERSION,
      }

      const { data, error } = await pscDb
        .from('ps_results_time')
        .upsert(payload, { onConflict: 'phase_id,event_athlete_id,discipline' })
        .select()
        .single()
      if (error) throw new Error(error.message)
      out.push(data)
    } catch (e: any) {
      errors.push({ event_athlete_id: r.event_athlete_id, error: e.message })
    }
  }

  await writeAudit({
    eventId:        phase.event_id,
    phaseId:        phase_id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'compute',
    targetTable:    'ps_results_time',
    newValues:      { phase_id, discipline, count: out.length, errors: errors.length },
  })

  return NextResponse.json({
    success_count: out.length, error_count: errors.length, results: out, errors,
  })
}
