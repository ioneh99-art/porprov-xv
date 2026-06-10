/**
 * PentaScore API — Fencing Ranking Round Results
 *
 * POST /api/pentascore/results/fencing-ranking
 *   body: {
 *     group_id: UUID,
 *     results: [{ event_athlete_id, victories, defeats, red_cards?, black_card? }]
 *   }
 *
 * Server-side computes MP points using verified pentascore_v1 engine.
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'
import { fencingRankingPts, PENTASCORE_VERSION } from '@/lib/sport-plugins/pentathlon/pentascore_v1'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { group_id, results } = body
  if (!group_id || !Array.isArray(results)) {
    return NextResponse.json({ error: 'group_id and results[] required' }, { status: 400 })
  }

  // Fetch group + phase context
  const { data: group } = await pscDb
    .from('ps_groups')
    .select('*, ps_event_phases(event_id, is_locked)')
    .eq('id', group_id)
    .single()
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (group.ps_event_phases?.is_locked) {
    return NextResponse.json({ error: 'Phase is locked' }, { status: 423 })
  }

  // Total bouts in this group = group_size - 1 (round-robin)
  const { count: groupSize } = await pscDb
    .from('ps_group_athletes')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group_id)

  if (!groupSize || groupSize < 2) {
    return NextResponse.json({ error: 'Group needs at least 2 athletes' }, { status: 400 })
  }
  const totalBouts = groupSize - 1

  if (totalBouts < 19 || totalBouts > 60) {
    return NextResponse.json({
      error: `Total bouts ${totalBouts} outside Appendix 2B1 range (19-60). Group size must be 20-61.`
    }, { status: 400 })
  }

  // Compute + upsert each result
  const out: any[] = []
  const errors: any[] = []

  for (const r of results) {
    try {
      const victories  = parseInt(r.victories, 10)
      const defeats    = parseInt(r.defeats, 10)
      const redCards   = parseInt(r.red_cards ?? 0, 10)
      const blackCard  = !!r.black_card

      if (isNaN(victories) || isNaN(defeats)) throw new Error('Invalid V/D')
      if (victories + defeats !== totalBouts) {
        throw new Error(`V+D (${victories}+${defeats}=${victories+defeats}) ≠ totalBouts (${totalBouts})`)
      }
      if (victories < 0 || defeats < 0 || redCards < 0) throw new Error('Negative values not allowed')

      // Compute MP points
      let mpPoints = blackCard ? 0 : fencingRankingPts({ victories, totalBouts, redCards })
      const status = blackCard ? 'dsq' : (r.status ?? 'completed')

      // Upsert
      const payload = {
        group_id,
        event_athlete_id: r.event_athlete_id,
        victories,
        defeats,
        total_bouts:      totalBouts,
        red_cards:        redCards,
        black_card:       blackCard,
        mp_points:        mpPoints,
        status,
        computed_by:      session.username,
        formula_version:  PENTASCORE_VERSION,
      }
      const { data, error } = await pscDb
        .from('ps_results_fencing_ranking')
        .upsert(payload, { onConflict: 'group_id,event_athlete_id' })
        .select()
        .single()
      if (error) throw new Error(error.message)
      out.push(data)
    } catch (e: any) {
      errors.push({ event_athlete_id: r.event_athlete_id, error: e.message })
    }
  }

  await writeAudit({
    eventId:        group.ps_event_phases?.event_id,
    phaseId:        group.phase_id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'compute',
    targetTable:    'ps_results_fencing_ranking',
    newValues:      { group_id, count: out.length, errors: errors.length },
  })

  return NextResponse.json({
    success_count: out.length,
    error_count:   errors.length,
    results:       out,
    errors,
  })
}
