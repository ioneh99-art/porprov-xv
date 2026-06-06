// src/app/api/ai-brief/route.ts
// Dedicated endpoint untuk Premium Report AI Brief
// Streaming Claude Sonnet 4.5 dengan typing effect

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

interface BriefRequest {
  kontingen: string
  totalAtlet: number
  putra: number
  putri: number
  cabor: number
  sudahTes: number
  avgSkor: number
  skorTinggi: number
  skorRendah: number
  totalEmas: number
  totalPerak: number
  totalPerunggu: number
  atletPrestasi: number
  targetEmas: number
  targetPerak: number
  targetPerunggu: number
  hasRek: number
  compliancePct: number
  caborRisk: { nama: string; aktif: number; kuota_total: number; status: string }[]
  topAtlet: { nama: string; cabor: string; skor: number }[]
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY tidak terdeteksi di environment variables. Tambahkan di .env.local untuk development atau Vercel project settings.' },
      { status: 500 }
    )
  }

  try {
    const data: BriefRequest = await req.json()
    const prompt = buildPrompt(data)
    
    const anthropic = new Anthropic({ apiKey })

    // ── STREAMING via ReadableStream ─────────────────────
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            messages: [
              { role: 'user', content: prompt },
            ],
          })

          for await (const event of messageStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }

          const finalMsg = await messageStream.finalMessage()
          
          // Append usage info at the end (parsable by client)
          const usageInfo = `\n\n<!--USAGE:${JSON.stringify({
            input_tokens: finalMsg.usage.input_tokens,
            output_tokens: finalMsg.usage.output_tokens,
            model: finalMsg.model,
            stop_reason: finalMsg.stop_reason,
          })}-->`
          controller.enqueue(encoder.encode(usageInfo))
          
          controller.close()
        } catch (err: any) {
          const errMsg = `\n\n❌ ERROR: ${err.message || 'Unknown streaming error'}`
          controller.enqueue(encoder.encode(errMsg))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error: any) {
    console.error('[AI Brief]', error)
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    )
  }
}

// ════════════════════════════════════════════════════════
function buildPrompt(d: BriefRequest): string {
  const targetTotal = d.targetEmas + d.targetPerak + d.targetPerunggu
  const compliancePctRek = d.totalAtlet > 0 ? Math.round(d.hasRek/d.totalAtlet*100) : 0

  return `Anda adalah konsultan strategic olahraga senior dengan pengalaman 20 tahun di Indonesia, setara dengan partner di firma konsultasi premium (McKinsey/BCG). Tugas Anda menganalisa data kontingen ${d.kontingen} untuk PEKAN OLAHRAGA PROVINSI JAWA BARAT XV TAHUN 2026 dan menghasilkan Strategic Brief Executive level yang akan dipresentasikan ke Kepala Daerah dan Pengurus KONI senior.

═══════════════════════════════════════════
📊 DATA KONTINGEN ${d.kontingen.toUpperCase()}
═══════════════════════════════════════════

UMUM:
- Total atlet verified: ${d.totalAtlet}
- Atlet putra: ${d.putra} | putri: ${d.putri}
- Jumlah cabor aktif: ${d.cabor}

🔬 SPORT SCIENCE (Tes Biomotorik FPOK UPI):
- Atlet sudah tes: ${d.sudahTes} dari ${d.totalAtlet} (${Math.round(d.sudahTes/d.totalAtlet*100)}%)
- Average skor biomotorik: ${d.avgSkor}%
- Atlet elite (skor ≥80%): ${d.skorTinggi}
- Atlet risk (skor <50%): ${d.skorRendah}

🏆 TRACK RECORD HISTORIS:
- Total medali historic: ${d.totalEmas}🥇 + ${d.totalPerak}🥈 + ${d.totalPerunggu}🥉 = ${d.totalEmas+d.totalPerak+d.totalPerunggu} medali
- Atlet dengan prestasi: ${d.atletPrestasi} dari ${d.totalAtlet}

🎯 TARGET BUPATI PORPROV XV:
- 🥇 Emas: ${d.targetEmas}
- 🥈 Perak: ${d.targetPerak}
- 🥉 Perunggu: ${d.targetPerunggu}
- TOTAL: ${targetTotal} medali

📑 OPERATIONAL:
- Compliance dokumen: ${d.compliancePct}% verified
- Atlet dengan rekening bank: ${d.hasRek}/${d.totalAtlet} (${compliancePctRek}%)

⚠️ CABOR DALAM PERHATIAN:
${d.caborRisk.length > 0 
  ? d.caborRisk.map(c => `- ${c.nama}: ${c.aktif}/${c.kuota_total} atlet (Status: ${c.status})`).join('\n')
  : '- Tidak ada cabor over kuota saat ini'}

🌟 TOP 5 ATLET ELITE (berdasarkan skor biomotorik):
${d.topAtlet.map((a,i) => `${i+1}. ${a.nama} — ${a.cabor} (Skor ${a.skor}%)`).join('\n')}

═══════════════════════════════════════════
📋 INSTRUKSI OUTPUT
═══════════════════════════════════════════

Tulis Strategic Brief dalam format markdown dengan struktur PERSIS sebagai berikut:

# 📋 Strategic Brief — Kontingen ${d.kontingen}

## 🎯 Ringkasan Eksekutif

[Tulis 2-3 kalimat padat yang merangkum: status kontingen saat ini, kekuatan utama, dan kesimpulan strategic. Tonal seperti konsultan senior.]

## 💪 Analisis SWOT

### ✅ Strengths
- [Kekuatan utama dengan data konkret]
- [...]
- [...]

### ⚠️ Weaknesses
- [Kelemahan dengan data spesifik]
- [...]
- [...]

### 🚀 Opportunities
- [Peluang yang bisa dieksploit]
- [...]
- [...]

### 🛡 Threats
- [Ancaman dari kompetitor/external]
- [...]
- [...]

## 📊 Asesmen Pencapaian Target

[Analisa probability mencapai target Bupati berdasarkan data. Sebutkan kategori mana yang ON-TRACK, mana yang GAP, dengan justifikasi numerik.]

## 🎯 Rekomendasi Strategic

**1. [Judul Rekomendasi Prioritas Tinggi]**
[Penjelasan singkat + action steps konkret]

**2. [Judul Rekomendasi]**
[Penjelasan + action]

**3. [Judul Rekomendasi]**
[Penjelasan + action]

**4. [Judul Rekomendasi]**
[Penjelasan + action]

**5. [Judul Rekomendasi]**
[Penjelasan + action]

## ⚡ Risk Mitigation

[Highlight 3 risk paling kritis dan strategi mitigasinya. Format bullet point.]

## 🚀 Next Steps (3 Langkah Konkret)

1. **[Action Step]** — [Timeline & responsible party]
2. **[Action Step]** — [Timeline & responsible party]
3. **[Action Step]** — [Timeline & responsible party]

---

*Brief ini disusun berdasarkan data real-time dari ${d.totalAtlet} atlet, ${d.sudahTes} tes biomotorik, dan ${d.atletPrestasi} atlet berprestasi historis.*

═══════════════════════════════════════════

GAYA BAHASA:
- Indonesia formal dan profesional level eksekutif
- Tone seperti partner konsultan tier-1 (McKinsey/BCG)
- Bullet points TAJAM, hindari verbose
- Sertakan angka konkret dari data di atas
- Hindari jargon teknis yang tidak perlu
- Maksimal ±1500 kata
- Closing yang inspirational tapi grounded di data

JANGAN:
- Mengulang data tanpa insight
- Membuat klaim tanpa dasar data
- Memberi rekomendasi generik
- Output di luar struktur markdown di atas`
}
