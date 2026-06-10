/**
 * PentaScore API — Event Phases
 * GET  /api/pentascore/events/[id]/phases  → list phases for event
 * POST /api/pentascore/events/[id]/phases  → create new phase
 *
 * Also supports auto-generation via ?auto=quali_only|standard|full
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
  const { id: eventId } = await params

  const { data, error } = await pscDb
    .from('ps_event_phases')
    .select(`
      *,
      ps_groups(id, group_label, expected_size, sort_order)
    `)
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: eventId } = await params
  const body = await req.json()

  // Auto-generate flow
  if (body.auto) {
    return autoGeneratePhases(eventId, body.auto, body.gender_mode ?? 'both', session)
  }

  // Single phase creation
  const required = ['phase_type', 'phase_label', 'gender']
  for (const k of required) if (!body[k]) {
    return NextResponse.json({ error: `${k} is required` }, { status: 400 })
  }

  const payload = {
    event_id:      eventId,
    phase_type:    body.phase_type,
    phase_label:   body.phase_label,
    gender:        body.gender,
    tanggal:       body.tanggal ?? null,
    waktu_mulai:   body.waktu_mulai ?? null,
    expected_size: body.expected_size ?? null,
    sort_order:    body.sort_order ?? 0,
  }

  const { data, error } = await pscDb
    .from('ps_event_phases')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    eventId, phaseId: data.id,
    actorUsername: session.username,
    actorRole:     session.role,
    actionType:    'create',
    targetTable:   'ps_event_phases',
    targetId:      data.id,
    newValues:     payload,
  })

  return NextResponse.json(data, { status: 201 })
}

// ─────────────────────────────────────────────────────────────────
// Auto-generate phase template
// ─────────────────────────────────────────────────────────────────
async function autoGeneratePhases(
  eventId: string,
  template: string,
  genderMode: string,
  session: any
) {
  const genders: ('L' | 'P')[] =
    genderMode === 'men' ? ['L'] :
    genderMode === 'women' ? ['P'] :
    ['L', 'P']

  // Phase templates
  const templates: Record<string, Array<{ type: string; label: string; size?: number }>> = {
    quali_only: [
      { type: 'quali', label: 'Quali A' },
    ],
    standard: [
      { type: 'quali', label: 'Quali A' },
      { type: 'quali', label: 'Quali B' },
      { type: 'final', label: 'Final', size: 18 },
    ],
    full: [
      { type: 'quali', label: 'Quali A' },
      { type: 'quali', label: 'Quali B' },
      { type: 'quali', label: 'Quali C' },
      { type: 'quali', label: 'Quali D' },
      { type: 'semi',  label: 'Semi A',  size: 18 },
      { type: 'semi',  label: 'Semi B',  size: 18 },
      { type: 'final', label: 'Final',   size: 18 },
    ],
  }

  const def = templates[template]
  if (!def) {
    return NextResponse.json({ error: `Unknown template "${template}"` }, { status: 400 })
  }

  const created: any[] = []
  let order = 0

  for (const gender of genders) {
    for (const t of def) {
      const payload = {
        event_id:      eventId,
        phase_type:    t.type,
        phase_label:   t.label,
        gender,
        expected_size: t.size ?? null,
        sort_order:    order++,
      }
      const { data, error } = await pscDb
        .from('ps_event_phases')
        .insert(payload)
        .select()
        .single()

      if (data) created.push(data)
      if (error && !error.message.includes('duplicate')) {
        console.error('autoGenerate err:', error)
      }
    }
  }

  await writeAudit({
    eventId,
    actorUsername: session.username,
    actorRole:     session.role,
    actionType:    'create',
    targetTable:   'ps_event_phases',
    newValues:     { auto_template: template, created_count: created.length },
  })

  return NextResponse.json({ template, created }, { status: 201 })
}
