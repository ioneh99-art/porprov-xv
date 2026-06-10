/**
 * PentaScore Demo Seed API
 *
 * POST /api/pentascore/demo-seed
 *   body: { tenant_id: string, reset?: boolean }
 *
 * Creates a synthetic PB PI Test Event 2026 with:
 *   - 20 atlet (10 L + 10 P) dengan realistic UIPM ID + start numbers
 *   - 2 phases: Quali L + Quali P, masing-masing 2 groups
 *   - Distributed via auto-assign
 *   - Sample results untuk 50% atlet (untuk demo standings)
 *
 * Used for demo walkthrough — operator klik "Seed Demo" sekali, langsung
 * punya event lengkap untuk show.
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'
import {
  fencingRankingPts, swimmingPts, obstaclePts, laserRunPts,
} from '@/lib/sport-plugins/pentathlon/pentascore_v1'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEMO_EVENT_NAME = 'Demo PentaScore — Tes Verifikasi 2026'

// 20 synthetic athletes (10 L + 10 P)
const DEMO_ATHLETES_L = [
  { nama: 'BORIES Leo',        country: 'FRA', club: 'INSEP Paris' },
  { nama: 'BELAUD Valentin',   country: 'FRA', club: 'Pau MP Club' },
  { nama: 'GRECO Giorgio',     country: 'ITA', club: 'CS Carabinieri' },
  { nama: 'PRADES Christopher',country: 'FRA', club: 'INSEP Paris' },
  { nama: 'WILDAN Ahmad',      country: 'INA', club: 'PB PI Jakarta' },
  { nama: 'PUTRA Rizky',       country: 'INA', club: 'MPI Jabar Bandung' },
  { nama: 'NUGRAHA Aditya',    country: 'INA', club: 'PB PI Jakarta' },
  { nama: 'CHEN Liu',          country: 'CHN', club: 'Beijing MPC' },
  { nama: 'YAMAMOTO Kenji',    country: 'JPN', club: 'Tokyo Pentathlon' },
  { nama: 'KIM Min-Jun',       country: 'KOR', club: 'Seoul Sports HS' },
]

const DEMO_ATHLETES_P = [
  { nama: 'CLOUVEL Elodie',    country: 'FRA', club: 'INSEP Paris' },
  { nama: 'PROKOPENKO Anastasiya', country: 'BLR', club: 'Minsk SC' },
  { nama: 'GULYAS Michelle',   country: 'HUN', club: 'Honved SC' },
  { nama: 'GUZI Blanka',       country: 'HUN', club: 'BHSE Budapest' },
  { nama: 'WAHYUNI Sari',      country: 'INA', club: 'MPI Jabar Bandung' },
  { nama: 'RAHAYU Diah',       country: 'INA', club: 'PB PI Jakarta' },
  { nama: 'PUTRI Anggun',      country: 'INA', club: 'KONI DKI Jakarta' },
  { nama: 'WANG Mei',          country: 'CHN', club: 'Beijing MPC' },
  { nama: 'SUZUKI Yuki',       country: 'JPN', club: 'Tokyo Pentathlon' },
  { nama: 'PARK Soo-Yeon',     country: 'KOR', club: 'Seoul Sports HS' },
]

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tenant_id, reset } = await req.json()
  if (!tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })

  const { data: tenant } = await pscDb.from('ps_tenants').select('*').eq('id', tenant_id).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Optional: delete existing demo event
  if (reset) {
    await pscDb.from('ps_events').delete().eq('tenant_id', tenant_id).eq('nama', DEMO_EVENT_NAME)
  }

  // Check if demo exists
  const { data: existing } = await pscDb.from('ps_events')
    .select('id').eq('tenant_id', tenant_id).eq('nama', DEMO_EVENT_NAME).maybeSingle()
  if (existing) {
    return NextResponse.json({
      error: 'Demo event already exists. Pass reset:true untuk reseed.',
      event_id: existing.id,
    }, { status: 409 })
  }

  const slug = 'demo-pentascore-2026'
  const today = new Date().toISOString().slice(0, 10)

  // 1. Create event
  const { data: ev, error: evErr } = await pscDb.from('ps_events').insert({
    tenant_id,
    slug,
    nama: DEMO_EVENT_NAME,
    tanggal_mulai: today,
    tanggal_selesai: today,
    lokasi: 'Sentul, Bogor',
    age_group: 'senior',
    gender_mode: 'both',
    format_type: 'individual',
    has_quali: true,
    has_semi: false,
    has_final: false,
    disciplines: ['fencing', 'swimming', 'obstacle', 'laserrun'],
    formula_version: 'uipm-2026-v1',
    status: 'live',
  }).select().single()
  if (evErr || !ev) return NextResponse.json({ error: evErr?.message ?? 'Event insert failed' }, { status: 500 })

  // 2. Insert athletes (as event_athletes — immutable snapshot)
  const allAthletes = [
    ...DEMO_ATHLETES_L.map((a, i) => ({ ...a, gender: 'L' as const, sn: 100 + i })),
    ...DEMO_ATHLETES_P.map((a, i) => ({ ...a, gender: 'P' as const, sn: 200 + i })),
  ]

  const athleteInserts = allAthletes.map(a => ({
    event_id: ev.id,
    uipm_id: `DEMO-${a.country}-${a.sn}`,
    nama_lengkap: a.nama,
    gender: a.gender,
    negara_code: a.country,
    affiliation_nama: a.club,
    start_number: a.sn,
  }))

  const { data: insertedAthletes, error: athErr } = await pscDb
    .from('ps_event_athletes').insert(athleteInserts).select()
  if (athErr) return NextResponse.json({ error: athErr.message }, { status: 500 })

  // 3. Create 2 phases (Quali L + Quali P)
  const phaseInserts = [
    { event_id: ev.id, phase_type: 'quali', phase_label: 'Qualifying Round', gender: 'L', sort_order: 1, tanggal: today },
    { event_id: ev.id, phase_type: 'quali', phase_label: 'Qualifying Round', gender: 'P', sort_order: 2, tanggal: today },
  ]
  const { data: phases } = await pscDb.from('ps_event_phases').insert(phaseInserts).select()
  if (!phases?.length) return NextResponse.json({ error: 'Phase insert failed' }, { status: 500 })

  // 4. Create groups for each phase + assign athletes
  let groupsCreated = 0
  let athleteAssignments = 0
  let resultsInserted = 0

  for (const phase of phases) {
    const phaseAthletes = insertedAthletes!.filter((a: any) => a.gender === phase.gender)
    const numGroups = 2
    const groupSize = Math.ceil(phaseAthletes.length / numGroups)

    // Insert 2 groups (A, B)
    const groupInserts = []
    for (let g = 0; g < numGroups; g++) {
      groupInserts.push({
        phase_id: phase.id,
        group_label: String.fromCharCode(65 + g),
        sort_order: g,
        expected_size: groupSize,
      })
    }
    const { data: groups } = await pscDb.from('ps_groups').insert(groupInserts).select()
    if (!groups?.length) continue
    groupsCreated += groups.length

    // Distribute athletes (snake pattern)
    const assignments = []
    for (let i = 0; i < phaseAthletes.length; i++) {
      const groupIdx = i % numGroups
      assignments.push({
        group_id: groups[groupIdx].id,
        event_athlete_id: phaseAthletes[i].id,
        position_in_group: Math.floor(i / numGroups) + 1,
      })
    }
    const { data: ga } = await pscDb.from('ps_group_athletes').insert(assignments).select()
    athleteAssignments += (ga?.length ?? 0)

    // 5. Sample results for 60% of athletes (so demo has interesting standings)
    const sampleCount = Math.floor(phaseAthletes.length * 0.6)
    const sampleAthletes = phaseAthletes.slice(0, sampleCount)

    // Fencing Ranking (skip if group too small for UIPM table 19-60 bouts)
    const totalBouts = groupSize - 1
    if (totalBouts >= 19) {
      for (let i = 0; i < sampleAthletes.length; i++) {
        const a = sampleAthletes[i]
        const groupAssignment = assignments.find(x => x.event_athlete_id === a.id)
        if (!groupAssignment) continue
        const victories = randomInt(Math.max(1, totalBouts - 5), totalBouts - 1)
        const redCards = Math.random() < 0.1 ? 1 : 0
        const mp = fencingRankingPts({ victories, totalBouts, redCards })
        await pscDb.from('ps_results_fencing_ranking').insert({
          group_id: groupAssignment.group_id,
          event_athlete_id: a.id,
          victories,
          defeats: totalBouts - victories,
          total_bouts: totalBouts,
          red_cards: redCards,
          mp_points: mp,
          formula_version: 'uipm-2026-v1',
          status: 'completed',
        })
        resultsInserted++
      }
    } else {
      console.log(`[demo-seed] Skip fencing for phase ${phase.id}: ${totalBouts} bouts < 19 minimum (UIPM Appendix 2B1)`)
    }

    // Swimming + Obstacle + LR for same sample
    for (const a of sampleAthletes) {
      // Swimming: random time 115-145s
      const swimCentis = randomInt(11500, 14500)
      const swimPts = Math.max(0, swimmingPts(swimCentis))
      // Obstacle: random 55-90s
      const obsCentis = randomInt(5500, 9000)
      const obsPts = Math.max(0, obstaclePts(obsCentis))
      // Laser Run: 720-900s
      const lrCentis = randomInt(72000, 90000)
      const lrPts = laserRunPts(lrCentis)

      await pscDb.from('ps_results_time').insert([
        {
          phase_id: phase.id, event_athlete_id: a.id, discipline: 'swimming',
          time_centis: swimCentis, mp_points: swimPts, status: 'completed',
          formula_version: 'uipm-2026-v1',
        },
        {
          phase_id: phase.id, event_athlete_id: a.id, discipline: 'obstacle',
          time_centis: obsCentis, mp_points: obsPts, status: 'completed',
          formula_version: 'uipm-2026-v1',
        },
        {
          phase_id: phase.id, event_athlete_id: a.id, discipline: 'laserrun',
          time_centis: lrCentis, mp_points: lrPts, status: 'completed',
          formula_version: 'uipm-2026-v1',
        },
      ])
      resultsInserted += 3
    }
  }

  await writeAudit({
    tenantId: tenant_id,
    eventId: ev.id,
    actorUsername: session.username,
    actorRole: session.role,
    actionType: 'create',
    targetTable: 'ps_events',
    targetId: ev.id,
    newValues: {
      type: 'demo_seed',
      athletes: allAthletes.length,
      phases: phases.length,
      groups: groupsCreated,
      results: resultsInserted,
    },
    reason: 'Demo data seeding',
  })

  return NextResponse.json({
    success: true,
    event_id: ev.id,
    event_slug: slug,
    tenant_slug: tenant.slug,
    summary: {
      athletes: allAthletes.length,
      phases: phases.length,
      groups: groupsCreated,
      assignments: athleteAssignments,
      results: resultsInserted,
    },
    next_steps: {
      operator_url: `/operator/pentascore/events/${ev.id}`,
      public_url: `/live/${tenant.slug}/${slug}`,
      broadcast_url: `/live/${tenant.slug}/${slug}?mode=broadcast`,
    },
  })
}
