import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const input = await req.json()

  const prompt = `Kamu adalah analis intelijen olahraga senior untuk kontingen Kab. Bandung menjelang PORPROV XV Jawa Barat 2026.

Data atlet berikut:
${JSON.stringify(input, null, 2)}

Berikan daftar action items KRITIS untuk atlet ini dalam format JSON valid, PERSIS struktur ini:
{
  "action_items": [
    {
      "priority": "CRITICAL",
      "judul": "<kalimat singkat tindakan yang harus dilakukan>",
      "cabor_context": "<konteks cabor/event spesifik>",
      "owner": "<siapa yang harus bertindak, contoh: Coach + Manager>"
    }
  ]
}

Aturan:
- priority bisa: CRITICAL, HIGH, MEDIUM
- Maksimal 4 action items (pilih yang paling impactful untuk PORPROV XV)
- CRITICAL = harus dilakukan minggu ini, HIGH = 2 minggu, MEDIUM = 1 bulan
- Fokus pada: konfirmasi event, validasi pesaing, training gap, data yang perlu diisi
- Gunakan data gap%, target medali, dan rekor untuk mengidentifikasi tindakan nyata
- Tulis dalam Bahasa Indonesia profesional dan singkat
- PENTING: Output harus JSON valid murni, tidak ada teks di luar JSON`

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 800,
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
      return NextResponse.json({ error: 'JSON parse gagal' }, { status: 500 })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
