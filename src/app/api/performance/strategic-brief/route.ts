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
Gunakan angka dari data yang diberikan. Tulis dalam Bahasa Indonesia profesional.`

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1800,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Format respons tidak valid dari AI' }, { status: 500 })
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
