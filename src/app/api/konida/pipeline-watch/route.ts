// src/app/api/konida/pipeline-watch/route.ts
// KBAAS — serve + insert event_kejurnas_results (service-key, bypass RLS).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await sb
      .from('v_pipeline_watch_jabar')
      .select('*')
      .order('event_date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []
    const summary = {
      total: rows.length,
      kontingen: rows.filter((r: any) => r.atlet_kontingen_id === 4).length,
      jabar: rows.filter((r: any) => String(r.pipeline_tag).includes('JABAR')).length,
      unlinked: rows.filter((r: any) => !r.atlet_id).length,
      medals: rows.filter((r: any) => r.medal).length,
    }
    return NextResponse.json({ rows, summary })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — insert satu record kejurnas baru + auto fuzzy-match ke atlet Kab. Bandung
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Resolve cabor_id dari cabor_nama
    const { data: caborRow } = await sb
      .from('cabang_olahraga')
      .select('id')
      .ilike('nama', body.cabor_nama)
      .limit(1)
      .single()
    const cabor_id = caborRow?.id ?? null

    // Normalize team_name — pastikan mengandung "Jawa Barat" agar muncul di view
    const team_name: string = (body.team_name || '').trim() || 'Jawa Barat'

    const payload = {
      event_name:         body.event_name,
      event_short_name:   body.event_short_name || body.event_name,
      event_date:         body.event_date,
      event_venue:        body.event_venue || null,
      event_organizer:    body.event_organizer || null,
      cabor_id,
      cabor_nama:         body.cabor_nama,
      kategori_umur:      body.kategori_umur || null,
      gender:             body.gender,
      nomor_pertandingan: body.nomor_pertandingan,
      athlete_name_raw:   body.athlete_name_raw,
      year_of_birth:      body.year_of_birth ? Number(body.year_of_birth) : null,
      team_name,
      mark:               body.mark || '-',
      rank:               body.rank ? Number(body.rank) : null,
      status:             body.medal ? 'OK' : (body.status || 'OK'),
      medal:              body.medal || null,
      imported_by:        'operator-ui',
    }

    const { data: inserted, error: insErr } = await sb
      .from('event_kejurnas_results')
      .insert(payload)
      .select()
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // Auto fuzzy-match ke atlet Kab. Bandung (kontingen_id = 4)
    let matchResult: any[] = []
    if (body.athlete_name_raw && body.gender && body.year_of_birth) {
      const { data: matches } = await sb.rpc('match_atlet_fuzzy', {
        p_name:         body.athlete_name_raw,
        p_kontingen_id: 4,
        p_gender:       body.gender,
        p_year:         Number(body.year_of_birth),
        p_threshold:    0.4,
      })
      matchResult = matches ?? []

      // Auto-link jika similarity >= 0.8 (confidence EXACT)
      if (matchResult.length > 0 && matchResult[0].similarity >= 0.8) {
        await sb.from('event_kejurnas_results').update({
          atlet_id:        matchResult[0].atlet_id,
          link_confidence: matchResult[0].similarity >= 0.95 ? 'EXACT' : 'HIGH',
          linked_at:       new Date().toISOString(),
          linked_by:       'auto-fuzzy',
        }).eq('id', inserted.id)
        inserted.atlet_id = matchResult[0].atlet_id
        inserted.link_confidence = matchResult[0].similarity >= 0.95 ? 'EXACT' : 'HIGH'
      }
    }

    return NextResponse.json({ ok: true, data: inserted, matches: matchResult.slice(0, 3) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
