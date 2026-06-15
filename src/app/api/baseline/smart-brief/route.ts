// src/app/api/baseline/smart-brief/route.ts
// Generate naratif analisa atlet (Baseline Performance) via Anthropic Claude.
// Mengikuti pola env existing: ANTHROPIC_API_KEY + SUPABASE_SERVICE_KEY.

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const { atletId } = await req.json()
    if (!atletId) {
      return NextResponse.json({ success: false, error: 'atletId wajib diisi' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY tidak terdeteksi di environment.' }, { status: 500 })
    }

    const [{ data: atlet }, { data: performances }] = await Promise.all([
      sb.from('atlet').select('*, cabor:cabor_id(nama)').eq('id', atletId).single(),
      sb.from('atlet_baseline_performance').select('*').eq('atlet_id', atletId).order('event_name'),
    ])

    if (!atlet || !performances?.length) {
      return NextResponse.json({ success: false, error: 'Data atlet / baseline tidak ditemukan' }, { status: 404 })
    }

    const prompt = `Kamu adalah analis performa atlet untuk KONI Kab. Bandung yang profesional dan to-the-point.

ATLET: ${atlet.nama_lengkap}
CABOR: ${atlet.cabor?.nama ?? '-'}
GENDER: ${atlet.gender === 'L' ? 'Putra' : 'Putri'}

PERFORMANCE HISTORY (baseline PORPROV 2022):
${performances.map((p: any) => `- Event: ${p.event_name}
  Waktu terbaik: ${p.waktu_terbaik || 'NT'}
  Rekor PORPROV: ${p.rekor_porprov || 'N/A'}
  Gap dari rekor: ${p.gap_percentage != null ? p.gap_percentage + '%' : 'N/A'}
  Target medali: ${p.target_medali || 'Belum ditentukan'}
  Pesaing: ${p.pesaing || 'Belum teridentifikasi'}`).join('\n')}

Berikan analisa dalam format naratif paragraf (BUKAN bullet points), maksimal 200 kata, Bahasa Indonesia profesional, yang mencakup:
1. Kekuatan utama atlet
2. Gap utama yang perlu diperbaiki
3. Target realistis untuk PORPROV 2026
4. Rekomendasi fokus latihan (spesifik & actionable)

JANGAN gunakan markdown atau bullet points. Tulis sebagai paragraf naratif profesional.`

    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 600,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    })

    const brief = msg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim()

    return NextResponse.json({ success: true, brief, generated_at: new Date().toISOString() })
  } catch (error: any) {
    console.error('Baseline smart-brief error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}
