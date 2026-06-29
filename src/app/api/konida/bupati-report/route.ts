// src/app/api/konida/bupati-report/route.ts
// KBAAS Fase 3.9 — data laporan kuartalan Bupati (service-key, kontingen 4).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const KON = 4

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(_req: NextRequest) {
  try {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3) + 1
    const year = now.getFullYear()
    const cutoff = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10)

    // total atlet + cabor
    const { data: atletRows } = await sb.from('atlet').select('cabor_nama_raw').eq('kontingen_id', KON)
    const totalAtlet = atletRows?.length ?? 0
    const totalCabor = new Set((atletRows ?? []).map((a: any) => a.cabor_nama_raw)).size

    // atlet andalan: medali kejurnas (≤180 hari), atlet kontingen 4
    const { data: andalan } = await sb.from('event_kejurnas_results')
      .select('athlete_name_raw, medal, mark, nomor_pertandingan, kategori_umur, gender, event_date, event_name, event_venue, rekornas_value, rekornas_holder, atlet:atlet_id!inner(nama_lengkap, cabor_nama_raw, tgl_lahir, kontingen_id)')
      .eq('atlet.kontingen_id', KON).not('medal', 'is', null).gte('event_date', cutoff)
      .order('event_date', { ascending: false })

    const list = (andalan ?? []).map((r: any) => ({
      nama: r.atlet?.nama_lengkap ?? r.athlete_name_raw,
      cabor: r.atlet?.cabor_nama_raw, umur: r.atlet?.tgl_lahir ? year - new Date(r.atlet.tgl_lahir).getFullYear() : null,
      medal: r.medal, nomor: r.nomor_pertandingan, kategori: r.kategori_umur, gender: r.gender,
      mark: r.mark, event: r.event_name, venue: r.event_venue, tanggal: r.event_date,
      rekornas: r.rekornas_value, rekornas_holder: r.rekornas_holder,
    }))
    const medalCount = {
      emas: list.filter(x => x.medal === 'EMAS').length,
      perak: list.filter(x => x.medal === 'PERAK').length,
      perunggu: list.filter(x => x.medal === 'PERUNGGU').length,
    }

    // proyeksi PORPROV = sum prob across baseline is_latest kontingen 4
    const { data: baselines } = await sb.from('atlet_baseline_performance')
      .select('medal_probability, atlet:atlet_id!inner(kontingen_id)').eq('is_latest', true).eq('atlet.kontingen_id', KON)
    const proj = { emas: 0, perak: 0, perunggu: 0, highEmas: 0 }
    for (const b of (baselines ?? []) as any[]) {
      const mp = b.medal_probability || {}
      proj.emas += Number(mp.emas) || 0; proj.perak += Number(mp.perak) || 0; proj.perunggu += Number(mp.perunggu) || 0
      if ((Number(mp.emas) || 0) >= 0.5) proj.highEmas++
    }

    return NextResponse.json({
      quarter: `Q${quarter} ${year}`, generated_at: now.toISOString(),
      totals: { atlet: totalAtlet, cabor: totalCabor },
      medalCount, andalan: list,
      projection: { emas: +proj.emas.toFixed(1), perak: +proj.perak.toFixed(1), perunggu: +proj.perunggu.toFixed(1), highEmas: proj.highEmas },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
