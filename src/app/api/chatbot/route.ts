// src/app/api/chatbot/route.ts
// Support payload lama: { messages, role, nama, kontingen } → reply
// Support payload baru: { question, history, role }         → answer

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

function getSystemPrompt(role: string, nama?: string, kontingen?: string, cabor?: string): string {
  const base = `Kamu adalah SIPA — Asisten AI resmi PORPROV XV Jawa Barat 2026.
Jawab dengan ramah, ringkas (maksimal 3-4 kalimat), dan langsung ke point.
Gunakan Bahasa Indonesia yang natural. Boleh pakai emoji secukupnya.
Jika tidak tahu, jujur saja dan arahkan ke contact panitia.`

  const userCtx = [
    nama ? `Nama user: ${nama}` : '',
    kontingen ? `Kontingen: ${kontingen}` : '',
    cabor ? `Cabang olahraga: ${cabor}` : '',
  ].filter(Boolean).join(' | ')

  const rolePrompts: Record<string, string> = {
    admin: `${base}
Role: ADMINISTRATOR SISTEM PORPROV XV
${userCtx}
Bantu soal: manajemen user, konfigurasi sistem, data master, import/export data, troubleshooting, kuota kualifikasi.`,

    konida: `${base}
Role: KOORDINATOR KONIDA (Komite Olahraga Daerah)
${userCtx}
Bantu soal: input atlet baru, verifikasi data, submit ke operator, daftar nomor pertandingan, status registrasi kontingen.`,

    operator_cabor: `${base}
Role: OPERATOR CABANG OLAHRAGA
${userCtx}
Bantu soal: verifikasi atlet, input hasil pertandingan, konfirmasi lineup, validasi prestasi kejuaraan atlet.`,

    penyelenggara: `${base}
Role: PANITIA PENYELENGGARA KLASTER I BEKASI
${userCtx}
Bantu soal: status venue, jadwal operasional, incident report, akomodasi tamu VIP, koordinasi petugas lapangan.`,

    atlet: `${base}
Role: ATLET / PESERTA PORPROV XV
${userCtx}
Bantu soal: cara input prestasi kejuaraan, upload bukti, status registrasi, jadwal pertandingan, lokasi venue.`,

    publik: `${base}
Role: PENGUNJUNG / PUBLIK
Bantu soal: jadwal pertandingan, lokasi venue, info tiket, update medali, informasi umum PORPROV XV.`,
  }

  return rolePrompts[role] ?? rolePrompts['publik']
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Deteksi format payload ──
    const role: string = body.role ?? 'publik'
    const nama: string | undefined = body.nama
    const kontingen: string | undefined = body.kontingen
    const cabor: string | undefined = body.cabor

    // Format lama: { messages: [{role, content}] }
    // Format baru: { question: string, history: [{role, content}] }
    let chatMessages: { role: string; content: string }[] = []

    if (body.messages && Array.isArray(body.messages)) {
      // payload lama dari ChatbotWidget asli
      chatMessages = body.messages
    } else if (body.question) {
      // payload baru
      const history = body.history ?? []
      chatMessages = [
        ...history.slice(-4),
        { role: 'user', content: body.question },
      ]
    } else {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 })
    }

    if (!chatMessages.length) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
    }

    const systemPrompt = getSystemPrompt(role, nama, kontingen, cabor)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatMessages.slice(-8), // max 8 pesan history
    ]

    const answer = await callGroq(messages)

    // Return kedua format sekaligus biar kompatibel
    return NextResponse.json({ reply: answer, answer, role })
  } catch (e) {
    console.error('[Chatbot Error]', e)
    return NextResponse.json(
      { reply: 'Chatbot tidak tersedia saat ini. 🙏', answer: 'Chatbot tidak tersedia saat ini.' },
      { status: 500 }
    )
  }
}