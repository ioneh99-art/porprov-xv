import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const input = await req.json()

  const prompt = `Kamu adalah analis intelijen olahraga senior untuk kontingen Kab. Bandung menjelang PORPROV XV Jawa Barat 2026.

Data performa kontingen saat ini:
${JSON.stringify(input, null, 2)}

Berikan strategic brief dalam format JSON valid, PERSIS struktur ini (jangan tambah field lain):
{
  "skor_kesiapan": <angka 0-100 berdasarkan rata gap% dan jumlah target emas>,
  "ringkasan": "<2-3 kalimat executive summary situasi kontingen>",
  "kekuatan_utama": "<1 kalimat keunggulan terbesar yang harus dipertahankan>",
  "prioritas": [
    {
      "no": 1,
      "judul": "<judul singkat 3-5 kata>",
      "detail": "<penjelasan konkret 1-2 kalimat berdasarkan data>",
      "dampak": "tinggi",
      "deadline": "<contoh: Sebelum Maret 2026>"
    }
  ],
  "peluang_emas": [
    {
      "cabor": "<nama cabor>",
      "potensi": "<nomor event atau nama atlet jika ada>",
      "gap_status": "<misal: gap rata 1.8%, sangat kompetitif>",
      "rekomendasi": "<tindakan spesifik 1 kalimat>"
    }
  ],
  "area_risiko": [
    {
      "cabor": "<nama cabor>",
      "masalah": "<deskripsi masalah konkret>",
      "intervensi": "<solusi konkret 1 kalimat>"
    }
  ],
  "pesan_pelatih": "<1 kalimat motivasi strategis untuk para pelatih>"
}

Buat tepat 3 prioritas (urutkan dari dampak tertinggi), 2-3 peluang emas, 1-2 area risiko.
Gunakan angka dari data yang diberikan. Tulis dalam Bahasa Indonesia profesional.
PENTING: Output harus JSON valid murni — jangan ada newline di dalam nilai string, jangan ada karakter khusus yang tidak di-escape, jangan tambahkan teks apapun di luar JSON.`

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1800,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON: handle markdown code fences first, then bare object
    let jsonStr: string | null = null
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    } else {
      // Find outermost { ... } — use index tracking to handle nested objects
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

    if (!jsonStr) {
      return NextResponse.json({ error: 'AI tidak mengembalikan JSON yang valid' }, { status: 500 })
    }

    try {
      return NextResponse.json(JSON.parse(jsonStr))
    } catch {
      // Last resort: sanitize common issues (unescaped newlines inside strings)
      const sanitized = jsonStr.replace(/(?<=":\ *"[^"]*)\n(?=[^"]*")/g, ' ')
      try {
        return NextResponse.json(JSON.parse(sanitized))
      } catch (e2) {
        return NextResponse.json({
          error: `JSON parse gagal: ${e2 instanceof Error ? e2.message : 'unknown'}`,
        }, { status: 500 })
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
