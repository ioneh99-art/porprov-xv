// src/app/api/dayung/brief/route.ts
// Strategic Brief AI Cabor Dayung (Anthropic) — embedded di halaman Performance.

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const CABOR = 147

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY tidak terdeteksi.' }, { status: 500 })
    const kontingenId = (await req.json().catch(() => ({})))?.kontingenId ?? 4

    // Roster + fitness
    const { data: atlet } = await sb.from('atlet')
      .select('id,nama_lengkap,gender,tes_fisik_persen,tes_fisik_rating').eq('cabor_id', CABOR).eq('kontingen_id', kontingenId)
    const total = atlet?.length ?? 0
    const putra = atlet?.filter(a => a.gender === 'L').length ?? 0
    const putri = atlet?.filter(a => a.gender === 'P').length ?? 0
    const scored = (atlet ?? []).filter(a => a.tes_fisik_persen != null)
    const avgFit = scored.length ? Math.round(scored.reduce((s, a) => s + a.tes_fisik_persen, 0) / scored.length) : 0
    const dist = { elite: 0, bagus: 0, cukup: 0, kurang: 0 }
    for (const a of scored) { const v = a.tes_fisik_persen; if (v >= 85) dist.elite++; else if (v >= 70) dist.bagus++; else if (v >= 55) dist.cukup++; else dist.kurang++ }
    const top = scored.slice().sort((a, b) => b.tes_fisik_persen - a.tes_fisik_persen).slice(0, 6)

    // Komponen biomotorik terlemah (via view per kontingen, filter cabor dayung)
    const { data: komp } = await sb.from('v_tes_fisik_komponen_lemah').select('komponen,rata_capaian,jumlah_data,cabor_nama')
      .eq('kontingen_id', kontingenId).ilike('cabor_nama', '%dayung%')
    const kompAgg: Record<string, { sum: number; n: number }> = {}
    for (const k of komp ?? []) { if (!kompAgg[k.komponen]) kompAgg[k.komponen] = { sum: 0, n: 0 }; kompAgg[k.komponen].sum += (k.rata_capaian || 0) * (k.jumlah_data || 1); kompAgg[k.komponen].n += (k.jumlah_data || 1) }
    const komponen = Object.entries(kompAgg).map(([k, v]) => ({ komponen: k, rata: Math.round(v.sum / v.n) })).sort((a, b) => a.rata - b.rata).slice(0, 6)

    // Disiplin nomor
    const { data: nomor } = await sb.from('nomor_pertandingan').select('disiplin:disiplin_id(nama)').eq('cabor_id', CABOR)
    const dc: Record<string, number> = {}
    for (const n of (nomor ?? []) as any[]) { const d = n.disiplin?.nama ?? 'Lainnya'; dc[d] = (dc[d] || 0) + 1 }

    const prompt = `Kamu analis Sport Intelligence untuk PORPROV XV Cabor Dayung Kabupaten Bandung. Tulis brief strategis profesional Bahasa Indonesia, FOKUS DAYUNG SAJA.

DATA DAYUNG:
- Atlet: ${total} (${putra} putra, ${putri} putri); sudah tes fisik: ${scored.length}; avg kesiapan fisik: ${avgFit}%
- Distribusi fisik: ELITE ${dist.elite}, BAGUS ${dist.bagus}, CUKUP ${dist.cukup}, KURANG ${dist.kurang}
- Top performer: ${top.map(t => `${t.nama_lengkap} (${t.gender === 'L' ? 'Pa' : 'Pi'}, ${t.tes_fisik_persen}%)`).join('; ') || '-'}
- Komponen biomotorik terlemah (perlu latihan): ${komponen.map(k => `${k.komponen} ${k.rata}%`).join(', ') || '-'}
- Disiplin & jumlah nomor: ${Object.entries(dc).map(([k, v]) => `${k}: ${v}`).join(', ')}
- Catatan: lomba belum mulai (Nov 2026), belum ada hasil pertandingan — fase persiapan.

INSTRUKSI:
Brief strategis 350-500 kata, Markdown (## untuk section):
## Ringkasan Eksekutif
## Kekuatan
## Prioritas Latihan (berdasar komponen biomotorik terlemah)
## Rekomendasi Strategis
Sebut nama atlet & disiplin Dayung spesifik. Hindari generik. JANGAN bahas cabor lain.`

    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({ model: 'claude-sonnet-4-5-20250929', max_tokens: 1400, temperature: 0.7, messages: [{ role: 'user', content: prompt }] })
    const brief = msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()

    return NextResponse.json({ success: true, brief, generated_at: new Date().toISOString() })
  } catch (e: any) {
    console.error('Dayung brief error:', e)
    return NextResponse.json({ success: false, error: e.message || 'Internal error' }, { status: 500 })
  }
}
