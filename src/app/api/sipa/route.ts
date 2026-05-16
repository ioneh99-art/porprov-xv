// src/app/api/chatbot/route.ts
// Chatbot reaktif — jawab pertanyaan sesuai role user

import { NextRequest, NextResponse } from 'next/server'

const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[]

let idx = 0
function nextKey() {
  const k = GROQ_KEYS[idx % GROQ_KEYS.length]
  idx++
  return k
}

async function callGroq(messages: any[]): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const key = nextKey()
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: 512,
          temperature: 0.5,
        }),
      })
      if (res.status === 429) continue
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? 'Maaf, tidak ada respons.'
    } catch (e) {
      if (i === 2) throw e
    }
  }
  return 'Chatbot sedang sibuk, coba lagi nanti.'
}

// System prompt ringkas per role
function getSystemPrompt(role: string): string {
  const base = `Kamu adalah asisten digital PORPROV XV Jawa Barat — event olahraga multi-cabang terbesar di Jawa Barat.
Jawab dengan ringkas (maksimal 3-4 kalimat), ramah, dan langsung ke point.
Gunakan Bahasa Indonesia yang natural. Jika tidak tahu, jujur saja dan arahkan ke contact yang tepat.`

  const rolePrompts: Record<string, string> = {
    admin: `${base}
Role: ADMINISTRATOR SISTEM
Kamu bisa bantu tentang: manajemen user, konfigurasi sistem, data master, export laporan, troubleshooting.
Berikan jawaban teknis yang detail jika diperlukan.`,

    konida: `${base}
Role: KOORDINATOR KONIDA (Komite Olahraga Nasional Indonesia Daerah)
Kamu bisa bantu tentang: data kontingen, registrasi atlet, klasemen medali, jadwal pertandingan, koordinasi cabor.
Fokus pada data dan koordinasi antar kontingen.`,

    operator_cabor: `${base}
Role: OPERATOR CABANG OLAHRAGA
Kamu bisa bantu tentang: jadwal pertandingan cabor kamu, input hasil, data atlet peserta, venue yang digunakan.
Jawab spesifik untuk kebutuhan teknis pertandingan.`,

    penyelenggara: `${base}
Role: PANITIA PENYELENGGARA KLASTER I (BEKASI)
Kamu bisa bantu tentang: status venue, jadwal operasional, incident report, akomodasi tamu, koordinasi petugas.
Fokus pada operasional lapangan dan penanganan masalah cepat.`,

    atlet: `${base}
Role: ATLET / PESERTA PORPROV XV
Kamu bisa bantu tentang: jadwal tanding kamu, lokasi venue, peraturan cabor, informasi akomodasi, kontak panitia.
Berikan info yang praktis dan mudah dipahami.`,

    publik: `${base}
Role: PENGUNJUNG / PUBLIK
Kamu bisa bantu tentang: jadwal pertandingan, lokasi venue, cara nonton, info tiket, update medali.
Jawab seperti panduan wisatawan yang ramah.`,
  }

  return rolePrompts[role] ?? rolePrompts['publik']
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const question: string = body.question ?? body.message ?? ''
    const role: string = body.role ?? 'publik'
    const history: { role: 'user' | 'assistant'; content: string }[] = body.history ?? []

    if (!question.trim()) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
    }

    const systemPrompt = getSystemPrompt(role)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: question },
    ]

    const answer = await callGroq(messages)
    return NextResponse.json({ answer, role })
  } catch (e) {
    console.error('[Chatbot Error]', e)
    return NextResponse.json({ error: 'Chatbot tidak tersedia saat ini.' }, { status: 500 })
  }
}