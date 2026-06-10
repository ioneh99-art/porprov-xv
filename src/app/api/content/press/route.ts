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

// GET: list eligible events
export async function GET() {
  try {
    const ctx = await getOperatorContext()

    const { data, error } = await getSb()
      .from('kejuaraan_atlet')
      .select(`
        id, kejuaraan, cabor, medali, tanggal,
        atlet:atlet_id ( nama )
      `)
      .eq('cabor', ctx.cabor)
      .order('tanggal', { ascending: false })
      .limit(50)

    if (error) throw error

    const events = (data ?? [] as any[])
      .filter((r: any) => {
        const m = String(r.medali ?? '').toLowerCase()
        return m.includes('emas') || m.includes('perak') || m.includes('perunggu')
      })
      .map((r: any) => ({
        id: r.id,
        atletNama: (r.atlet as any)?.nama ?? '—',
        kejuaraan: r.kejuaraan ?? '—',
        cabor: r.cabor,
        medali: r.medali,
        tanggal: r.tanggal,
      }))

    return NextResponse.json({ events })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, events: [] }, { status: 200 })
  }
}

// POST: generate press release
const TONE_INSTRUCTIONS: Record<string, string> = {
  formal: 'Tone formal-pemerintahan, struktur klasik press release (dateline, lead, body, quote, boilerplate). Bahasa baku Indonesia.',
  sport_journalist: 'Tone sport journalist Indonesia (Bola.net/Detik style) — dinamis, ada angle human-interest, kuotasi narasumber, deskriptif tapi padat.',
  celebrative: 'Tone celebrative — bangga, optimistis, emosional namun tetap profesional. Cocok untuk rilis ke media partner kontingen.',
  analytical: 'Tone analitis — breakdown angka, konteks historis, implikasi strategis. Cocok untuk media yang punya audience profesional.',
}

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  short: 'Pendek: ~150-200 kata, 2-3 paragraf. Cocok untuk caption sosmed/newsletter.',
  medium: 'Sedang: ~350-450 kata, 4-5 paragraf. Standar press release media online.',
  long: 'Panjang: ~600-800 kata, lengkap dengan multiple quotes, latar belakang, dan call-to-action.',
}

export async function POST(req: NextRequest) {
  try {
    const { eventId, tone, length } = await req.json()
    const ctx = await getOperatorContext()

    // Fetch event detail
    const { data: ev, error } = await getSb()
      .from('kejuaraan_atlet')
      .select(`
        id, kejuaraan, cabor, medali, tanggal,
        atlet:atlet_id ( nama, kontingen, usia, jenis_kelamin )
      `)
      .eq('id', eventId)
      .single()
    if (error) throw error

    const atlet = (ev.atlet ?? {}) as any

    const prompt = `Tulis press release tentang prestasi atlet berikut.

DATA EVENT:
- Atlet: ${atlet?.nama ?? '—'}
- Cabor: ${ev.cabor}
- Kontingen: ${atlet?.kontingen ?? ctx.kontingen}
- Usia: ${atlet?.usia ?? '—'}
- Jenis kelamin: ${atlet?.jenis_kelamin ?? '—'}
- Kejuaraan: ${ev.kejuaraan}
- Medali diraih: ${ev.medali}
- Tanggal: ${ev.tanggal}

INSTRUKSI:
${TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.sport_journalist}
${LENGTH_INSTRUCTIONS[length] ?? LENGTH_INSTRUCTIONS.medium}

Format output:
[JUDUL UTAMA - eye-catching, max 12 kata]
[Subjudul opsional]

[Dateline] — [Body press release]

[Quote dari atlet atau pelatih jika perlu, bisa karangan natural]

[Konteks lebih luas: kontribusi ke kontingen, target ke depan]

— SELESAI —

Pakai bahasa Indonesia yang baik, mengalir, dan siap kirim ke media. Jangan tambahin disclaimer atau meta-comment. Langsung outputkan press release-nya saja.`

    // Call sport-intel with Claude
    const aiRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/sport-intel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        useClaudeModel: true,
      })
    })

    if (!aiRes.ok) throw new Error(`AI returned ${aiRes.status}`)

    const aiData = await aiRes.json()
    const content = aiData.content ?? aiData.message ?? 'Gagal generate press release.'

    return NextResponse.json({
      content,
      eventId,
      tone,
      length,
      generatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, content: `Error: ${err.message}` }, { status: 200 })
  }
}
