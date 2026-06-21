import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const input = await req.json()

  const prompt = `Kamu adalah analis intelijen olahraga senior untuk kontingen Kab. Bandung menjelang PORPROV XV Jawa Barat 2026.

Data performa kontingen saat ini:
${JSON.stringify(input, null, 2)}

Buat Meeting Agenda untuk rapat kontingen Kab. Bandung dalam format JSON valid, PERSIS struktur ini:
{
  "total_items": <integer>,
  "judul": "Meeting Agenda — Kontingen Kab. Bandung PORPROV XV",
  "subtitle": "<1 kalimat konteks: tanggal perkiraan, tujuan rapat>",
  "items": [
    {
      "no": 1,
      "priority": "CRITICAL",
      "judul": "<kalimat singkat tindakan konkret>",
      "cabor": "<nama cabor yang relevan>",
      "owner": "<siapa yang bertanggung jawab, contoh: Manager kontingen + PRSI>",
      "deadline": "<contoh: minggu ini, 2 minggu, 1 bulan, PORPROV 2030>"
    }
  ]
}

Aturan ketat:
- priority HANYA boleh: CRITICAL, HIGH, MEDIUM, LONG_TERM
- CRITICAL: harus diselesaikan minggu ini (blockers, konfirmasi event, data krusial)
- HIGH: harus diselesaikan dalam 2 minggu (validasi data, keputusan strategis)
- MEDIUM: dalam 1 bulan (optimasi, data tambahan, persiapan)
- LONG_TERM: persiapan PORPROV 2030 atau jangka panjang
- Buat 10-14 action items total, urutkan dari priority tertinggi
- Setiap item harus KONKRET dan berdasarkan data yang ada (gap%, atlet specific, event specific)
- Gunakan nama atlet/cabor dari data bila relevan
- Tulis dalam Bahasa Indonesia profesional
- PENTING: Output harus JSON valid murni, tidak ada teks di luar JSON`

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2500,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    let jsonStr: string | null = null
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    } else {
      const start = text.indexOf('{')
      if (start !== -1) {
        let depth = 0, end = -1
        for (let i = start; i < text.length; i++) {
          if (text[i] === '{') depth++
          else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break } }
        }
        if (end !== -1) jsonStr = text.slice(start, end + 1)
      }
    }

    if (!jsonStr) return NextResponse.json({ error: 'AI tidak mengembalikan JSON' }, { status: 500 })

    try {
      return NextResponse.json(JSON.parse(jsonStr))
    } catch {
      const sanitized = jsonStr.replace(/(?<=":\ *"[^"]*)\n(?=[^"]*")/g, ' ')
      try {
        return NextResponse.json(JSON.parse(sanitized))
      } catch (e2) {
        return NextResponse.json({ error: `JSON parse gagal: ${e2 instanceof Error ? e2.message : 'unknown'}` }, { status: 500 })
      }
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
