// src/app/api/konida/talent-lobby/route.ts
// KBAAS Fase 3.11 — Talent Lobby (SENSITIF). List kandidat Jabar + flag (audit trail).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function actor(): string {
  try { const s = cookies().get('porprov_session')?.value; if (s) { const u = JSON.parse(s); return u.nama || u.username || 'operator' } } catch {}
  return 'operator'
}

export async function GET() {
  try {
    const { data, error } = await sb.from('v_talent_lobby_jabar').select('*')
      .eq('is_eligible_candidate', true).order('event_date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ candidates: data ?? [] })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => ({}))
    const { event_id, reason } = b
    if (!event_id || !reason) return NextResponse.json({ error: 'event_id & reason wajib' }, { status: 400 })
    const by = actor()

    const { data: ekr } = await sb.from('event_kejurnas_results')
      .select('athlete_name_raw, team_name, year_of_birth, gender, cabor_nama, nomor_pertandingan, mark, medal, event_date')
      .eq('id', event_id).single()
    if (!ekr) return NextResponse.json({ error: 'event not found' }, { status: 404 })

    const { data: cand, error } = await sb.from('talent_lobby_candidates').upsert({
      source_event_kejurnas_id: event_id,
      candidate_name: ekr.athlete_name_raw, candidate_team: ekr.team_name,
      candidate_year_of_birth: ekr.year_of_birth, candidate_gender: ekr.gender,
      cabor_nama: ekr.cabor_nama, nomor_pertandingan: ekr.nomor_pertandingan,
      best_result: ekr.mark, medal: ekr.medal, event_date: ekr.event_date,
      flagged_for_recruitment: true, flagged_at: new Date().toISOString(), flagged_by: by,
      flagged_reason: reason, target_kontingen_id: 4, updated_at: new Date().toISOString(),
    }, { onConflict: 'source_event_kejurnas_id' }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sb.from('talent_lobby_audit_log').insert({
      candidate_id: cand?.id, action_type: 'FLAG_CANDIDATE',
      action_data: { event_id, reason }, performed_by: by,
    })
    return NextResponse.json({ ok: true, candidate_id: cand?.id })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
