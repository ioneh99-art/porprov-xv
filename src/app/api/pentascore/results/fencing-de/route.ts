/**
 * PentaScore API — Fencing Direct Elimination Results (Semi/Final)
 *
 * POST /api/pentascore/results/fencing-de
 *   body: {
 *     phase_id: UUID,
 *     results: [{ event_athlete_id, de_position, seeding_position?, seeding_v?, seeding_d? }]
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'
import { fencingDEPts, PENTASCORE_VERSION } from '@/lib/sport-plugins/pentathlon/pentascore_v1'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { phase_id, results } = body
  if (!phase_id || !Array.isArray(results)) {
    return NextResponse.json({ error: 'phase_id and results[] required' }, { status: 400 })
  }

  const { data: phase } = await pscDb
    .from('ps_event_phases').select('*').eq('id', phase_id).single()
  if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })
  if (phase.is_locked) return NextResponse.json({ error: 'Phase is locked' }, { status: 423 })

  const out: any[] = []
  const errors: any[] = []

  for (const r of results) {
    try {
      const dePos = parseInt(r.de_position, 10)
      if (isNaN(dePos) || dePos < 1 || dePos > 18) {
        throw new Error(`de_position must be 1-18 (got ${r.de_position})`)
      }

      const mpPoints = (r.status === 'eli' || r.status === 'dsq') ? 0 : fencingDEPts(dePos)

      const payload = {
        phase_id,
        event_athlete_id:    r.event_athlete_id,
        de_position:         dePos,
        seeding_position:    r.seeding_position ?? null,
        seeding_victories:   r.seeding_victories ?? null,
        seeding_defeats:     r.seeding_defeats ?? null,
        mp_points:           mpPoints,
        status:              r.status ?? 'completed',
        computed_by:         session.username,
        formula_version:     PENTASCORE_VERSION,
      }

      const { data, error } = await pscDb
        .from('ps_results_fencing_de')
        .upsert(payload, { onConflict: 'phase_id,event_athlete_id' })
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
    targetTable:    'ps_results_fencing_de',
    newValues:      { phase_id, count: out.length, errors: errors.length },
  })

  return NextResponse.json({
    success_count: out.length, error_count: errors.length, results: out, errors,
  })
}
