// src/lib/sport-plugins/dayung/brief-generator.ts
// Generator Strategic Brief Cabor Dayung (Anthropic) + cache. Dipakai API & cron.

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const CABOR = 147

function sbAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export interface DayungBrief {
  brief: string
  stats: any
  model_used: string
  generated_at: string
}

export async function gatherDayungData(kontingenId = 4) {
  const sb = sbAdmin()
  const { data: atlet } = await sb.from('atlet').select('id,nama_lengkap,gender').eq('cabor_id', CABOR).eq('kontingen_id', kontingenId)
  const ids = (atlet ?? []).map(a => a.id)
  const fit: Record<number, number> = {}
  for (let i = 0; i < ids.length; i += 200) {
    const { data: tf } = await sb.from('atlet_tes_fisik').select('atlet_id,kesimpulan_persen,status_tes').in('atlet_id', ids.slice(i, i + 200)).eq('status_tes', 'Hadir')
    for (const t of tf ?? []) if (t.kesimpulan_persen != null) fit[t.atlet_id] = Math.max(fit[t.atlet_id] ?? 0, t.kesimpulan_persen)
  }
  const { data: nomor } = await sb.from('nomor_pertandingan').select('disiplin:disiplin_id(nama)').eq('cabor_id', CABOR)
  const total = atlet?.length ?? 0
  const putra = atlet?.filter(a => a.gender === 'L').length ?? 0
  const putri = atlet?.filter(a => a.gender === 'P').length ?? 0
  const fitVals = Object.values(fit)
  const avgFit = fitVals.length ? Math.round(fitVals.reduce((a, b) => a + b, 0) / fitVals.length) : 0
  const dist = { elite: 0, bagus: 0, cukup: 0, kurang: 0 }
  for (const v of fitVals) { if (v >= 85) dist.elite++; else if (v >= 70) dist.bagus++; else if (v >= 55) dist.cukup++; else dist.kurang++ }
  const top = (atlet ?? []).map(a => ({ nama: a.nama_lengkap, gender: a.gender, fit: fit[a.id] ?? null }))
    .filter(a => a.fit != null).sort((a, b) => (b.fit! - a.fit!)).slice(0, 8)
  const disiplinCount: Record<string, number> = {}
  for (const n of (nomor ?? []) as any[]) { const d = n.disiplin?.nama ?? 'Lainnya'; disiplinCount[d] = (disiplinCount[d] || 0) + 1 }
  return { total, putra, putri, tested: fitVals.length, avgFit, dist, top, disiplinCount }
}

export async function generateDayungBrief(kontingenId = 4): Promise<DayungBrief> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY tidak terdeteksi.')
  const d = await gatherDayungData(kontingenId)

  const prompt = `Kamu analis Sport Intelligence untuk PORPROV XV Cabor Dayung Kabupaten Bandung. Tulis brief strategis profesional dalam Bahasa Indonesia.

DATA CABOR DAYUNG:
- Total atlet: ${d.total} (${d.putra} putra, ${d.putri} putri)
- Sudah tes fisik: ${d.tested}/${d.total} (${d.total ? Math.round(d.tested / d.total * 100) : 0}%)
- Rata-rata kesiapan fisik: ${d.avgFit}%
- Distribusi: ELITE(≥85): ${d.dist.elite}, BAGUS(70-84): ${d.dist.bagus}, CUKUP(55-69): ${d.dist.cukup}, KURANG(<55): ${d.dist.kurang}
- Top performer fisik: ${d.top.map(t => `${t.nama} (${t.gender === 'L' ? 'Pa' : 'Pi'}, ${t.fit}%)`).join('; ') || '-'}
- Nomor per disiplin: ${Object.entries(d.disiplinCount).map(([k, v]) => `${k}: ${v}`).join(', ')}
- Catatan: lomba belum mulai (Nov 2026) — fase persiapan.

INSTRUKSI:
Brief strategis 350-500 kata, Markdown (## untuk section):
## Ringkasan Eksekutif
## Kekuatan
## Kelemahan / Gap
## Rekomendasi (spesifik & actionable)
Sebutkan nama atlet & disiplin spesifik. Hindari generik. Fokus maksimalkan ${d.total} atlet menuju target medali.`

  const anthropic = new Anthropic({ apiKey })
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929', max_tokens: 1500, temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  })
  const brief = msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
  return { brief, stats: d, model_used: 'claude-sonnet-4-5', generated_at: new Date().toISOString() }
}

export async function saveBriefCache(kontingenId: number, result: DayungBrief) {
  const sb = sbAdmin()
  await sb.from('dayung_brief_cache').upsert({
    cache_key: `strategic_${kontingenId}`, kontingen_id: kontingenId,
    content_markdown: result.brief, stats: result.stats, model_used: result.model_used,
    generated_at: result.generated_at, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
  }, { onConflict: 'cache_key' })
}

export async function getBriefCache(kontingenId: number) {
  const sb = sbAdmin()
  const { data } = await sb.from('dayung_brief_cache').select('*').eq('cache_key', `strategic_${kontingenId}`).maybeSingle()
  return data
}
