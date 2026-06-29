// src/app/api/konida/refresh-pesaing/route.ts
// KBAAS Fase 2.7 — refresh pesaing baseline dari lawan di nomor kejurnas yang sama.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const medalRank = (m: string | null) => m === 'EMAS' ? 0 : m === 'PERAK' ? 1 : m === 'PERUNGGU' ? 2 : 3
const validMark = (m: string | null) => !!m && /^\d/.test(m)

export async function POST(req: NextRequest) {
  const { atlet_id } = await req.json().catch(() => ({}))
  if (!atlet_id) return NextResponse.json({ error: 'atlet_id required' }, { status: 400 })
  try {
    const { data: atlet } = await sb.from('atlet').select('gender').eq('id', atlet_id).single()
    if (!atlet) return NextResponse.json({ error: 'atlet not found' }, { status: 404 })
    const gEvent = atlet.gender === 'L' ? 'Pa' : 'Pi'

    // nomor yang pernah diikuti atlet ini di kejurnas
    const { data: mine } = await sb.from('event_kejurnas_results').select('nomor_pertandingan').eq('atlet_id', atlet_id)
    const nomors = Array.from(new Set((mine ?? []).map((r: any) => r.nomor_pertandingan)))
    if (nomors.length === 0) return NextResponse.json({ updated: 0, pesaing: null, message: 'Atlet belum punya data kejurnas' })

    const cutoff = new Date(Date.now() - 18 * 30 * 864e5).toISOString().slice(0, 10)
    const { data: cand } = await sb.from('event_kejurnas_results')
      .select('athlete_name_raw, team_name, mark, medal, rank, event_date, atlet_id, nomor_pertandingan')
      .in('nomor_pertandingan', nomors).eq('gender', gEvent).eq('status', 'OK').gte('event_date', cutoff)

    const rivals = (cand ?? [])
      .filter((r: any) => r.atlet_id !== atlet_id && validMark(r.mark))
      .sort((a: any, b: any) => medalRank(a.medal) - medalRank(b.medal) || (a.rank ?? 99) - (b.rank ?? 99) || String(b.event_date).localeCompare(String(a.event_date)))

    // dedupe by nama
    const seen = new Set<string>(); const top: any[] = []
    for (const r of rivals) { if (seen.has(r.athlete_name_raw)) continue; seen.add(r.athlete_name_raw); top.push(r); if (top.length >= 5) break }

    if (top.length === 0) return NextResponse.json({ updated: 0, pesaing: null, message: 'Tidak ada pesaing relevan di data kejurnas' })

    const pesaing = top.map(r => `${r.athlete_name_raw} (${r.team_name}, ${r.mark}${r.medal ? ' ' + r.medal : ''})`).join('; ')

    const { data: upd, error } = await sb.from('atlet_baseline_performance')
      .update({ pesaing, updated_at: new Date().toISOString() })
      .eq('atlet_id', atlet_id).eq('is_latest', true).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ updated: upd?.length ?? 0, pesaing, count: top.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
