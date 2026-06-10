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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ageMin, ageMax, gender, caborFilter, prioritize } = body
    const ctx = await getOperatorContext()

    let query = getSb()
      .from('atlet')
      .select('id, nama, cabor, kontingen, jenis_kelamin, usia, tanggal_lahir')

    if (caborFilter === 'mine') {
      query = query.eq('cabor', ctx.cabor)
    }
    if (gender && gender !== 'all') {
      query = query.eq('jenis_kelamin', gender)
    }

    const { data: atlet, error } = await query.limit(500)
    if (error) throw error

    // Pull medali for scoring
    const atletIds = (atlet ?? []).map(a => a.id)
    const { data: medali } = await getSb()
      .from('kejuaraan_atlet')
      .select('atlet_id, medali, tanggal')
      .in('atlet_id', atletIds)

    // Index medali by atlet
    const medaliMap: Record<string, { emas: number; perak: number; perunggu: number; total: number; recent: number }> = {}
    const now = Date.now()
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000
    for (const row of medali ?? []) {
      const id = row.atlet_id
      if (!medaliMap[id]) medaliMap[id] = { emas: 0, perak: 0, perunggu: 0, total: 0, recent: 0 }
      const m = String(row.medali ?? '').toLowerCase()
      const isRecent = new Date(row.tanggal ?? 0).getTime() > oneYearAgo
      if (m.includes('emas')) medaliMap[id].emas++
      else if (m.includes('perak')) medaliMap[id].perak++
      else if (m.includes('perunggu')) medaliMap[id].perunggu++
      medaliMap[id].total++
      if (isRecent) medaliMap[id].recent++
    }

    // Compute talent score per atlet
    const scored = (atlet ?? [])
      .map(a => {
        const usia = a.usia ?? computeUsia(a.tanggal_lahir)
        if (usia !== undefined && (usia < ageMin || usia > ageMax)) return null

        const m = medaliMap[a.id] ?? { emas: 0, perak: 0, perunggu: 0, total: 0, recent: 0 }
        const flags: string[] = []
        const highlights: string[] = []

        let score = 50  // base

        if (prioritize === 'emerging') {
          // Reward recent medali + young age
          score += m.recent * 8
          if (usia && usia <= 20) { score += 10; flags.push('Young talent') }
          if (m.recent > m.total - m.recent && m.total > 0) {
            flags.push('Rising trajectory')
            highlights.push(`${m.recent} medali dalam 12 bulan terakhir`)
          }
        } else if (prioritize === 'consistent') {
          score += m.total * 4
          if (m.total >= 5) {
            flags.push('Track record solid')
            highlights.push(`${m.total} total medali`)
          }
          if (m.emas >= 2) flags.push('Multiple gold')
        } else if (prioritize === 'breakthrough') {
          score += m.emas * 12 + m.perak * 6
          if (m.emas >= 1 && m.total <= 3) {
            flags.push('Breakthrough potential')
            highlights.push(`${m.emas} emas dari ${m.total} kompetisi`)
          }
        }

        // Universal highlights
        if (m.emas > 0) highlights.push(`${m.emas} medali emas`)
        if (usia && usia <= 18) highlights.push(`Usia ${usia}, masih banyak ruang growth`)

        score = Math.min(100, Math.max(0, score))

        return {
          id: a.id,
          nama: a.nama,
          cabor: a.cabor,
          kontingen: a.kontingen,
          usia,
          jenisKelamin: a.jenis_kelamin,
          score,
          flags,
          highlights,
          medali: m,
        }
      })
      .filter(Boolean) as any[]

    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, 12).map((r, i) => ({ ...r, rank: i + 1 }))

    // AI summary
    let aiSummary = ''
    try {
      const namesPreview = top.slice(0, 5).map(r => `${r.rank}. ${r.nama} (${r.cabor}) — score ${r.score}`).join('\n')
      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/sport-intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Sebagai talent scout sport, beri summary singkat 3-4 kalimat tentang batch kandidat berikut. Highlight pattern umum, kandidat top, dan rekomendasi follow-up:

Mode prioritas: ${prioritize}
Age range: ${ageMin}–${ageMax}
Total kandidat ditemukan: ${scored.length}

Top 5:
${namesPreview}

Tone: scout-tactical, bahasa Indonesia. Maksimal 4 kalimat.`
          }],
          useClaudeModel: false,
        })
      })
      if (aiRes.ok) {
        const aiData = await aiRes.json()
        aiSummary = aiData.content ?? aiData.message ?? ''
      }
    } catch {
      aiSummary = `Ditemukan ${scored.length} kandidat dengan mode "${prioritize}". Top 3: ${top.slice(0, 3).map(r => r.nama).join(', ')}.`
    }

    return NextResponse.json({
      results: top.map(({ medali, ...rest }) => rest),
      aiSummary,
      totalFound: scored.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results: [], aiSummary: '' }, { status: 200 })
  }
}

function computeUsia(tglLahir?: string | null): number | undefined {
  if (!tglLahir) return undefined
  const t = new Date(tglLahir).getTime()
  if (isNaN(t)) return undefined
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24 * 365.25))
}

