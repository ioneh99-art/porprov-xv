/**
 * PentaScore Export Endpoint
 *
 * GET /api/pentascore/events/[id]/export/[type]
 *   type: 'xml' | 'xlsx' | 'result-book' | 'certificate'
 *   query:
 *     phase_id?:   filter to one phase (for xml/xlsx/cert)
 *     athlete_id?: single athlete certificate
 *     print?:      ?print=1 auto-trigger print dialog on HTML
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import { buildUipmXml, type UipmEventMeta, type UipmPhaseExport, type UipmAthleteResult } from '@/lib/pentascore/exports/uipm-xml'
import { buildUipmXlsx } from '@/lib/pentascore/exports/uipm-xlsx'
import { buildCertificateHtml, buildBulkCertificatesHtml } from '@/lib/pentascore/exports/certificate-html'
import { buildResultBookHtml } from '@/lib/pentascore/exports/result-book-html'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: eventId, type } = await params
  const { searchParams } = new URL(req.url)
  const phaseIdFilter = searchParams.get('phase_id')
  const athleteIdFilter = searchParams.get('athlete_id')

  // Fetch event + tenant
  const { data: ev } = await pscDb
    .from('ps_events')
    .select('*, ps_tenants(id, slug, nama, nama_pendek, color_primary, color_secondary, logo_url, tagline)')
    .eq('id', eventId)
    .single()
  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Build meta
  const meta: UipmEventMeta = {
    event_id:         ev.id,
    event_name:       ev.nama,
    event_slug:       ev.slug ?? null,
    tenant_name:      ev.ps_tenants?.nama ?? '',
    tanggal_mulai:    ev.tanggal_mulai,
    tanggal_selesai:  ev.tanggal_selesai,
    lokasi:           ev.lokasi ?? null,
    age_group:        ev.age_group,
    gender_mode:      ev.gender_mode,
    formula_version:  ev.formula_version ?? 'uipm-2026-v1',
    disciplines:      ev.disciplines ?? [],
  }

  // Fetch phases
  let phasesQ = pscDb.from('ps_event_phases')
    .select('*').eq('event_id', eventId)
    .order('sort_order')
  if (phaseIdFilter) phasesQ = phasesQ.eq('id', phaseIdFilter)
  const { data: phases } = await phasesQ
  if (!phases?.length) return NextResponse.json({ error: 'No phases found' }, { status: 404 })

  // Compute results per phase
  const phaseExports: UipmPhaseExport[] = []
  for (const p of phases) {
    const results = await computePhaseExport(eventId, p)
    phaseExports.push({
      phase_type:  p.phase_type,
      phase_label: p.phase_label,
      gender:      p.gender,
      is_locked:   !!p.is_locked,
      results,
    })
  }

  const primary = ev.ps_tenants?.color_primary ?? '#F59E0B'
  const logoUrl = ev.ps_tenants?.logo_url ?? null
  const isPrint = searchParams.get('print') === '1'
  const safeName = ev.nama.replace(/[^a-z0-9-]/gi, '_').toLowerCase()

  // ─── Dispatch based on type ─────────────────────────────────────
  switch (type) {
    case 'xml': {
      const xml = buildUipmXml(meta, phaseExports)
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeName}_uipm.xml"`,
        },
      })
    }
    case 'xlsx': {
      const buf = buildUipmXlsx(meta, phaseExports)
      return new NextResponse(buf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${safeName}_results.xlsx"`,
        },
      })
    }
    case 'result-book': {
      const html = buildResultBookHtml(meta, phaseExports, {
        tenant_color_primary: primary,
        tenant_logo_url: logoUrl,
      })
      return new NextResponse(html + (isPrint ? '<!-- print=1 -->' : ''), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
    case 'certificate': {
      // Single athlete or bulk for first phase
      const phase = phaseExports[0]
      if (!phase) return NextResponse.json({ error: 'No phase data' }, { status: 404 })

      if (athleteIdFilter) {
        const athlete = phase.results.find(a => (a as any).event_athlete_id === athleteIdFilter)
          ?? phase.results.find(a => a.uipm_id === athleteIdFilter)
        if (!athlete) return NextResponse.json({ error: 'Athlete not found in phase' }, { status: 404 })
        const html = buildCertificateHtml({
          meta, athlete,
          phase_label: phase.phase_label,
          tenant_logo_url: logoUrl,
          tenant_color_primary: primary,
        })
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }

      const html = buildBulkCertificatesHtml(
        meta, phase.results, phase.phase_label, logoUrl, primary,
      )
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }
    default:
      return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 })
  }
}

// ─── Compute phase results in UIPM export shape ───────────────────
async function computePhaseExport(eventId: string, phase: any): Promise<UipmAthleteResult[]> {
  // 1. Fetch event athletes (filter by gender)
  let athletes: any[] = []
  if (phase.phase_type === 'quali') {
    const { data: groupIds } = await pscDb.from('ps_groups').select('id').eq('phase_id', phase.id)
    const ids = (groupIds ?? []).map((g: any) => g.id)
    if (!ids.length) return []
    const { data } = await pscDb
      .from('ps_group_athletes')
      .select('event_athlete_id, ps_event_athletes(*)')
      .in('group_id', ids)
    athletes = (data ?? []).map((g: any) => g.ps_event_athletes).filter(Boolean)
  } else {
    const { data } = await pscDb
      .from('ps_event_athletes').select('*').eq('event_id', eventId).eq('gender', phase.gender)
    athletes = data ?? []
  }
  const eaIds = athletes.map(a => a.id)
  if (!eaIds.length) return []

  // 2. Fencing
  const fencingByEa: Record<string, any> = {}
  if (phase.phase_type === 'quali') {
    const { data: fc } = await pscDb.from('ps_results_fencing_ranking')
      .select('*').in('event_athlete_id', eaIds)
    for (const r of fc ?? []) fencingByEa[r.event_athlete_id] = r
  } else {
    const { data: fc } = await pscDb.from('ps_results_fencing_de')
      .select('*').eq('phase_id', phase.id).in('event_athlete_id', eaIds)
    for (const r of fc ?? []) fencingByEa[r.event_athlete_id] = r
  }

  // 3. Time disciplines
  const { data: timeResults } = await pscDb.from('ps_results_time')
    .select('*').eq('phase_id', phase.id).in('event_athlete_id', eaIds)

  const swimMap: Record<string, any> = {}
  const obsMap: Record<string, any> = {}
  const lrMap: Record<string, any> = {}
  for (const r of timeResults ?? []) {
    if (r.discipline === 'swimming') swimMap[r.event_athlete_id] = r
    else if (r.discipline === 'obstacle') obsMap[r.event_athlete_id] = r
    else if (r.discipline === 'laserrun') lrMap[r.event_athlete_id] = r
  }

  const rows: any[] = athletes.map(a => {
    const fc = fencingByEa[a.id]
    const swim = swimMap[a.id]
    const obs = obsMap[a.id]
    const lr = lrMap[a.id]
    return {
      event_athlete_id: a.id,
      start_number:     a.start_number,
      uipm_id:          a.uipm_id,
      nama_lengkap:     a.nama_lengkap,
      gender:           a.gender,
      negara_code:      a.negara_code,
      affiliation_nama: a.affiliation_nama,
      fencing_pts:      fc?.mp_points ?? 0,
      fencing_victories: fc?.victories ?? null,
      fencing_total_bouts: fc?.total_bouts ?? null,
      fencing_red_cards: fc?.red_cards ?? null,
      swimming_pts:     swim?.mp_points ?? 0,
      swimming_time_centis: swim?.time_centis ?? null,
      swimming_penalty: swim?.penalty_points ?? null,
      obstacle_pts:     obs?.mp_points ?? 0,
      obstacle_time_centis: obs?.time_centis ?? null,
      obstacle_penalty: obs?.penalty_points ?? null,
      laserrun_pts:     lr?.mp_points ?? 0,
      laserrun_time_centis: lr?.time_centis ?? null,
      total_mp_points:  (fc?.mp_points ?? 0) + (swim?.mp_points ?? 0) + (obs?.mp_points ?? 0) + (lr?.mp_points ?? 0),
    }
  })

  // Sort + position
  rows.sort((a, b) => {
    if (b.total_mp_points !== a.total_mp_points) return b.total_mp_points - a.total_mp_points
    if (a.laserrun_time_centis != null && b.laserrun_time_centis != null) return a.laserrun_time_centis - b.laserrun_time_centis
    return (a.nama_lengkap ?? '').localeCompare(b.nama_lengkap ?? '')
  })
  rows.forEach((r, i) => r.position = i + 1)

  return rows
}
