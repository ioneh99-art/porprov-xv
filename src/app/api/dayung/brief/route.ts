// src/app/api/dayung/brief/route.ts
// Strategic Brief Cabor Dayung via Anthropic Claude (pola existing ai-brief).

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const CABOR = 147

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY tidak terdeteksi.' }, { status: 500 })

    const body = await req.json().catch(() => ({}))
    const kontingenId = body?.kontingenId ?? 4

    // ── Kumpulkan data ──
    const { data: atlet } = await sb.from('atlet')
      .select('id,nama_lengkap,gender,tgl_lahir').eq('cabor_id', CABOR).eq('kontingen_id', kontingenId)
    const ids = (atlet ?? []).map(a => a.id)

    const fitMap: Record<number, number> = {}
    for (let i = 0; i < ids.length; i += 200) {
      const { data: tf } = await sb.from('atlet_tes_fisik')
        .select('atlet_id,kesimpulan_persen,tahap,status_tes').in('atlet_id', ids.slice(i, i + 200)).eq('status_tes', 'Hadir')
      for (const t of tf ?? []) if (t.kesimpulan_persen != null) fitMap[t.atlet_id] = Math.max(fitMap[t.atlet_id] ?? 0, t.kesimpulan_persen)
    }

    const { data: nomor } = await sb.from('nomor_pertandingan')
      .select('id,disiplin:disiplin_id(nama)').eq('cabor_id', CABOR)

    const total = atlet?.length ?? 0
    const putra = atlet?.filter(a => a.gender === 'L').length ?? 0
    const putri = atlet?.filter(a => a.gender === 'P').length ?? 0
    const tested = Object.keys(fitMap).length
    const fitVals = Object.values(fitMap)
    const avgFit = fitVals.length ? Math.round(fitVals.reduce((a, b) => a + b, 0) / fitVals.length) : 0
    const dist = { elite: 0, bagus: 0, cukup: 0, kurang: 0 }
    for (const v of fitVals) { if (v >= 85) dist.elite++; else if (v >= 70) dist.bagus++; else if (v >= 55) dist.cukup++; else dist.kurang++ }
    const top = (atlet ?? []).map(a => ({ nama: a.nama_lengkap, gender: a.gender, fit: fitMap[a.id] ?? null }))
      .filter(a => a.fit != null).sort((a, b) => (b.fit! - a.fit!)).slice(0, 8)
    const disiplinCount: Record<string, number> = {}
    for (const n of (nomor ?? []) as any[]) { const d = n.disiplin?.nama ?? 'Lainnya'; disiplinCount[d] = (disiplinCount[d] || 0) + 1 }

    const prompt = `Kamu analis Sport Intelligence untuk PORPROV XV Cabor Dayung Kabupaten Bandung. Tulis brief strategis profesional dalam Bahasa Indonesia.

DATA CABOR DAYUNG:
- Total atlet: ${total} (${putra} putra, ${putri} putri)
- Sudah tes fisik: ${tested}/${total} (${total ? Math.round(tested / total * 100) : 0}%)
- Rata-rata kesiapan fisik (yang sudah tes): ${avgFit}%
- Distribusi fisik: ELITE(≥85%): ${dist.elite}, BAGUS(70-84): ${dist.bagus}, CUKUP(55-69): ${dist.cukup}, KURANG(<55): ${dist.kurang}
- Top performer (fisik): ${top.map(t => `${t.nama} (${t.gender === 'L' ? 'Pa' : 'Pi'}, ${t.fit}%)`).join('; ') || '-'}
- Nomor pertandingan per disiplin: ${Object.entries(disiplinCount).map(([d, c]) => `${d}: ${c}`).join(', ')}
- Catatan: lomba PORPROV belum mulai (Nov 2026), lineup & hasil belum ada — ini fase persiapan.

INSTRUKSI:
Tulis brief strategis 350-500 kata dengan struktur Markdown (gunakan ## untuk section):
## Ringkasan Eksekutif
## Kekuatan
## Kelemahan / Gap
## Rekomendasi (spesifik & actionable)
Sebutkan nama atlet & disiplin spesifik. Hindari kalimat generik. Fokus: maksimalkan ${total} atlet menuju target medali PORPROV XV.`

    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', max_tokens: 1500, temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    })
    const brief = msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()

    return NextResponse.json({
      success: true, brief, generated_at: new Date().toISOString(),
      stats: { total, putra, putri, tested, avgFit, dist },
    })
  } catch (e: any) {
    console.error('Dayung brief error:', e)
    return NextResponse.json({ success: false, error: e.message || 'Internal error' }, { status: 500 })
  }
}
