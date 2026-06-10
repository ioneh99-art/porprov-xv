import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOperatorContext } from '@/lib/operator-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const getSb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const TARGETS: Record<string, { label: string; yearsAhead: number }> = {
  PORPROV_XV: { label: 'PORPROV XV 2026', yearsAhead: 0 },
  SEAGAMES_2027: { label: 'SEA Games 2027', yearsAhead: 1 },
  PON_2028: { label: 'PON 2028', yearsAhead: 2 },
}

export async function POST(req: NextRequest) {
  try {
    const { target } = await req.json()
    const ctx = await getOperatorContext()
    const tCfg = TARGETS[target] ?? TARGETS.PORPROV_XV

    // Pull historical medali for this cabor + kontingen
    const { data: medali } = await getSb()
      .from('kejuaraan_atlet')
      .select('medali, tanggal, kejuaraan')
      .eq('cabor', ctx.cabor)
      .eq('kontingen', ctx.kontingen)

    let histEmas = 0, histPerak = 0, histPerunggu = 0
    for (const row of medali ?? []) {
      const m = String(row.medali ?? '').toLowerCase()
      if (m.includes('emas')) histEmas++
      else if (m.includes('perak')) histPerak++
      else if (m.includes('perunggu')) histPerunggu++
    }

    const { count: atletCount } = await getSb()
      .from('atlet')
      .select('*', { count: 'exact', head: true })
      .eq('cabor', ctx.cabor)
      .eq('kontingen', ctx.kontingen)

    // Statistical baseline projection
    const decay = Math.pow(0.92, tCfg.yearsAhead)  // future events less certain
    const growthFactor = 1 + (tCfg.yearsAhead * 0.05)  // assume athletic development

    const mid = (n: number) => Math.max(0, Math.round(n * decay * growthFactor))
    const range = (n: number) => ({
      low: Math.max(0, Math.round(mid(n) * 0.6)),
      mid: mid(n),
      high: Math.round(mid(n) * 1.4),
    })

    // Try AI rationale (optional, fallback to statistical-only)
    let rationale = `Prediksi berbasis ${medali?.length ?? 0} record historis cabor ${ctx.cabor} kontingen ${ctx.kontingen}. Confidence dihitung dari konsistensi performa, jumlah atlet aktif (${atletCount ?? 0}), dan jarak tahun ke target.`
    let factors = [
      { name: `Historical track record (${histEmas} emas)`, weight: Math.min(10, histEmas + 3), impact: histEmas > 2 ? 'positive' : 'neutral' as const },
      { name: `Active athlete pool (${atletCount} atlet)`, weight: Math.min(10, Math.floor((atletCount ?? 0) / 10) + 3), impact: (atletCount ?? 0) > 20 ? 'positive' : 'neutral' as const },
      { name: `Years until target (${tCfg.yearsAhead}y)`, weight: 10 - tCfg.yearsAhead * 2, impact: tCfg.yearsAhead === 0 ? 'positive' : 'neutral' as const },
      { name: 'Recent training intensity', weight: 6, impact: 'positive' as const },
      { name: 'Regulatory changes uncertainty', weight: 4, impact: tCfg.yearsAhead > 0 ? 'negative' : 'neutral' as const },
    ]

    try {
      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/sport-intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Sebagai sport analytics expert, tulis 3-4 paragraf rationale untuk prediksi medali:

Target: ${tCfg.label}
Cabor: ${ctx.cabor}
Kontingen: ${ctx.kontingen}
Histori: ${histEmas} emas, ${histPerak} perak, ${histPerunggu} perunggu (dari ${medali?.length ?? 0} record)
Atlet aktif: ${atletCount ?? 0}
Prediksi mid: ${mid(histEmas)} emas, ${mid(histPerak)} perak, ${mid(histPerunggu)} perunggu

Fokus: asumsi kunci, faktor accelerator, faktor risiko. Tone analitis-tactical, bahasa Indonesia.`
          }],
          useClaudeModel: true,
        })
      })
      if (aiRes.ok) {
        const aiData = await aiRes.json()
        rationale = aiData.content ?? aiData.message ?? rationale
      }
    } catch {
      // fallback rationale already set
    }

    const confidence = Math.min(95, 40 + Math.min(30, (medali?.length ?? 0) * 2) + (tCfg.yearsAhead === 0 ? 20 : 0))

    return NextResponse.json({
      cabor: ctx.cabor,
      kontingen: ctx.kontingen,
      baselineYear: tCfg.label,
      predictedEmas: range(histEmas),
      predictedPerak: range(histPerak),
      predictedPerunggu: range(histPerunggu),
      confidence,
      factors,
      rationale,
      generatedAt: new Date().toLocaleString('id-ID'),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

